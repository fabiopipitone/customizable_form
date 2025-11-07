import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppMountParameters, CoreStart, NotificationsStart } from '@kbn/core/public';
import { showSaveModal } from '@kbn/saved-objects-plugin/public';
import {
  LazySavedObjectSaveModalDashboard,
  type SaveModalDashboardProps,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import {
  EuiButton,
  EuiConfirmModal,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiOverlayMask,
  EuiSpacer,
  EuiText
} from '@elastic/eui';
import type { ActionType } from '@kbn/actions-types';
import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import type { SaveResult } from '@kbn/saved-objects-plugin/public';

import {
  FormConfig,
  FormFieldConfig,
  FormConnectorConfig,
  SupportedConnectorTypeId,
} from './types';
import { DEFAULT_LAYOUT_COLUMNS, DEFAULT_STRING_SIZE } from './constants';
import {
  validateVariableName,
  type VariableNameValidationResult,
} from './validation';
import { getFieldValidationResult, type FieldValidationResult } from './preview';
import {
  ConnectorSummaryTable,
  DEFAULT_CONNECTOR_SUMMARY_STATUS,
  type ConnectorSummaryItem,
  type ConnectorSummaryStatus,
} from './connector_summary';
import PreviewCard from './preview_card';
import InfoPanel from './info_panel';
import { ConfigurationPanel } from './configuration_panel';
import { useConnectorsData, getCanonicalConnectorTypeId } from './use_connectors_data';
import { useFormConfigState } from './use_form_config_state';
import { executeFormConnectors } from '../../services/execute_connectors';
import {
  createCustomizableForm,
  updateCustomizableForm,
  resolveCustomizableForm,
  getDocumentFromResolveResponse,
  type CustomizableFormAttributesMeta,
} from '../../services/persistence';
import { CUSTOMIZABLE_FORM_EMBEDDABLE_TYPE } from '../../../common';
import { getEmbeddableStateTransfer } from '../../services/embeddable_state_transfer';

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

interface CustomizableFormBuilderProps {
  mode: 'create' | 'edit';
  savedObjectId?: string;
  notifications: NotificationsStart;
  http: CoreStart['http'];
  application: CoreStart['application'];
  history: AppMountParameters['history'];
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    try { return JSON.stringify(error); } catch { return String(error); }
  }
  return String(error);
};

const DEFAULT_TEMPLATE = `{
  "event_timestamp": "{{timestamp}}",
  "event_id": "{{id}}",
  "event_message": "This is an alert raised via Customizable Form. Here's the message: {{message}}"
}`;

const getConnectorFallbackLabel = (index: number) =>
  i18n.translate('customizableForm.builder.connectorFallbackLabel', {
    defaultMessage: 'Connector {number}',
    values: { number: index + 1 },
  });

const INITIAL_CONNECTORS: FormConnectorConfig[] = [
  {
    id: 'connector-1',
    connectorTypeId: '',
    connectorId: '',
    label: getConnectorFallbackLabel(0),
    isLabelAuto: true,
    documentTemplate: DEFAULT_TEMPLATE,
  },
];

const INITIAL_CONFIG: FormConfig = {
  title: i18n.translate('customizableForm.builder.initialTitle', {
    defaultMessage: 'New customizable form',
  }),
  description: i18n.translate('customizableForm.builder.initialDescription', {
    defaultMessage:
      'Describe form goals and connectors',
  }),
  showTitle: true,
  showDescription: true,
  layoutColumns: DEFAULT_LAYOUT_COLUMNS,
  requireConfirmationOnSubmit: false,
  connectors: INITIAL_CONNECTORS,
  fields: [
    {
      id: 'field-1',
      key: 'id',
      label: i18n.translate('customizableForm.builder.initialField.idLabel', {
        defaultMessage: 'Event ID',
      }),
      placeholder: 'e.g. e5f3-42aa',
      type: 'text',
      required: true,
      dataType: 'string',
      size: { ...DEFAULT_STRING_SIZE },
    },
    {
      id: 'field-2',
      key: 'timestamp',
      label: i18n.translate('customizableForm.builder.initialField.timestampLabel', {
        defaultMessage: 'Event timestamp',
      }),
      placeholder: 'YYYY-MM-DDTHH:mm:ssZ',
      type: 'text',
      required: true,
      dataType: 'string',
      size: { ...DEFAULT_STRING_SIZE },
    },
    {
      id: 'field-3',
      key: 'message',
      label: i18n.translate('customizableForm.builder.initialField.messageLabel', {
        defaultMessage: 'Message',
      }),
      placeholder: i18n.translate('customizableForm.builder.initialField.messagePlaceholder', {
        defaultMessage: 'Describe the anomaly that triggered this action',
      }),
      type: 'textarea',
      required: true,
      dataType: 'string',
      size: { ...DEFAULT_STRING_SIZE },
    },
  ],
};

const INITIAL_SAVED_OBJECT_ATTRIBUTES: CustomizableFormAttributesMeta = {
  title: '',
  description: '',
};

const buildInitialFieldValues = (fields: FormFieldConfig[]): Record<string, string> =>
  fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.id] = '';
    return acc;
  }, {});

const toConnectorTypeOptions = (types: Array<ActionType & { id: SupportedConnectorTypeId }>) =>
  types.map((type) => ({ value: type.id, text: type.name }));

const getTemplateVariables = (template: string): string[] => {
  const variables = new Set<string>();
  template.replace(/{{\s*([^{}\s]+)\s*}}/g, (_, variable: string) => {
    const trimmed = variable.trim();
    if (trimmed) {
      variables.add(trimmed);
    }
    return '';
  });
  return Array.from(variables);
};

type ConnectorStatus = ConnectorSummaryStatus;
const DEFAULT_CONNECTOR_STATUS: ConnectorStatus = DEFAULT_CONNECTOR_SUMMARY_STATUS;

type ConnectorSelectionStateEntry = {
  connectorsForType: Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>;
  availableConnectors: Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>;
  hasType: boolean;
  hasSelection: boolean;
};

export const CustomizableFormBuilder = ({
  mode,
  savedObjectId: initialSavedObjectId,
  notifications,
  http,
  application,
  history,
}: CustomizableFormBuilderProps) => {
  const {
    formConfig,
    replaceFormConfig,
    updateConfig,
    updateField,
    removeField,
    addField,
    handleFieldReorder,
    addConnector: addConnectorInternal,
    removeConnector: removeConnectorInternal,
    handleConnectorTypeChange: handleConnectorTypeChangeInternal,
    handleConnectorChange: handleConnectorChangeInternal,
    handleConnectorLabelChange,
    handleConnectorTemplateChange,
    syncConnectorSelections,
  } = useFormConfigState({ initialConfig: INITIAL_CONFIG });

  const [savedObjectAttributes, setSavedObjectAttributes] = useState<CustomizableFormAttributesMeta>(
    () => ({ ...INITIAL_SAVED_OBJECT_ATTRIBUTES })
  );

  const [savedObjectId, setSavedObjectId] = useState<string | null>(
    mode === 'edit' && initialSavedObjectId ? initialSavedObjectId : null
  );
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(mode === 'edit');
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExecutingConnectors, setIsExecutingConnectors] = useState<boolean>(false);
  const [isSubmitConfirmationVisible, setIsSubmitConfirmationVisible] = useState<boolean>(false);

  const { toasts } = notifications;
  const {
    connectorTypes,
    connectors,
    isLoadingConnectorTypes,
    isLoadingConnectors,
    connectorTypesError,
    connectorsError,
  } = useConnectorsData({ http, toasts });
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    buildInitialFieldValues(INITIAL_CONFIG.fields)
  );

  const addConnector = useCallback(() => {
    addConnectorInternal({
      connectorTypes,
      connectors,
      defaultTemplate: DEFAULT_TEMPLATE,
    });
  }, [addConnectorInternal, connectorTypes, connectors]);

  const handleConnectorTypeChange = useCallback(
    (connectorConfigId: string, nextTypeId: string) => {
      const canonicalNextTypeId = getCanonicalConnectorTypeId(nextTypeId) ?? '';
      handleConnectorTypeChangeInternal(connectorConfigId, canonicalNextTypeId, {
        connectorTypes,
        connectors,
      });
    },
    [connectorTypes, connectors, handleConnectorTypeChangeInternal]
  );

  const handleConnectorChange = useCallback(
    (connectorConfigId: string, nextConnectorId: string) => {
      handleConnectorChangeInternal(connectorConfigId, nextConnectorId, {
        connectorTypes,
        connectors,
      });
    },
    [connectorTypes, connectors, handleConnectorChangeInternal]
  );

  const removeConnector = useCallback(
    (connectorConfigId: string) => {
      removeConnectorInternal(connectorConfigId);
    },
    [removeConnectorInternal]
  );

  useEffect(() => {
    syncConnectorSelections({ connectorTypes, connectors });
  }, [connectorTypes, connectors, syncConnectorSelections]);

  useEffect(() => {
    let isMounted = true;

    const loadConfigForEdit = async (id: string) => {
      setIsInitialLoading(true);
      setInitialLoadError(null);

      try {
        const resolveResult = await resolveCustomizableForm(http, id);
        if (!isMounted) {
          return;
        }
        const document = getDocumentFromResolveResponse(resolveResult);
        const nextConfig = document.formConfig;
        replaceFormConfig(nextConfig);
        setSavedObjectAttributes({
          title: document.attributes.title || nextConfig.title,
          description:
            document.attributes.description ?? nextConfig.description,
        });
        setFieldValues(buildInitialFieldValues(nextConfig.fields));
        setSavedObjectId(resolveResult.saved_object.id);
      } catch (error) {
        if (!isMounted) {
          return;
        }
        const message = getErrorMessage(error);
        setInitialLoadError(message);
        toasts.addDanger({
          title: i18n.translate('customizableForm.builder.loadSavedObjectErrorTitle', {
            defaultMessage: 'Unable to load form configuration',
          }),
          text: message,
        });
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    if (mode === 'edit') {
      if (initialSavedObjectId) {
        loadConfigForEdit(initialSavedObjectId);
      } else {
        const message = i18n.translate('customizableForm.builder.missingSavedObjectIdMessage', {
          defaultMessage: 'No saved object id provided.',
        });
        setInitialLoadError(message);
        setIsInitialLoading(false);
        toasts.addDanger({
          title: i18n.translate('customizableForm.builder.loadSavedObjectMissingIdTitle', {
            defaultMessage: 'Unable to load form configuration',
          }),
          text: message,
        });
      }
    } else {
      setSavedObjectId(null);
      setInitialLoadError(null);
      setIsInitialLoading(false);
      replaceFormConfig(INITIAL_CONFIG);
      setSavedObjectAttributes({ ...INITIAL_SAVED_OBJECT_ATTRIBUTES });
      setFieldValues(buildInitialFieldValues(INITIAL_CONFIG.fields));
    }

    return () => {
      isMounted = false;
    };
  }, [http, mode, initialSavedObjectId, toasts]);


  useEffect(() => {
    setFieldValues((prev) => {
      const next: Record<string, string> = {};
      formConfig.fields.forEach((field) => {
        next[field.id] = prev[field.id] ?? '';
      });
      return next;
    });
  }, [formConfig.fields]);

  const handleFieldValueChange = useCallback((fieldId: string, value: string) => {
    setFieldValues((prev) => {
      if (prev[fieldId] === value) {
        return prev;
      }
      return {
        ...prev,
        [fieldId]: value,
      };
    });
  }, []);

  const connectorTypeOptions = useMemo(() => toConnectorTypeOptions(connectorTypes), [connectorTypes]);

  const connectorsByType = useMemo(() => {
    return connectors.reduce<Record<string, Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>>>(
      (acc, connector) => {
        const list = acc[connector.actionTypeId] ?? [];
        list.push(connector);
        acc[connector.actionTypeId] = list;
        return acc;
      },
      {}
    );
  }, [connectors]);

  const fieldKeys = useMemo(() => {
    return formConfig.fields
      .map((field) => field.key.trim())
      .filter((key) => key.length > 0);
  }, [formConfig.fields]);

  const connectorSelectionState = useMemo(() => {
    const state: Record<string, ConnectorSelectionStateEntry> = {};

    formConfig.connectors.forEach((connectorConfig) => {
      const connectorsForType = connectorConfig.connectorTypeId
        ? connectors.filter((connector) => connector.actionTypeId === connectorConfig.connectorTypeId)
        : [];

      const takenConnectorIds = new Set(
        formConfig.connectors
          .filter((item) => item.id !== connectorConfig.id)
          .map((item) => item.connectorId)
          .filter((id): id is string => Boolean(id))
      );

      const availableConnectors = connectorsForType.filter(
        (connector) => connector.id === connectorConfig.connectorId || !takenConnectorIds.has(connector.id)
      );

      const hasType = Boolean(connectorConfig.connectorTypeId);
      const hasSelection =
        hasType &&
        Boolean(connectorConfig.connectorId) &&
        availableConnectors.some((connector) => connector.id === connectorConfig.connectorId);

      state[connectorConfig.id] = {
        connectorsForType,
        availableConnectors,
        hasType,
        hasSelection,
      };
    });

    return state;
  }, [formConfig.connectors, connectors]);

  const templateValidationByConnector = useMemo(() => {
    const definedKeys = new Set(fieldKeys);
    return formConfig.connectors.reduce<Record<string, { missing: string[]; unused: Array<{ key: string; label: string }> }>>(
      (acc, connectorConfig) => {
        const variables = getTemplateVariables(connectorConfig.documentTemplate);
        const missing = variables.filter((variable) => !definedKeys.has(variable));
        const usedVariables = new Set(variables);
        const unused = formConfig.fields
          .map((field) => {
            const key = field.key.trim();
            if (!key || usedVariables.has(key)) {
              return null;
            }
            return {
              key,
              label: field.label?.trim() || key,
            };
          })
          .filter((field): field is { key: string; label: string } => field !== null);

        acc[connectorConfig.id] = {
          missing,
          unused,
        };
        return acc;
      },
      {}
    );
  }, [formConfig.connectors, formConfig.fields, fieldKeys]);

  const connectorStatusById = useMemo(() => {
    const status: Record<string, ConnectorStatus> = {};

    formConfig.connectors.forEach((connectorConfig) => {
      const selection = connectorSelectionState[connectorConfig.id];
      const validation = templateValidationByConnector[connectorConfig.id] ?? {
        missing: [],
        unused: [],
      };

      const hasLabelError = !(connectorConfig.label || '').trim();
      const hasType = selection?.hasType ?? false;
      const hasSelection = selection?.hasSelection ?? false;
      const availableCount = selection?.availableConnectors.length ?? 0;

      const hasSelectionWarning =
        !isLoadingConnectors && hasType && availableCount === 0;
      const hasSelectionError = hasType && !hasSelection;
      const hasTypeError = !hasType;

      const hasWarning = hasSelectionWarning;
      const hasError = hasLabelError || hasSelectionError || hasTypeError;

      const hasTemplateError = validation.missing.length > 0;
      const hasTemplateWarning = validation.unused.length > 0;

      status[connectorConfig.id] = {
        hasWarning,
        hasError,
        hasTemplateWarning,
        hasTemplateError,
      };
    });

    return status;
  }, [formConfig.connectors, connectorSelectionState, templateValidationByConnector, isLoadingConnectors]);

  const fieldValidationById = useMemo(() => {
    const map: Record<string, FieldValidationResult> = {};
    formConfig.fields.forEach((field) => {
      map[field.id] = getFieldValidationResult(field, fieldValues[field.id] ?? '');
    });
    return map;
  }, [formConfig.fields, fieldValues]);

  const variableNameValidationById = useMemo(() => {
    const trimmedNames = formConfig.fields.map((field) => field.key.trim());
    return formConfig.fields.reduce<Record<string, VariableNameValidationResult>>(
      (acc, field) => {
        acc[field.id] = validateVariableName({ value: field.key, existingNames: trimmedNames });
        return acc;
      },
      {}
    );
  }, [formConfig.fields]);

  const hasFieldValidationWarnings = useMemo(
    () =>
      Object.values(fieldValidationById).some((result) => result.isOutOfRange) ||
      Object.values(variableNameValidationById).some((result) => !result.isValid),
    [fieldValidationById, variableNameValidationById]
  );

  const isSubmitDisabled = useMemo(
    () =>
      formConfig.fields.some(
        (field) => field.required && !(fieldValues[field.id]?.trim())
      ) || hasFieldValidationWarnings,
    [formConfig.fields, fieldValues, hasFieldValidationWarnings]
  );

  const renderedPayloads = useMemo(() => {
    const valueMap = formConfig.fields.reduce<Record<string, string>>((acc, field) => {
      if (field.key) {
        acc[field.key.trim()] = fieldValues[field.id] ?? '';
      }
      return acc;
    }, {});

    return formConfig.connectors.reduce<Record<string, string>>((acc, connectorConfig) => {
      const rendered = connectorConfig.documentTemplate.replace(
        /{{\s*([^{}\s]+)\s*}}/g,
        (_, variable: string) => {
          const trimmed = variable.trim();
          return valueMap[trimmed] ?? '';
        }
      );
      acc[connectorConfig.id] = rendered;
      return acc;
    }, {});
  }, [formConfig.connectors, formConfig.fields, fieldValues]);

  const hasEmptyConnectorLabels = useMemo(
    () => formConfig.connectors.some((connectorConfig) => !(connectorConfig.label || '').trim()),
    [formConfig.connectors]
  );

  const hasInvalidConnectorSelections = useMemo(
    () =>
      formConfig.connectors.some((connectorConfig) => {
        const state = connectorSelectionState[connectorConfig.id];
        return !state || !state.hasSelection;
      }),
    [formConfig.connectors, connectorSelectionState]
  );

  const handleSaveVisualizationRequest = useCallback(() => {
    const handleModalSave = async ({
      newTitle,
      newDescription,
      newCopyOnSave,
      dashboardId,
      addToLibrary,
    }: Parameters<SaveModalDashboardProps['onSave']>[0]): Promise<SaveResult> => {
      const titleInput = typeof newTitle === 'string' ? newTitle.trim() : '';
      const descriptionInput = typeof newDescription === 'string' ? newDescription.trim() : '';
      const attributes: CustomizableFormAttributesMeta = {
        title:
          titleInput ||
          (savedObjectAttributes.title?.trim().length ? savedObjectAttributes.title : formConfig.title),
        description: descriptionInput,
      };

      const shouldCreateNew = newCopyOnSave || !savedObjectId;

      setIsSaving(true);

      try {
        const savedObject = shouldCreateNew
          ? await createCustomizableForm(http, { formConfig, attributes })
          : await updateCustomizableForm(http, savedObjectId!, { formConfig, attributes });

        setSavedObjectId(savedObject.id);
        setSavedObjectAttributes(attributes);

        if (shouldCreateNew) {
          history.replace(`/edit/${savedObject.id}`);
          toasts.addSuccess({
            title: i18n.translate('customizableForm.builder.saveVisualizationSuccessTitleNew', {
              defaultMessage: 'Form saved to the library',
            }),
            text: i18n.translate('customizableForm.builder.saveVisualizationSuccessBodyNew', {
              defaultMessage: 'Your new customizable form is ready to use.',
            }),
          });
        } else {
          toasts.addSuccess({
            title: i18n.translate('customizableForm.builder.saveVisualizationSuccessTitleUpdate', {
              defaultMessage: 'Changes saved',
            }),
            text: i18n.translate('customizableForm.builder.saveVisualizationSuccessBodyUpdate', {
              defaultMessage: 'The customizable form has been updated.',
            }),
          });
        }

        if (dashboardId && !addToLibrary) {
          toasts.addWarning({
            title: i18n.translate('customizableForm.builder.saveVisualizationByValueNotSupportedTitle', {
              defaultMessage: 'Added to dashboard as library item',
            }),
            text: i18n.translate('customizableForm.builder.saveVisualizationByValueNotSupportedBody', {
              defaultMessage:
                'By-value panels are not yet supported. The saved form will be available from the library.',
            }),
          });
          application.navigateToApp('dashboards', {
            path: dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`,
          });
        } else if (dashboardId) {
          const stateTransfer = getEmbeddableStateTransfer();
          await stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
            path: dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`,
            state: {
              type: CUSTOMIZABLE_FORM_EMBEDDABLE_TYPE,
              serializedState: {
                rawState: {
                  savedObjectId: savedObject.id,
                },
                references: savedObject.references ?? [],
              },
            },
          });
        }

        return { id: savedObject.id };
      } catch (error) {
        const message = getErrorMessage(error);
        toasts.addDanger({
          title: i18n.translate('customizableForm.builder.saveVisualizationErrorTitle', {
            defaultMessage: 'Unable to save form',
          }),
          text: message,
        });
        return { error: new Error(message) };
      } finally {
        setIsSaving(false);
      }
    };

    const DashboardSaveModalComponent = SavedObjectSaveModalDashboard as unknown as React.ComponentType<
      SaveModalDashboardProps<SaveResult>
    >;

    showSaveModal(
      <DashboardSaveModalComponent
        documentInfo={{
          id: savedObjectId ?? undefined,
          title:
            savedObjectId !== null
              ? savedObjectAttributes.title
              : savedObjectAttributes.title?.trim().length > 0
              ? savedObjectAttributes.title
              : formConfig.title,
          description:
            savedObjectId !== null
              ? savedObjectAttributes.description
              : savedObjectAttributes.description?.trim().length
              ? savedObjectAttributes.description
              : formConfig.description,
        }}
        canSaveByReference={true}
        objectType={i18n.translate('customizableForm.builder.saveModal.objectType', {
          defaultMessage: 'custom form',
        })}
        onSave={handleModalSave}
        onClose={() => {}}
      />
    );
  }, [application, formConfig, history, http, savedObjectAttributes, savedObjectId, toasts]);

  const hasInvalidVariableNames = useMemo(
    () => Object.values(variableNameValidationById).some((result) => !result.isValid),
    [variableNameValidationById]
  );

  const isSaveDisabled = useMemo(
    () =>
      hasEmptyConnectorLabels ||
      hasInvalidConnectorSelections ||
      formConfig.connectors.some(
        (connectorConfig) =>
          (templateValidationByConnector[connectorConfig.id]?.missing.length ?? 0) > 0
      ) ||
      hasInvalidVariableNames,
    [
      formConfig.connectors,
      templateValidationByConnector,
      hasEmptyConnectorLabels,
      hasInvalidConnectorSelections,
      hasInvalidVariableNames,
    ]
  );

  const connectorSummaries = useMemo(
    () =>
      formConfig.connectors.map((connectorConfig, index) => ({
        config: connectorConfig,
        type: connectorTypes.find((type) => type.id === connectorConfig.connectorTypeId) ?? null,
        connector:
          connectors.find((connectorInstance) => connectorInstance.id === connectorConfig.connectorId) ??
          null,
        label: (connectorConfig.label || '').trim() || getConnectorFallbackLabel(index),
        status: connectorStatusById[connectorConfig.id] ?? DEFAULT_CONNECTOR_STATUS,
      })),
    [formConfig.connectors, connectorTypes, connectors, connectorStatusById]
  );

  const connectorSummaryItems = useMemo<ConnectorSummaryItem[]>(() => {
    return connectorSummaries.map((summary, index) => {
      const connectorName =
        summary.connector?.name ??
        i18n.translate('customizableForm.builder.connectorSummary.connectorFallback', {
          defaultMessage: 'Unnamed connector {index}',
          values: { index: index + 1 },
        });
      const rawTypeLabel =
        summary.type?.name ??
        summary.connector?.actionTypeId ??
        summary.config.connectorTypeId;
      const typeLabel =
        rawTypeLabel && rawTypeLabel.trim().length > 0 ? rawTypeLabel : '—';

      return {
        id: summary.config.id,
        label: summary.label,
        connectorName,
        connectorTypeLabel: typeLabel,
        status: summary.status,
      };
    });
  }, [connectorSummaries]);

  const connectorLabelsById = useMemo(() => {
    const labels: Record<string, string> = {};
    formConfig.connectors.forEach((connector, index) => {
      labels[connector.id] = (connector.label || '').trim() || getConnectorFallbackLabel(index);
    });
    return labels;
  }, [formConfig.connectors]);

  const executeConnectorsNow = useCallback(async () => {
    if (formConfig.connectors.length === 0) {
      toasts.addWarning({
        title: i18n.translate('customizableForm.builder.executeConnectors.noConnectorsTitle', {
          defaultMessage: 'No connectors configured',
        }),
        text: i18n.translate('customizableForm.builder.executeConnectors.noConnectorsBody', {
          defaultMessage: 'Add at least one connector before submitting the form.',
        }),
      });
      return;
    }

    setIsExecutingConnectors(true);

    try {
      const results = await executeFormConnectors({
        http,
        connectors: formConfig.connectors,
        renderedPayloads,
      });

      const successes = results.filter((result) => result.status === 'success');
      const errors = results.filter((result) => result.status === 'error');

      successes.forEach((result) => {
        const label =
          connectorLabelsById[result.connector.id] ?? result.connector.label ?? result.connector.id;
        toasts.addSuccess({
          title: i18n.translate('customizableForm.builder.executeConnectors.successTitle', {
            defaultMessage: 'Connector executed',
          }),
          text: i18n.translate('customizableForm.builder.executeConnectors.successBody', {
            defaultMessage: '{label} executed successfully.',
            values: { label },
          }),
        });
      });

      errors.forEach((result) => {
        const label =
          connectorLabelsById[result.connector.id] ?? result.connector.label ?? result.connector.id;
        toasts.addDanger({
          title: i18n.translate('customizableForm.builder.executeConnectors.errorTitle', {
            defaultMessage: 'Connector execution failed',
          }),
          text:
            result.message ??
            i18n.translate('customizableForm.builder.executeConnectors.errorBody', {
              defaultMessage: 'Unable to execute {label}.',
              values: { label },
            }),
        });
      });
    } catch (error) {
      toasts.addDanger({
        title: i18n.translate('customizableForm.builder.executeConnectors.unexpectedErrorTitle', {
          defaultMessage: 'Submit failed',
        }),
        text: getErrorMessage(error),
      });
    } finally {
      setIsExecutingConnectors(false);
    }
  }, [
    formConfig.connectors,
    connectorLabelsById,
    http,
    renderedPayloads,
    toasts,
  ]);

  const handleTestSubmission = useCallback(() => {
    if (formConfig.connectors.length === 0) {
      toasts.addWarning({
        title: i18n.translate('customizableForm.builder.executeConnectors.noConnectorsTitle', {
          defaultMessage: 'No connectors configured',
        }),
        text: i18n.translate('customizableForm.builder.executeConnectors.noConnectorsBody', {
          defaultMessage: 'Add at least one connector before submitting the form.',
        }),
      });
      return;
    }

    if (formConfig.requireConfirmationOnSubmit) {
      setIsSubmitConfirmationVisible(true);
      return;
    }

    executeConnectorsNow();
  }, [executeConnectorsNow, formConfig.connectors, formConfig.requireConfirmationOnSubmit, toasts]);

  const handleConfirmConnectorExecution = useCallback(() => {
    setIsSubmitConfirmationVisible(false);
    executeConnectorsNow();
  }, [executeConnectorsNow]);

  const handleCancelConnectorExecution = useCallback(() => {
    setIsSubmitConfirmationVisible(false);
  }, []);

  if (isInitialLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <EuiLoadingSpinner size="xl" />
      </div>
    );
  }

  if (initialLoadError) {
    return (
      <div
        style={{
          padding: '32px',
          maxWidth: 600,
          margin: '0 auto',
        }}
      >
        <EuiCallOut
          color="danger"
          iconType="alert"
          title={i18n.translate('customizableForm.builder.initialLoadErrorTitle', {
            defaultMessage: 'Unable to load form',
          })}
        >
          <p>{initialLoadError}</p>
        </EuiCallOut>
        <EuiSpacer size="m" />
        <EuiButton
          onClick={() => history.push('/create')}
          iconType="editorRedo"
          fill
        >
          {i18n.translate('customizableForm.builder.initialLoadErrorResetButton', {
            defaultMessage: 'Start a new form',
          })}
        </EuiButton>
      </div>
    );
  }

  return (
    <>
      {isSubmitConfirmationVisible ? (
        <EuiOverlayMask>
          <EuiConfirmModal
            title={i18n.translate('customizableForm.builder.executeConfirmModalTitle', {
              defaultMessage: 'Execute connectors?',
            })}
            onCancel={handleCancelConnectorExecution}
            onConfirm={handleConfirmConnectorExecution}
            cancelButtonText={i18n.translate('customizableForm.builder.executeConfirmModalCancel', {
              defaultMessage: 'Cancel',
            })}
            confirmButtonText={i18n.translate('customizableForm.builder.executeConfirmModalConfirm', {
              defaultMessage: 'Execute connectors',
            })}
            defaultFocusedButton="confirm"
            maxWidth={640}
            style={{ width: '640px' }}
          >
            <EuiText size="s">
              <p>
                {i18n.translate('customizableForm.builder.executeConfirmModalBody', {
                  defaultMessage: 'You are about to trigger the following connectors.',
                })}
              </p>
            </EuiText>
            <EuiSpacer size="m" />
            <ConnectorSummaryTable items={connectorSummaryItems} />
          </EuiConfirmModal>
        </EuiOverlayMask>
      ) : null}

      <div
        style={{
          backgroundColor: '#f6f9fc',
          minHeight: '100vh',
          padding: '24px 32px 32px',
          boxSizing: 'border-box',
        }}
      >
        <EuiFlexGroup gutterSize="m" alignItems="stretch">
          <EuiFlexItem grow={4}>
            <EuiFlexGroup direction="column" gutterSize="m">
              <EuiFlexItem grow={false}>
                <PreviewCard
                  config={formConfig}
                  fieldValues={fieldValues}
                  onFieldValueChange={handleFieldValueChange}
                  isSubmitDisabled={isSubmitDisabled}
                  onSubmit={handleTestSubmission}
                  validationByFieldId={fieldValidationById}
                  isSubmitting={isExecutingConnectors}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <InfoPanel
                  connectorSummaries={connectorSummaries}
                  connectorSummaryItems={connectorSummaryItems}
                  renderedPayloads={renderedPayloads}
                  templateValidationByConnector={templateValidationByConnector}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={2}>
            <ConfigurationPanel
              config={formConfig}
              onTitleChange={(v) => updateConfig({ title: v })}
              onDescriptionChange={(v) => updateConfig({ description: v })}
              onShowTitleChange={(show) => updateConfig({ showTitle: show })}
              onShowDescriptionChange={(show) => updateConfig({ showDescription: show })}
              onLayoutColumnsChange={(cols) => updateConfig({ layoutColumns: cols })}
              onRequireConfirmationChange={(value) =>
                updateConfig({ requireConfirmationOnSubmit: value })
              }
              onConnectorTypeChange={handleConnectorTypeChange}
              onConnectorChange={handleConnectorChange}
              onConnectorLabelChange={handleConnectorLabelChange}
              onConnectorTemplateChange={handleConnectorTemplateChange}
              onConnectorAdd={addConnector}
              onConnectorRemove={removeConnector}
              onFieldChange={updateField}
              onFieldRemove={removeField}
              onAddField={addField}
              onFieldReorder={handleFieldReorder}
              variableNameValidationById={variableNameValidationById}
              hasInvalidVariableNames={hasInvalidVariableNames}
              connectorTypeOptions={connectorTypeOptions}
              connectorTypes={connectorTypes}
              connectorsByType={connectorsByType}
              templateValidationByConnector={templateValidationByConnector}
              connectorStatusById={connectorStatusById}
              connectorSelectionState={connectorSelectionState}
              isLoadingConnectorTypes={isLoadingConnectorTypes}
              isLoadingConnectors={isLoadingConnectors}
              connectorTypesError={connectorTypesError}
              connectorsError={connectorsError}
              hasEmptyConnectorLabels={hasEmptyConnectorLabels}
              isSaveDisabled={isSaveDisabled}
              isSaving={isSaving}
              onSaveRequest={handleSaveVisualizationRequest}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </>
  );
};

export default CustomizableFormBuilder;

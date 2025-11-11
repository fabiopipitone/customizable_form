import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { AppMountParameters, CoreStart, NotificationsStart } from '@kbn/core/public';
import { showSaveModal } from '@kbn/saved-objects-plugin/public';
import {
  LazySavedObjectSaveModalDashboard,
  type SaveModalDashboardProps,
  withSuspense,
} from '@kbn/presentation-util-plugin/public';
import type { SaveResult } from '@kbn/saved-objects-plugin/public';

import type { FormConfig } from '../types';
import { useFormConfigState } from '../use_form_config_state';
import { useConnectorsData, getCanonicalConnectorTypeId } from '../use_connectors_data';
import {
  createCustomizableForm,
  getDocumentFromResolveResponse,
  resolveCustomizableForm,
  updateCustomizableForm,
  type CustomizableFormAttributesMeta,
} from '../../../services/persistence';
import { buildInitialFieldValues, DEFAULT_PAYLOAD_TEMPLATE, getErrorMessage } from '../utils/form_helpers';
import { CUSTOMIZABLE_FORM_EMBEDDABLE_TYPE } from '../../../../common';
import { getEmbeddableStateTransfer } from '../../../services/embeddable_state_transfer';
import { useFieldValidation } from './use_field_validation';
import { usePayloadTemplates } from './use_payload_templates';
import { useConnectorState } from './use_connector_state';
import type { FormBuilderContextValue } from '../form_builder_context';

const SavedObjectSaveModalDashboard = withSuspense(LazySavedObjectSaveModalDashboard);

export interface UseFormBuilderLifecycleParams {
  mode: 'create' | 'edit';
  savedObjectId?: string;
  notifications: NotificationsStart;
  http: CoreStart['http'];
  application: CoreStart['application'];
  history: AppMountParameters['history'];
  initialConfig: FormConfig;
  initialAttributes: CustomizableFormAttributesMeta;
}

export const useFormBuilderLifecycle = ({
  mode,
  savedObjectId: initialSavedObjectId,
  notifications,
  http,
  application,
  history,
  initialConfig,
  initialAttributes,
}: UseFormBuilderLifecycleParams) => {
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
  } = useFormConfigState({ initialConfig });

  const [savedObjectAttributes, setSavedObjectAttributes] = useState<CustomizableFormAttributesMeta>(
    () => ({ ...initialAttributes })
  );

  const [savedObjectId, setSavedObjectId] = useState<string | null>(
    mode === 'edit' && initialSavedObjectId ? initialSavedObjectId : null
  );
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(mode === 'edit');
  const [initialLoadError, setInitialLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

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
    buildInitialFieldValues(initialConfig.fields)
  );

  const addConnector = useCallback(() => {
    addConnectorInternal({
      connectorTypes,
      connectors,
      defaultTemplate: DEFAULT_PAYLOAD_TEMPLATE,
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
          description: document.attributes.description ?? nextConfig.description,
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
      replaceFormConfig(initialConfig);
      setSavedObjectAttributes({ ...initialAttributes });
      setFieldValues(buildInitialFieldValues(initialConfig.fields));
    }

    return () => {
      isMounted = false;
    };
  }, [http, initialAttributes, initialConfig, initialSavedObjectId, mode, replaceFormConfig, toasts]);

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
  }, [
    application,
    formConfig,
    history,
    http,
    savedObjectAttributes,
    savedObjectId,
    toasts,
  ]);

  const {
    fieldValidationById,
    variableNameValidationById,
    hasFieldValidationWarnings,
    hasInvalidVariableNames,
  } = useFieldValidation({ formConfig, fieldValues });

  const { renderedPayloads, templateValidationByConnector } = usePayloadTemplates({
    formConfig,
    fieldValues,
  });

  const { connectorSelectionState, connectorStatusById, connectorSummaries, connectorSummaryItems } =
    useConnectorState({
      formConfig,
      connectorTypes,
      connectors,
      isLoadingConnectors,
      templateValidationByConnector,
    });

  const derivedState = useMemo(
    () => ({
      fieldValidationById,
      variableNameValidationById,
      hasFieldValidationWarnings,
      hasInvalidVariableNames,
      renderedPayloads,
      templateValidationByConnector,
      connectorSelectionState,
      connectorStatusById,
      connectorSummaries,
      connectorSummaryItems,
    }),
    [
      fieldValidationById,
      variableNameValidationById,
      hasFieldValidationWarnings,
      hasInvalidVariableNames,
      renderedPayloads,
      templateValidationByConnector,
      connectorSelectionState,
      connectorStatusById,
      connectorSummaries,
      connectorSummaryItems,
    ]
  );

  const formBuilderContextValue = useMemo<FormBuilderContextValue>(
    () => ({
      formConfig,
      fieldValues,
      derivedState,
      updateConfig,
      addField,
      removeField,
      updateField,
      handleFieldReorder,
      handleFieldValueChange,
      addConnector,
      removeConnector,
      handleConnectorTypeChange,
      handleConnectorChange,
      handleConnectorLabelChange,
      handleConnectorTemplateChange,
    }),
    [
      formConfig,
      fieldValues,
      derivedState,
      updateConfig,
      addField,
      removeField,
      updateField,
      handleFieldReorder,
      handleFieldValueChange,
      addConnector,
      removeConnector,
      handleConnectorTypeChange,
      handleConnectorChange,
      handleConnectorLabelChange,
      handleConnectorTemplateChange,
    ]
  );

  return {
    formConfig,
    fieldValues,
    connectorTypes,
    connectors,
    isLoadingConnectorTypes,
    isLoadingConnectors,
    connectorTypesError,
    connectorsError,
    isInitialLoading,
    initialLoadError,
    isSaving,
    handleSaveVisualizationRequest,
    fieldValidationById,
    variableNameValidationById,
    hasFieldValidationWarnings,
    hasInvalidVariableNames,
    renderedPayloads,
    templateValidationByConnector,
    connectorSelectionState,
    connectorStatusById,
    connectorSummaries,
    connectorSummaryItems,
    derivedState,
    formBuilderContextValue,
  };
};

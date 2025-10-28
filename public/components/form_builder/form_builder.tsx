import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart, NotificationsStart } from '@kbn/core/public';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { loadActionTypes, loadAllActions } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { ActionType } from '@kbn/actions-types';
import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';

import { FormConfig, FormFieldConfig, FormFieldType } from './types';

interface CustomizableFormBuilderProps {
  notifications: NotificationsStart;
  http: CoreStart['http'];
}

type SupportedConnectorTypeId = '.index' | '.webhook';

const CONNECTOR_TYPE_CANONICAL: Record<string, SupportedConnectorTypeId> = {
  '.index': '.index',
  index: '.index',
  '.webhook': '.webhook',
  webhook: '.webhook',
};

const getCanonicalConnectorTypeId = (id?: string | null): SupportedConnectorTypeId | null => {
  if (!id) return null;
  return CONNECTOR_TYPE_CANONICAL[id] ?? null;
};

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

const INITIAL_CONFIG: FormConfig = {
  title: i18n.translate('customizableForm.builder.initialTitle', {
    defaultMessage: 'New customizable form',
  }),
  description: i18n.translate('customizableForm.builder.initialDescription', {
    defaultMessage:
      'Define the inputs for the dashboard widget and map them to the connector payload.',
  }),
  showTitle: true,
  showDescription: true,
  connectorTypeId: '',
  connectorId: '',
  documentTemplate: DEFAULT_TEMPLATE,
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
    },
  ],
};

const buildInitialFieldValues = (fields: FormFieldConfig[]): Record<string, string> =>
  fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.id] = '';
    return acc;
  }, {});

const toConnectorTypeOptions = (types: Array<ActionType & { id: SupportedConnectorTypeId }>) =>
  types.map((type) => ({ value: type.id, text: type.name }));

const toConnectorOptions = (connectors: ActionConnector[]) =>
  connectors.map((connector) => ({ value: connector.id, text: connector.name }));

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

interface PreviewContentProps {
  config: FormConfig;
  fieldValues: Record<string, string>;
  onFieldValueChange: (fieldId: string, value: string) => void;
  isSubmitDisabled: boolean;
  onSubmit: () => void;
}

const PanelHeader = ({ title }: { title: string }) => (
  <div
    style={{
      backgroundColor: '#eef3fc',
      padding: '12px 16px',
      borderBottom: '1px solid #d3dae6',
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
      margin: '-16px -16px 16px -16px',
    }}
  >
    <EuiTitle size="xs">
      <h3 style={{ margin: 0 }}>{title}</h3>
    </EuiTitle>
  </div>
);

interface PreviewCardProps {
  config: FormConfig;
  fieldValues: Record<string, string>;
  onFieldValueChange: (fieldId: string, value: string) => void;
  isSubmitDisabled: boolean;
  onSubmit: () => void;
}

const PreviewCard = ({ config, fieldValues, onFieldValueChange, isSubmitDisabled, onSubmit }: PreviewCardProps) => (
  <EuiPanel paddingSize="m" hasShadow hasBorder={false}>
    <PanelHeader
      title={i18n.translate('customizableForm.builder.previewPanelTitle', {
        defaultMessage: 'Preview',
      })}
    />
    <PreviewContent
      config={config}
      fieldValues={fieldValues}
      onFieldValueChange={onFieldValueChange}
      isSubmitDisabled={isSubmitDisabled}
      onSubmit={onSubmit}
    />
  </EuiPanel>
);

export const CustomizableFormBuilder = ({ notifications, http }: CustomizableFormBuilderProps) => {
  const [formConfig, setFormConfig] = useState<FormConfig>(INITIAL_CONFIG);
  const fieldCounter = useRef<number>(INITIAL_CONFIG.fields.length);

  const [connectorTypes, setConnectorTypes] = useState<
    Array<ActionType & { id: SupportedConnectorTypeId }>
  >([]);
  const [connectors, setConnectors] = useState<
    Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>
  >([]);
  const [isLoadingConnectorTypes, setIsLoadingConnectorTypes] = useState(false);
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(false);
  const [connectorTypesError, setConnectorTypesError] = useState<string | null>(null);
  const [connectorsError, setConnectorsError] = useState<string | null>(null);
  const { toasts } = notifications;
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() =>
    buildInitialFieldValues(INITIAL_CONFIG.fields)
  );

  // Load connector types
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadConnectorTypesFx = async () => {
      setIsLoadingConnectorTypes(true);
      setConnectorTypesError(null);

      try {
        const response = await loadActionTypes({
          http,
          includeSystemActions: false,
        });

        if (!isMounted) return;

        const filtered = response
          .map((type) => {
            const canonicalId = getCanonicalConnectorTypeId(type.id);
            return canonicalId
              ? ({ ...type, id: canonicalId } as ActionType & { id: SupportedConnectorTypeId })
              : null;
          })
          .filter((t): t is ActionType & { id: SupportedConnectorTypeId } => t !== null)
          .sort((a, b) => a.name.localeCompare(b.name));

        setConnectorTypes(filtered);

        setFormConfig((prev) => {
          if (prev.connectorTypeId && filtered.some((t) => t.id === prev.connectorTypeId)) {
            return prev;
          }
          const nextTypeId = filtered[0]?.id ?? '';
          if (prev.connectorTypeId === nextTypeId) return prev;
          return { ...prev, connectorTypeId: nextTypeId, connectorId: '' };
        });
      } catch (error) {
        if (abortController.signal.aborted || !isMounted) return;
        const message = getErrorMessage(error);
        setConnectorTypesError(message);
        toasts.addDanger({
          title: i18n.translate('customizableForm.builder.loadConnectorTypesErrorTitle', {
            defaultMessage: 'Unable to load connector types',
          }),
          text: message,
        });
      } finally {
        if (isMounted) setIsLoadingConnectorTypes(false);
      }
    };

    loadConnectorTypesFx();
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [http, toasts]);

  // Load connectors
  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadConnectorsFx = async () => {
      setIsLoadingConnectors(true);
      setConnectorsError(null);

      try {
        const response = await loadAllActions({
          http,
          includeSystemActions: false,
        });

        if (!isMounted) return;

        const filtered = response
          .map((connector) => {
            const rawType: string | undefined =
              (connector as any).actionTypeId ?? (connector as any).connector_type_id;

            const canonicalId = getCanonicalConnectorTypeId(rawType);
            return canonicalId
              ? ({
                  ...connector,
                  actionTypeId: canonicalId,
                } as ActionConnector & { actionTypeId: SupportedConnectorTypeId })
              : null;
          })
          .filter(
            (c): c is ActionConnector & { actionTypeId: SupportedConnectorTypeId } => c !== null
          )
          .sort((a, b) => a.name.localeCompare(b.name));

        setConnectors(filtered);
      } catch (error) {
        if (abortController.signal.aborted || !isMounted) return;
        const message = getErrorMessage(error);
        setConnectorsError(message);
        toasts.addDanger({
          title: i18n.translate('customizableForm.builder.loadConnectorsErrorTitle', {
            defaultMessage: 'Unable to load connectors',
          }),
          text: message,
        });
      } finally {
        if (isMounted) setIsLoadingConnectors(false);
      }
    };

    loadConnectorsFx();
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [http, toasts]);

  // riallinea connectorId quando cambiano i connettori disponibili
  useEffect(() => {
    setFormConfig((prev) => {
      if (!prev.connectorTypeId) return prev.connectorId === '' ? prev : { ...prev, connectorId: '' };
      const connectorsForType = connectors.filter((c) => c.actionTypeId === prev.connectorTypeId);
      if (connectorsForType.length === 0) {
        return prev.connectorId === '' ? prev : { ...prev, connectorId: '' };
      }
      const currentIsValid = connectorsForType.some((c) => c.id === prev.connectorId);
      return currentIsValid ? prev : { ...prev, connectorId: connectorsForType[0].id };
    });
  }, [connectors]); // eslint-disable-line react-hooks/exhaustive-deps

  // riallinea quando cambia il tipo selezionato
  useEffect(() => {
    setFormConfig((prev) => {
      if (!prev.connectorTypeId) return { ...prev, connectorId: '' };
      const connectorsForType = connectors.filter((c) => c.actionTypeId === prev.connectorTypeId);
      if (connectorsForType.length === 0) return { ...prev, connectorId: '' };
      const currentIsValid = connectorsForType.some((c) => c.id === prev.connectorId);
      return currentIsValid ? prev : { ...prev, connectorId: connectorsForType[0].id };
    });
  }, [formConfig.connectorTypeId, connectors]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateConfig = (partial: Partial<FormConfig>) => {
    setFormConfig((prev) => ({ ...prev, ...partial }));
  };

  const updateField = (fieldId: string, changes: Partial<FormFieldConfig>) => {
    setFormConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((f) => (f.id === fieldId ? { ...f, ...changes } : f)),
    }));
  };

  const removeField = (fieldId: string) => {
    setFormConfig((prev) => ({
      ...prev,
      fields: prev.fields.filter((f) => f.id !== fieldId),
    }));
  };

  const addField = () => {
    fieldCounter.current += 1;
    const n = fieldCounter.current;
    const newField: FormFieldConfig = {
      id: `field-${n}`,
      key: `field_${n}`,
      label: i18n.translate('customizableForm.builder.newFieldLabel', {
        defaultMessage: 'Field {position}',
        values: { position: n },
      }),
      placeholder: '',
      type: 'text',
      required: false,
    };
    setFormConfig((prev) => ({ ...prev, fields: [...prev.fields, newField] }));
  };

  const handleSaveVisualization = useCallback(() => {
    // TODO: replace with Kibana save modal integration
    console.log('Save visualization requested', formConfig);
  }, [formConfig]);

  const handleConnectorTypeChange = useCallback(
    (nextTypeId: string) => {
      setFormConfig((prev) => {
        if (prev.connectorTypeId === nextTypeId) return prev;
        const connectorsForType = connectors.filter((c) => c.actionTypeId === nextTypeId);
        const nextConnectorId = connectorsForType[0]?.id ?? '';
        return { ...prev, connectorTypeId: nextTypeId, connectorId: nextConnectorId };
      });
    },
    [connectors]
  );

  const handleConnectorChange = useCallback((nextConnectorId: string) => {
    setFormConfig((prev) => (prev.connectorId === nextConnectorId ? prev : { ...prev, connectorId: nextConnectorId }));
  }, []);

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

  const connectorsForSelectedType = useMemo(() => {
    const list = connectors.filter(c => c.actionTypeId === formConfig.connectorTypeId);
    return list;
  }, [connectors, formConfig.connectorTypeId]);

  const connectorOptions = useMemo(
    () => toConnectorOptions(connectorsForSelectedType),
    [connectorsForSelectedType]
  );

  const selectedConnectorType = useMemo(
    () => connectorTypes.find((t) => t.id === formConfig.connectorTypeId),
    [connectorTypes, formConfig.connectorTypeId]
  );

  const selectedConnector = useMemo(
    () => connectors.find((c) => c.id === formConfig.connectorId),
    [connectors, formConfig.connectorId]
  );

  const templateVariables = useMemo(
    () => getTemplateVariables(formConfig.documentTemplate),
    [formConfig.documentTemplate]
  );

  const fieldKeys = useMemo(() => {
    return formConfig.fields
      .map((field) => field.key.trim())
      .filter((key) => key.length > 0);
  }, [formConfig.fields]);

  const missingTemplateVariables = useMemo(() => {
    if (templateVariables.length === 0) return [] as string[];
    const definedKeys = new Set(fieldKeys);
    return templateVariables.filter((variable) => !definedKeys.has(variable));
  }, [fieldKeys, templateVariables]);

  const unusedTemplateFields = useMemo(() => {
    if (fieldKeys.length === 0) return [] as Array<{ key: string; label: string }>;
    const usedVariables = new Set(templateVariables);
    return formConfig.fields
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
  }, [formConfig.fields, templateVariables, fieldKeys]);

  const isSubmitDisabled = useMemo(
    () =>
      formConfig.fields.some(
        (field) => field.required && !(fieldValues[field.id]?.trim())
      ),
    [formConfig.fields, fieldValues]
  );

  const renderedPayload = useMemo(() => {
    const valueMap = formConfig.fields.reduce<Record<string, string>>((acc, field) => {
      if (field.key) {
        acc[field.key.trim()] = fieldValues[field.id] ?? '';
      }
      return acc;
    }, {});

    return formConfig.documentTemplate.replace(/{{\s*([^{}\s]+)\s*}}/g, (_, variable: string) => {
      const trimmed = variable.trim();
      return valueMap[trimmed] ?? '';
    });
  }, [formConfig.documentTemplate, formConfig.fields, fieldValues]);

  const isSaveDisabled = missingTemplateVariables.length > 0;

  const handleTestSubmission = useCallback(() => {
    // TODO: wire connector execution
    console.log('Test submission triggered', {
      connectorTypeId: formConfig.connectorTypeId,
      connectorId: formConfig.connectorId,
      payload: renderedPayload,
      fields: formConfig.fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.id] = fieldValues[field.id] ?? '';
        return acc;
      }, {}),
    });
  }, [formConfig.connectorId, formConfig.connectorTypeId, formConfig.fields, fieldValues, renderedPayload]);

  return (
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
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <InfoPanel
                selectedConnectorType={selectedConnectorType}
                selectedConnector={selectedConnector}
                payloadPreview={renderedPayload}
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
            onConnectorTypeChange={handleConnectorTypeChange}
            onConnectorChange={handleConnectorChange}
            onTemplateChange={(v) => updateConfig({ documentTemplate: v })}
            onFieldChange={updateField}
            onFieldRemove={removeField}
            onAddField={addField}
            onSave={handleSaveVisualization}
            connectorTypeOptions={connectorTypeOptions}
            connectorOptions={connectorOptions}
            isLoadingConnectorTypes={isLoadingConnectorTypes}
            isLoadingConnectors={isLoadingConnectors}
            connectorTypesError={connectorTypesError}
            connectorsError={connectorsError}
            missingTemplateVariables={missingTemplateVariables}
            unusedTemplateFields={unusedTemplateFields}
            isSaveDisabled={isSaveDisabled}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
  );
};

interface ConfigurationPanelProps {
  config: FormConfig;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onShowTitleChange: (value: boolean) => void;
  onShowDescriptionChange: (value: boolean) => void;
  onConnectorTypeChange: (value: string) => void;
  onConnectorChange: (value: string) => void;
  onTemplateChange: (value: string) => void;
  onFieldChange: (fieldId: string, changes: Partial<FormFieldConfig>) => void;
  onFieldRemove: (fieldId: string) => void;
  onAddField: () => void;
  onSave: () => void;
  connectorTypeOptions: Array<{ value: string; text: string }>;
  connectorOptions: Array<{ value: string; text: string }>;
  isLoadingConnectorTypes: boolean;
  isLoadingConnectors: boolean;
  connectorTypesError: string | null;
  connectorsError: string | null;
  missingTemplateVariables: string[];
  unusedTemplateFields: Array<{ key: string; label: string }>;
  isSaveDisabled: boolean;
}

type ConfigurationTab = 'general' | 'connectors' | 'fields' | 'payload';

const ConfigurationPanel = ({
  config,
  onTitleChange,
  onDescriptionChange,
  onShowTitleChange,
  onShowDescriptionChange,
  onConnectorTypeChange,
  onConnectorChange,
  onTemplateChange,
  onFieldChange,
  onFieldRemove,
  onAddField,
  onSave,
  connectorTypeOptions,
  connectorOptions,
  isLoadingConnectorTypes,
  isLoadingConnectors,
  connectorTypesError,
  connectorsError,
  missingTemplateVariables,
  unusedTemplateFields,
  isSaveDisabled,
}: ConfigurationPanelProps) => {
  const [activeTab, setActiveTab] = useState<ConfigurationTab>('general');

  const shouldShowConnectorWarning =
    !isLoadingConnectors && !!config.connectorTypeId && connectorOptions.length === 0;

  const hasMissingTemplateVariables = missingTemplateVariables.length > 0;

  const tabs: Array<{ id: ConfigurationTab; label: string }> = [
    {
      id: 'general',
      label: i18n.translate('customizableForm.builder.configurationTab.general', {
        defaultMessage: 'General',
      }),
    },
    {
      id: 'connectors',
      label: i18n.translate('customizableForm.builder.configurationTab.connectors', {
        defaultMessage: 'Connectors',
      }),
    },
    {
      id: 'fields',
      label: i18n.translate('customizableForm.builder.configurationTab.fields', {
        defaultMessage: 'Fields',
      }),
    },
    {
      id: 'payload',
      label: i18n.translate('customizableForm.builder.configurationTab.payload', {
        defaultMessage: 'Payload Template',
      }),
    },
  ];

  return (
    <EuiPanel paddingSize="m" hasShadow hasBorder={false}>
      <PanelHeader
        title={i18n.translate('customizableForm.builder.configurationPanelTitleText', {
          defaultMessage: 'Configuration',
        })}
      />

      <EuiTabs>
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </EuiTab>
        ))}
      </EuiTabs>

      <EuiSpacer size="m" />

      {activeTab === 'general' ? (
        <EuiForm component="div">
          <EuiFormRow
            label={i18n.translate('customizableForm.builder.showTitleToggleLabel', {
              defaultMessage: 'Show form title',
            })}
            display="columnCompressed"
            hasChildLabel={false}
          >
            <EuiSwitch
              label={i18n.translate('customizableForm.builder.showTitleToggleSwitch', {
                defaultMessage: 'Display title in preview',
              })}
              checked={config.showTitle}
              onChange={(event) => onShowTitleChange(event.target.checked)}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('customizableForm.builder.formTitleLabel', {
              defaultMessage: 'Form title',
            })}
          >
            <EuiFieldText
              aria-label={i18n.translate('customizableForm.builder.formTitleAria', {
                defaultMessage: 'Form title',
              })}
              value={config.title}
              disabled={!config.showTitle}
              onChange={(e) => onTitleChange(e.target.value)}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('customizableForm.builder.showDescriptionToggleLabel', {
              defaultMessage: 'Show description',
            })}
            display="columnCompressed"
            hasChildLabel={false}
          >
            <EuiSwitch
              label={i18n.translate('customizableForm.builder.showDescriptionToggleSwitch', {
                defaultMessage: 'Display description in preview',
              })}
              checked={config.showDescription}
              onChange={(event) => onShowDescriptionChange(event.target.checked)}
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('customizableForm.builder.formDescriptionLabel', {
              defaultMessage: 'Description',
            })}
          >
            <EuiTextArea
              resize="vertical"
              value={config.description}
              disabled={!config.showDescription}
              onChange={(e) => onDescriptionChange(e.target.value)}
              aria-label={i18n.translate('customizableForm.builder.formDescriptionAria', {
                defaultMessage: 'Form description',
              })}
            />
          </EuiFormRow>
        </EuiForm>
      ) : null}

      {activeTab === 'connectors' ? (
        <>
          {connectorTypesError ? (
            <>
              <EuiCallOut
                color="danger"
                iconType="warning"
                title={i18n.translate('customizableForm.builder.connectorTypesErrorTitle', {
                  defaultMessage: 'Connector types unavailable',
                })}
              >
                <p>{connectorTypesError}</p>
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          ) : null}

          {connectorsError ? (
            <>
              <EuiCallOut
                color="danger"
                iconType="warning"
                title={i18n.translate('customizableForm.builder.connectorsErrorTitle', {
                  defaultMessage: 'Connectors unavailable',
                })}
              >
                <p>{connectorsError}</p>
              </EuiCallOut>
              <EuiSpacer size="m" />
            </>
          ) : null}

          <EuiForm component="div">
            <EuiFormRow
              label={i18n.translate('customizableForm.builder.connectorTypeLabel', {
                defaultMessage: 'Connector type',
              })}
              helpText={i18n.translate('customizableForm.builder.connectorTypeHelpText', {
                defaultMessage: 'Only supported connector types are listed.',
              })}
            >
              <EuiSelect
                options={[
                  {
                    value: '',
                    text: i18n.translate('customizableForm.builder.selectConnectorTypePlaceholder', {
                      defaultMessage: 'Select a connector type',
                    }),
                  },
                  ...connectorTypeOptions,
                ]}
                value={config.connectorTypeId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  onConnectorTypeChange(e.target.value)
                }
                disabled={isLoadingConnectorTypes || connectorTypeOptions.length === 0}
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('customizableForm.builder.connectorLabel', {
                defaultMessage: 'Connector',
              })}
              helpText={i18n.translate('customizableForm.builder.connectorHelpText', {
                defaultMessage:
                  'Choose an existing connector for the selected type. Configure connectors from Stack Management if none are available.',
              })}
            >
              <EuiSelect
                options={[
                  {
                    value: '',
                    text: i18n.translate('customizableForm.builder.selectConnectorPlaceholder', {
                      defaultMessage: 'Select a connector',
                    }),
                  },
                  ...connectorOptions,
                ]}
                value={config.connectorId}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  onConnectorChange(e.target.value)
                }
                disabled={
                  isLoadingConnectors || !config.connectorTypeId || connectorOptions.length === 0
                }
              />
            </EuiFormRow>

            {shouldShowConnectorWarning ? (
              <>
                <EuiCallOut
                  color="warning"
                  iconType="iInCircle"
                  size="s"
                  title={i18n.translate('customizableForm.builder.noConnectorsWarningTitle', {
                    defaultMessage: 'No connectors found',
                  })}
                >
                  <p>
                    {i18n.translate('customizableForm.builder.noConnectorsWarningBody', {
                      defaultMessage: 'Create a connector of this type to enable submissions.',
                    })}
                  </p>
                </EuiCallOut>
                <EuiSpacer size="m" />
              </>
            ) : null}
          </EuiForm>
        </>
      ) : null}

      {activeTab === 'fields' ? (
        <>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('customizableForm.builder.fieldSectionTitle', {
                defaultMessage: 'Fields',
              })}
            </h3>
          </EuiTitle>

          <EuiSpacer size="s" />

          {config.fields.map((field, index) => (
            <EuiAccordion
              id={field.id}
              key={field.id}
              buttonContent={
                field.label ||
                i18n.translate('customizableForm.builder.fieldFallbackLabel', {
                  defaultMessage: 'Field {number}',
                  values: { number: index + 1 },
                })
              }
              paddingSize="s"
              initialIsOpen={index === 0}
              extraAction={
                <EuiToolTip
                  content={i18n.translate('customizableForm.builder.removeFieldTooltip', {
                    defaultMessage: 'Remove field',
                  })}
                >
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    aria-label={i18n.translate('customizableForm.builder.removeFieldAriaLabel', {
                      defaultMessage: 'Remove field {label}',
                      values: { label: field.label || index + 1 },
                    })}
                    onClick={() => onFieldRemove(field.id)}
                  />
                </EuiToolTip>
              }
            >
              <EuiSpacer size="s" />

              <EuiFormRow
                label={i18n.translate('customizableForm.builder.fieldLabelLabel', {
                  defaultMessage: 'Label',
                })}
              >
                <EuiFieldText
                  value={field.label}
                  onChange={(e) => onFieldChange(field.id, { label: e.target.value })}
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('customizableForm.builder.fieldKeyLabel', {
                  defaultMessage: 'Variable name',
                })}
                helpText={i18n.translate('customizableForm.builder.fieldKeyHelpText', {
                  defaultMessage: 'Used in the connector template as {example}.',
                  values: { example: '{{variable_name}}' },
                })}
              >
                <EuiFieldText
                  value={field.key}
                  onChange={(e) => onFieldChange(field.id, { key: e.target.value })}
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('customizableForm.builder.fieldPlaceholderLabel', {
                  defaultMessage: 'Placeholder',
                })}
              >
                <EuiFieldText
                  value={field.placeholder ?? ''}
                  onChange={(e) => onFieldChange(field.id, { placeholder: e.target.value })}
                />
              </EuiFormRow>

              <EuiFormRow
                label={i18n.translate('customizableForm.builder.fieldTypeLabel', {
                  defaultMessage: 'Input type',
                })}
              >
                <EuiSelect
                  options={[
                    {
                      value: 'text',
                      text: i18n.translate('customizableForm.builder.fieldType.text', {
                        defaultMessage: 'Single line text',
                      }),
                    },
                    {
                      value: 'textarea',
                      text: i18n.translate('customizableForm.builder.fieldType.textarea', {
                        defaultMessage: 'Multiline text',
                      }),
                    },
                  ]}
                  value={field.type}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                    onFieldChange(field.id, { type: e.target.value as FormFieldType })
                  }
                />
              </EuiFormRow>

              <EuiFormRow display="columnCompressed">
                <EuiSwitch
                  label={i18n.translate('customizableForm.builder.fieldRequiredLabel', {
                    defaultMessage: 'Required',
                  })}
                  checked={field.required}
                  onChange={(e) => onFieldChange(field.id, { required: e.target.checked })}
                />
              </EuiFormRow>

              <EuiSpacer size="m" />
            </EuiAccordion>
          ))}

          <EuiSpacer size="s" />

          <EuiButton iconType="plusInCircle" onClick={onAddField} size="s">
            {i18n.translate('customizableForm.builder.addFieldButton', {
              defaultMessage: 'Add field',
            })}
          </EuiButton>
        </>
      ) : null}

      {activeTab === 'payload' ? (
        <>
          <EuiTitle size="xs">
            <h3>
              {i18n.translate('customizableForm.builder.templateSectionTitle', {
                defaultMessage: 'Connector payload template',
              })}
            </h3>
          </EuiTitle>

          <EuiSpacer size="s" />

          <EuiForm component="div">
            <EuiFormRow
              label={i18n.translate('customizableForm.builder.templateLabel', {
                defaultMessage: 'Document to index',
              })}
              helpText={i18n.translate('customizableForm.builder.templateHelpText', {
                defaultMessage:
                  'Use the variables defined above to compose a valid JSON document. Example: {example}.',
                values: { example: '{{message}}' },
              })}
            >
              <EuiTextArea
                resize="vertical"
                value={config.documentTemplate}
                onChange={(e) => onTemplateChange(e.target.value)}
                aria-label={i18n.translate('customizableForm.builder.templateAriaLabel', {
                  defaultMessage: 'Connector payload template',
                })}
                rows={10}
              />
            </EuiFormRow>
          </EuiForm>

          {hasMissingTemplateVariables ? (
            <>
              <EuiSpacer size="s" />
              <EuiText color="danger" size="s">
                {i18n.translate('customizableForm.builder.templateMissingVariablesLabel', {
                  defaultMessage:
                    'The template references variables without matching fields: {variables}.',
                  values: {
                    variables: missingTemplateVariables.join(', '),
                  },
                })}
              </EuiText>
            </>
          ) : null}

          {!hasMissingTemplateVariables && unusedTemplateFields.length > 0 ? (
            <>
              <EuiSpacer size="s" />
              <EuiText color="warning" size="s">
                {i18n.translate('customizableForm.builder.templateUnusedFieldsWarning', {
                  defaultMessage: 'These fields are not used in the template: {fields}.',
                  values: {
                    fields: unusedTemplateFields.map((field) => field.label).join(', '),
                  },
                })}
              </EuiText>
            </>
          ) : null}
        </>
      ) : null}

      <EuiSpacer size="l" />

      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton fill iconType="save" onClick={onSave} disabled={isSaveDisabled}>
            {i18n.translate('customizableForm.builder.saveVisualizationButton', {
              defaultMessage: 'Save Visualization',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

interface InfoPanelProps {
  selectedConnectorType?: ActionType & { id: SupportedConnectorTypeId };
  selectedConnector?: ActionConnector & { actionTypeId: SupportedConnectorTypeId };
  payloadPreview: string;
}

const InfoPanel = ({ selectedConnectorType, selectedConnector, payloadPreview }: InfoPanelProps) => {
  const connectorName = selectedConnector
    ? selectedConnector.name
    : i18n.translate('customizableForm.builder.infoPanel.noConnector', {
        defaultMessage: 'No connector selected',
      });
  const connectorTypeLabel = selectedConnectorType?.name ?? selectedConnector?.actionTypeId ?? '—';

  return (
    <EuiPanel paddingSize="m" hasShadow hasBorder={false}>
      <PanelHeader
        title={i18n.translate('customizableForm.builder.infoPanelTitle', {
          defaultMessage: 'Info',
        })}
      />

      <section>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('customizableForm.builder.infoPanel.summaryTitle', {
              defaultMessage: 'Connectors Summary',
            })}
          </h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        <div
          style={{
            border: '1px solid #d3dae6',
            borderRadius: 4,
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <EuiText size="s">
            <strong>
              {i18n.translate('customizableForm.builder.infoPanel.connectorLabel', {
                defaultMessage: 'Connector: ',
              })}
            </strong>
            {connectorName}
          </EuiText>
        <EuiText size="s">
          <strong>
            {i18n.translate('customizableForm.builder.infoPanel.typeLabel', {
              defaultMessage: 'Type: ',
            })}
          </strong>
          {connectorTypeLabel}
        </EuiText>
      </div>
    </section>

    <EuiSpacer size="m" />

    <hr style={{ border: 'none', borderTop: '1px solid #d3dae6', margin: '8px 0 16px' }} />

      <section>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('customizableForm.builder.infoPanel.payloadTitle', {
              defaultMessage: 'Payload Preview',
            })}
          </h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        <EuiCodeBlock language="json" isCopyable>
          {payloadPreview}
        </EuiCodeBlock>
      </section>
    </EuiPanel>
  );
};

const PreviewContent = ({
  config,
  fieldValues,
  onFieldValueChange,
  isSubmitDisabled,
  onSubmit,
}: PreviewContentProps) => {
  const hasFields = config.fields.length > 0;
  const title = config.title?.trim()
    ? config.title
    : i18n.translate('customizableForm.builder.previewFallbackTitle', {
        defaultMessage: 'Untitled form',
      });

  const description = config.description?.trim()
    ? config.description
    : i18n.translate('customizableForm.builder.previewFallbackDescription', {
        defaultMessage:
          'Use the configuration panel to add fields, choose a connector and craft the payload.',
      });

  const showTitle = config.showTitle !== false;
  const showDescription = config.showDescription !== false;

  return (
    <>
      {showTitle ? (
        <EuiTitle size="l">
          <h1>{title}</h1>
        </EuiTitle>
      ) : null}

      {showDescription ? (
        <EuiText color="subdued">
          <p>{description}</p>
        </EuiText>
      ) : null}

      {showTitle || showDescription ? <EuiSpacer size="m" /> : <EuiSpacer size="s" />}

      {hasFields ? (
        <EuiForm component="form" onSubmit={(event) => event.preventDefault()}>
          {config.fields.map((field) => (
            <EuiFormRow
              key={field.id}
              label={field.label || field.key}
              labelAppend={
                <EuiText size="xs" color="subdued">
                  {field.required
                    ? i18n.translate('customizableForm.builder.previewFieldRequiredLabel', {
                        defaultMessage: 'Required',
                      })
                    : i18n.translate('customizableForm.builder.previewFieldOptionalLabel', {
                        defaultMessage: 'Optional',
                      })}
                </EuiText>
              }
              helpText={
                field.key
                  ? i18n.translate('customizableForm.builder.previewVariableInfo', {
                      defaultMessage: 'Variable: {variable}',
                      values: { variable: `{{${field.key}}}` },
                    })
                  : undefined
              }
            >
              {field.type === 'textarea' ? (
                <EuiTextArea
                  placeholder={field.placeholder}
                  aria-label={field.label || field.key}
                  value={fieldValues[field.id] ?? ''}
                  onChange={(event) => onFieldValueChange(field.id, event.target.value)}
                />
              ) : (
                <EuiFieldText
                  placeholder={field.placeholder}
                  aria-label={field.label || field.key}
                  value={fieldValues[field.id] ?? ''}
                  onChange={(event) => onFieldValueChange(field.id, event.target.value)}
                />
              )}
            </EuiFormRow>
          ))}

          <EuiSpacer size="m" />

          <EuiButton fill iconType="play" onClick={onSubmit} disabled={isSubmitDisabled}>
            {i18n.translate('customizableForm.builder.previewSubmitButton', {
              defaultMessage: 'Submit',
            })}
          </EuiButton>
        </EuiForm>
      ) : (
        <EuiEmptyPrompt
          iconType="controlsHorizontal"
          title={
            <h3>
              {i18n.translate('customizableForm.builder.previewEmptyStateTitle', {
                defaultMessage: 'Add fields to build the form',
              })}
            </h3>
          }
          body={i18n.translate('customizableForm.builder.previewEmptyStateBody', {
            defaultMessage:
              'Use the configuration panel to add at least one input. The preview updates automatically.',
          })}
        />
      )}
    </>
  );
};

export default CustomizableFormBuilder;

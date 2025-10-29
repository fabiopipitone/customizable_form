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
import { css } from '@emotion/react';
import { loadActionTypes, loadAllActions } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { ActionType } from '@kbn/actions-types';
import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';

import {
  FormConfig,
  FormFieldConfig,
  FormFieldType,
  FormConnectorConfig,
  SupportedConnectorTypeId,
} from './types';

interface CustomizableFormBuilderProps {
  notifications: NotificationsStart;
  http: CoreStart['http'];
}

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

const INITIAL_CONNECTORS: FormConnectorConfig[] = [
  {
    id: 'connector-1',
    connectorTypeId: '',
    connectorId: '',
    documentTemplate: DEFAULT_TEMPLATE,
  },
];

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

const previewInputPlaceholderStyles = css`
  ::placeholder {
    font-style: italic;
  }
`;

export const CustomizableFormBuilder = ({ notifications, http }: CustomizableFormBuilderProps) => {
  const [formConfig, setFormConfig] = useState<FormConfig>(INITIAL_CONFIG);
  const fieldCounter = useRef<number>(INITIAL_CONFIG.fields.length);
  const connectorCounter = useRef<number>(INITIAL_CONFIG.connectors.length);

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

  useEffect(() => {
    setFormConfig((prev) => {
      if (prev.connectors.length === 0) {
        return prev;
      }

      const validTypeIds = new Set<SupportedConnectorTypeId>(connectorTypes.map((type) => type.id));
      let hasChanges = false;

      const nextConnectors = prev.connectors.map((connectorConfig) => {
        let nextTypeId = connectorConfig.connectorTypeId as SupportedConnectorTypeId | '';
        const currentTypeIsValid =
          nextTypeId !== '' ? validTypeIds.has(nextTypeId as SupportedConnectorTypeId) : false;
        if (!currentTypeIsValid) {
          nextTypeId = connectorTypes[0]?.id ?? '';
        }

        const connectorsForType = nextTypeId
          ? connectors.filter((connector) => connector.actionTypeId === nextTypeId)
          : [];

        let nextConnectorId = connectorConfig.connectorId;
        const connectorIsValid = nextConnectorId
          ? connectorsForType.some((connector) => connector.id === nextConnectorId)
          : false;

        if (!connectorIsValid) {
          nextConnectorId = connectorsForType[0]?.id ?? '';
        }

        if (
          nextTypeId !== connectorConfig.connectorTypeId ||
          nextConnectorId !== connectorConfig.connectorId
        ) {
          hasChanges = true;
          return {
            ...connectorConfig,
            connectorTypeId: nextTypeId,
            connectorId: nextConnectorId,
          };
        }

        return connectorConfig;
      });

      if (!hasChanges) {
        return prev;
      }

      return {
        ...prev,
        connectors: nextConnectors,
      };
    });
  }, [connectorTypes, connectors]);

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

  const addConnector = useCallback(() => {
    connectorCounter.current += 1;
    const index = connectorCounter.current;
    const defaultTypeId = connectorTypes[0]?.id ?? '';
    const connectorsForType = defaultTypeId
      ? connectors.filter((connector) => connector.actionTypeId === defaultTypeId)
      : [];
    const defaultConnectorId = connectorsForType[0]?.id ?? '';

    const newConnector: FormConnectorConfig = {
      id: `connector-${index}`,
      connectorTypeId: defaultTypeId,
      connectorId: defaultConnectorId,
      documentTemplate: DEFAULT_TEMPLATE,
    };

    setFormConfig((prev) => ({
      ...prev,
      connectors: [...prev.connectors, newConnector],
    }));
  }, [connectorTypes, connectors]);

  const removeConnector = useCallback((connectorConfigId: string) => {
    setFormConfig((prev) => ({
      ...prev,
      connectors: prev.connectors.filter((item) => item.id !== connectorConfigId),
    }));
  }, []);

  const handleConnectorTypeChange = useCallback(
    (connectorConfigId: string, nextTypeId: string) => {
      const canonicalNextTypeId = getCanonicalConnectorTypeId(nextTypeId) ?? '';
      setFormConfig((prev) => ({
        ...prev,
        connectors: prev.connectors.map((item) => {
          if (item.id !== connectorConfigId) {
            return item;
          }
          if (item.connectorTypeId === canonicalNextTypeId) {
            return item;
          }
          const connectorsForType = canonicalNextTypeId
            ? connectors.filter((c) => c.actionTypeId === canonicalNextTypeId)
            : [];
          return {
            ...item,
            connectorTypeId: canonicalNextTypeId,
            connectorId: connectorsForType[0]?.id ?? '',
          };
        }),
      }));
    },
    [connectors]
  );

  const handleConnectorChange = useCallback((connectorConfigId: string, nextConnectorId: string) => {
    setFormConfig((prev) => ({
      ...prev,
      connectors: prev.connectors.map((item) =>
        item.id === connectorConfigId ? { ...item, connectorId: nextConnectorId } : item
      ),
    }));
  }, []);

  const handleConnectorTemplateChange = useCallback(
    (connectorConfigId: string, template: string) => {
      setFormConfig((prev) => ({
        ...prev,
        connectors: prev.connectors.map((item) =>
          item.id === connectorConfigId ? { ...item, documentTemplate: template } : item
        ),
      }));
    },
    []
  );

  const handleSaveVisualization = useCallback(() => {
    // TODO: replace with Kibana save modal integration
    console.log('Save visualization requested', formConfig);
  }, [formConfig]);

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

  const isSubmitDisabled = useMemo(
    () =>
      formConfig.fields.some(
        (field) => field.required && !(fieldValues[field.id]?.trim())
      ),
    [formConfig.fields, fieldValues]
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

  const isSaveDisabled = useMemo(
    () =>
      formConfig.connectors.some(
        (connectorConfig) =>
          (templateValidationByConnector[connectorConfig.id]?.missing.length ?? 0) > 0
      ),
    [formConfig.connectors, templateValidationByConnector]
  );

  const connectorSummaries = useMemo(
    () =>
      formConfig.connectors.map((connectorConfig) => ({
        config: connectorConfig,
        type: connectorTypes.find((type) => type.id === connectorConfig.connectorTypeId) ?? null,
        connector:
          connectors.find((connectorInstance) => connectorInstance.id === connectorConfig.connectorId) ??
          null,
      })),
    [formConfig.connectors, connectorTypes, connectors]
  );

  const handleTestSubmission = useCallback(() => {
    // TODO: wire connector execution
    console.log('Test submission triggered', {
      connectors: formConfig.connectors.map((connectorConfig) => ({
        connectorTypeId: connectorConfig.connectorTypeId,
        connectorId: connectorConfig.connectorId,
        payload: renderedPayloads[connectorConfig.id] ?? '',
      })),
      fields: formConfig.fields.reduce<Record<string, string>>((acc, field) => {
        acc[field.id] = fieldValues[field.id] ?? '';
        return acc;
      }, {}),
    });
  }, [formConfig.connectors, formConfig.fields, fieldValues, renderedPayloads]);

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
                connectorSummaries={connectorSummaries}
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
            onConnectorTypeChange={handleConnectorTypeChange}
            onConnectorChange={handleConnectorChange}
            onConnectorTemplateChange={handleConnectorTemplateChange}
            onConnectorAdd={addConnector}
            onConnectorRemove={removeConnector}
            onFieldChange={updateField}
            onFieldRemove={removeField}
            onAddField={addField}
            onSave={handleSaveVisualization}
            connectorTypeOptions={connectorTypeOptions}
            connectorTypes={connectorTypes}
            connectorsByType={connectorsByType}
            templateValidationByConnector={templateValidationByConnector}
            isLoadingConnectorTypes={isLoadingConnectorTypes}
            isLoadingConnectors={isLoadingConnectors}
            connectorTypesError={connectorTypesError}
            connectorsError={connectorsError}
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
  onConnectorTypeChange: (connectorConfigId: string, value: string) => void;
  onConnectorChange: (connectorConfigId: string, value: string) => void;
  onConnectorTemplateChange: (connectorConfigId: string, value: string) => void;
  onConnectorAdd: () => void;
  onConnectorRemove: (connectorConfigId: string) => void;
  onFieldChange: (fieldId: string, changes: Partial<FormFieldConfig>) => void;
  onFieldRemove: (fieldId: string) => void;
  onAddField: () => void;
  onSave: () => void;
  connectorTypeOptions: Array<{ value: string; text: string }>;
  connectorTypes: Array<ActionType & { id: SupportedConnectorTypeId }>;
  connectorsByType: Record<string, Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>>;
  templateValidationByConnector: Record<string, { missing: string[]; unused: Array<{ key: string; label: string }> }>;
  isLoadingConnectorTypes: boolean;
  isLoadingConnectors: boolean;
  connectorTypesError: string | null;
  connectorsError: string | null;
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
  onConnectorTemplateChange,
  onConnectorAdd,
  onConnectorRemove,
  onFieldChange,
  onFieldRemove,
  onAddField,
  onSave,
  connectorTypeOptions,
  connectorTypes,
  connectorsByType,
  templateValidationByConnector,
  isLoadingConnectorTypes,
  isLoadingConnectors,
  connectorTypesError,
  connectorsError,
  isSaveDisabled,
}: ConfigurationPanelProps) => {
  const [activeTab, setActiveTab] = useState<ConfigurationTab>('general');

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
        defaultMessage: 'Payload Templates',
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

          {config.connectors.length === 0 ? (
            <EuiEmptyPrompt
              iconType="plug"
              title={
                <h3>
                  {i18n.translate('customizableForm.builder.connectorsEmptyStateTitle', {
                    defaultMessage: 'No connectors configured',
                  })}
                </h3>
              }
              body={i18n.translate('customizableForm.builder.connectorsEmptyStateBody', {
                defaultMessage: 'Add at least one connector to deliver the payload.',
              })}
            />
          ) : (
            config.connectors.map((connectorConfig, index) => {
              const connectorsForType = connectorConfig.connectorTypeId
                ? connectorsByType[connectorConfig.connectorTypeId] ?? []
                : [];

              const connectorSelectOptions = [
                {
                  value: '',
                  text: i18n.translate('customizableForm.builder.selectConnectorPlaceholder', {
                    defaultMessage: 'Select a connector',
                  }),
                },
                ...toConnectorOptions(connectorsForType),
              ];

              const connectorTypeSelectOptions = [
                {
                  value: '',
                  text: i18n.translate('customizableForm.builder.selectConnectorTypePlaceholder', {
                    defaultMessage: 'Select a connector type',
                  }),
                },
                ...connectorTypeOptions,
              ];

              const selectedType = connectorTypes.find(
                (type) => type.id === connectorConfig.connectorTypeId
              );
              const selectedConnectorInstance = connectorsForType.find(
                (item) => item.id === connectorConfig.connectorId
              );

              const accordionLabel =
                selectedConnectorInstance?.name ||
                selectedType?.name ||
                i18n.translate('customizableForm.builder.connectorSectionFallbackTitle', {
                  defaultMessage: 'Connector {number}',
                  values: { number: index + 1 },
                });

              const shouldShowConnectorWarning =
                !isLoadingConnectors &&
                !!connectorConfig.connectorTypeId &&
                connectorsForType.length === 0;

              return (
                <React.Fragment key={connectorConfig.id}>
                  <EuiAccordion
                    id={connectorConfig.id}
                    buttonContent={accordionLabel}
                    paddingSize="s"
                    initialIsOpen={index === 0}
                    extraAction={
                      <EuiToolTip
                        content={i18n.translate('customizableForm.builder.removeConnectorTooltip', {
                          defaultMessage: 'Remove connector',
                        })}
                      >
                        <EuiButtonIcon
                          iconType="trash"
                          color="danger"
                          aria-label={i18n.translate(
                            'customizableForm.builder.removeConnectorAriaLabel',
                            {
                              defaultMessage: 'Remove connector {number}',
                              values: { number: index + 1 },
                            }
                          )}
                          onClick={() => onConnectorRemove(connectorConfig.id)}
                        />
                      </EuiToolTip>
                    }
                  >
                    <EuiSpacer size="s" />

                    <EuiFormRow
                      label={i18n.translate('customizableForm.builder.connectorTypeLabel', {
                        defaultMessage: 'Connector type',
                      })}
                      helpText={i18n.translate('customizableForm.builder.connectorTypeHelpText', {
                        defaultMessage: 'Only supported connector types are listed.',
                      })}
                    >
                      <EuiSelect
                        options={connectorTypeSelectOptions}
                        value={connectorConfig.connectorTypeId}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                          onConnectorTypeChange(connectorConfig.id, event.target.value)
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
                        options={connectorSelectOptions}
                        value={connectorConfig.connectorId}
                        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                          onConnectorChange(connectorConfig.id, event.target.value)
                        }
                        disabled={
                          isLoadingConnectors ||
                          !connectorConfig.connectorTypeId ||
                          connectorSelectOptions.length <= 1
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
                  </EuiAccordion>

                  <EuiSpacer size="m" />
                </React.Fragment>
              );
            })
          )}

          <EuiButton iconType="plusInCircle" onClick={onConnectorAdd} size="s">
            {i18n.translate('customizableForm.builder.addConnectorButton', {
              defaultMessage: 'Add connector',
            })}
          </EuiButton>
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
                defaultMessage: 'Payload templates',
              })}
            </h3>
          </EuiTitle>

          <EuiSpacer size="s" />

          {config.connectors.length === 0 ? (
            <EuiEmptyPrompt
              iconType="indexOpen"
              title={
                <h3>
                  {i18n.translate('customizableForm.builder.payloadEmptyStateTitle', {
                    defaultMessage: 'No payloads to configure',
                  })}
                </h3>
              }
              body={i18n.translate('customizableForm.builder.payloadEmptyStateBody', {
                defaultMessage: 'Add a connector to define its payload template.',
              })}
            />
          ) : (
            config.connectors.map((connectorConfig, index) => {
              const validation = templateValidationByConnector[connectorConfig.id] ?? {
                missing: [],
                unused: [],
              };

              const connectorsForType = connectorConfig.connectorTypeId
                ? connectorsByType[connectorConfig.connectorTypeId] ?? []
                : [];

              const selectedType = connectorTypes.find(
                (type) => type.id === connectorConfig.connectorTypeId
              );
              const selectedConnectorInstance = connectorsForType.find(
                (item) => item.id === connectorConfig.connectorId
              );

              const accordionLabel =
                selectedConnectorInstance?.name ||
                selectedType?.name ||
                i18n.translate('customizableForm.builder.payloadSectionFallbackTitle', {
                  defaultMessage: 'Payload {number}',
                  values: { number: index + 1 },
                });

              return (
                <React.Fragment key={`payload-${connectorConfig.id}`}>
                  <EuiAccordion
                    id={`payload-${connectorConfig.id}`}
                    buttonContent={accordionLabel}
                    paddingSize="s"
                    initialIsOpen={index === 0}
                  >
                    <EuiSpacer size="s" />

                    <EuiFormRow
                      label={i18n.translate('customizableForm.builder.templateLabel', {
                        defaultMessage: 'Document to send',
                      })}
                      helpText={i18n.translate('customizableForm.builder.templateHelpText', {
                        defaultMessage:
                          'Use the variables defined above to compose a valid JSON document. Example: {example}.',
                        values: { example: '{{message}}' },
                      })}
                    >
                      <EuiTextArea
                        resize="vertical"
                        value={connectorConfig.documentTemplate}
                        onChange={(e) =>
                          onConnectorTemplateChange(connectorConfig.id, e.target.value)
                        }
                        aria-label={i18n.translate('customizableForm.builder.templateAriaLabel', {
                          defaultMessage: 'Connector payload template',
                        })}
                        rows={10}
                      />
                    </EuiFormRow>

                    {validation.missing.length > 0 ? (
                      <EuiText color="danger" size="s">
                        {i18n.translate('customizableForm.builder.templateMissingVariablesLabel', {
                          defaultMessage:
                            'The template references variables without matching fields: {variables}.',
                          values: { variables: validation.missing.join(', ') },
                        })}
                      </EuiText>
                    ) : null}

                    {validation.missing.length === 0 && validation.unused.length > 0 ? (
                      <EuiText color="warning" size="s">
                        {i18n.translate('customizableForm.builder.templateUnusedFieldsWarning', {
                          defaultMessage: 'These fields are not used in the template: {fields}.',
                          values: {
                            fields: validation.unused.map((field) => field.label).join(', '),
                          },
                        })}
                      </EuiText>
                    ) : null}
                  </EuiAccordion>

                  <EuiSpacer size="m" />
                </React.Fragment>
              );
            })
          )}
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
  connectorSummaries: Array<{
    config: FormConnectorConfig;
    type: ActionType & { id: SupportedConnectorTypeId } | null;
    connector: ActionConnector & { actionTypeId: SupportedConnectorTypeId } | null;
  }>;
  renderedPayloads: Record<string, string>;
  templateValidationByConnector: Record<string, { missing: string[]; unused: Array<{ key: string; label: string }> }>;
}

const InfoPanel = ({ connectorSummaries, renderedPayloads, templateValidationByConnector }: InfoPanelProps) => {
  const [activePayloadId, setActivePayloadId] = useState<string | null>(
    connectorSummaries[0]?.config.id ?? null
  );

  useEffect(() => {
    if (connectorSummaries.length === 0) {
      if (activePayloadId !== null) {
        setActivePayloadId(null);
      }
      return;
    }

    const stillExists = connectorSummaries.some((summary) => summary.config.id === activePayloadId);
    if (!stillExists) {
      setActivePayloadId(connectorSummaries[0].config.id);
    }
  }, [connectorSummaries, activePayloadId]);

  const activeValidation = activePayloadId
    ? templateValidationByConnector[activePayloadId] ?? { missing: [], unused: [] }
    : { missing: [], unused: [] };

  const activePayload = activePayloadId ? renderedPayloads[activePayloadId] ?? '' : '';

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

        {connectorSummaries.length === 0 ? (
          <EuiText size="s" color="subdued">
            {i18n.translate('customizableForm.builder.infoPanel.summaryEmpty', {
              defaultMessage: 'No connectors configured yet.',
            })}
          </EuiText>
        ) : (
          connectorSummaries.map(({ config, connector, type }, index) => (
            <React.Fragment key={`connector-summary-${config.id}`}>
              <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                <EuiFlexItem grow={1}>
                  <EuiText size="s">
                    <strong>
                      {i18n.translate('customizableForm.builder.infoPanel.connectorLabel', {
                        defaultMessage: 'Connector',
                      })}
                      {': '}
                    </strong>
                    {connector?.name ??
                      i18n.translate('customizableForm.builder.infoPanel.connectorFallback', {
                        defaultMessage: 'Unnamed connector {index}',
                        values: { index: index + 1 },
                      })}
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={1}>
                  <EuiText size="s">
                    <strong>
                      {i18n.translate('customizableForm.builder.infoPanel.typeLabel', {
                        defaultMessage: 'Type',
                      })}
                      {': '}
                    </strong>
                    {type?.name ?? connector?.actionTypeId ?? '—'}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              {index < connectorSummaries.length - 1 ? <EuiSpacer size="s" /> : null}
            </React.Fragment>
          ))
        )}
      </section>

      <EuiSpacer size="m" />

      <hr style={{ border: 'none', borderTop: '1px solid #d3dae6', margin: '8px 0 16px' }} />

      <section>
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('customizableForm.builder.infoPanel.payloadsTitle', {
              defaultMessage: 'Payloads Preview',
            })}
          </h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        {connectorSummaries.length === 0 ? (
          <EuiEmptyPrompt
            iconType="indexMapping"
            title={
              <h3>
                {i18n.translate('customizableForm.builder.infoPanel.payloadsEmptyTitle', {
                  defaultMessage: 'No payloads available',
                })}
              </h3>
            }
            body={i18n.translate('customizableForm.builder.infoPanel.payloadsEmptyBody', {
              defaultMessage: 'Configure at least one connector to preview payloads.',
            })}
          />
        ) : (
          <>
            <EuiTabs>
              {connectorSummaries.map(({ config, connector, type }, index) => {
                const label =
                  connector?.name ||
                  type?.name ||
                  i18n.translate('customizableForm.builder.infoPanel.payloadTabFallback', {
                    defaultMessage: 'Payload {index}',
                    values: { index: index + 1 },
                  });

                return (
                  <EuiTab
                    key={`payload-tab-${config.id}`}
                    isSelected={activePayloadId === config.id}
                    onClick={() => setActivePayloadId(config.id)}
                  >
                    {label}
                  </EuiTab>
                );
              })}
            </EuiTabs>

            <EuiSpacer size="m" />

            <EuiCodeBlock language="json" isCopyable>
              {activePayload}
            </EuiCodeBlock>

            {activeValidation.missing.length > 0 ? (
              <>
                <EuiSpacer size="s" />
                <EuiText color="danger" size="s">
                  {i18n.translate('customizableForm.builder.infoPanel.payloadMissingVariables', {
                    defaultMessage: 'Missing variables: {variables}.',
                    values: { variables: activeValidation.missing.join(', ') },
                  })}
                </EuiText>
              </>
            ) : null}

            {activeValidation.missing.length === 0 && activeValidation.unused.length > 0 ? (
              <>
                <EuiSpacer size="s" />
                <EuiText color="warning" size="s">
                  {i18n.translate('customizableForm.builder.infoPanel.payloadUnusedFields', {
                    defaultMessage: 'Unused fields: {fields}.',
                    values: {
                      fields: activeValidation.unused.map((field) => field.label).join(', '),
                    },
                  })}
                </EuiText>
              </>
            ) : null}
          </>
        )}
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
            >
      {field.type === 'textarea' ? (
        <EuiTextArea
          placeholder={field.placeholder}
          aria-label={field.label || field.key}
          value={fieldValues[field.id] ?? ''}
          onChange={(event) => onFieldValueChange(field.id, event.target.value)}
          css={previewInputPlaceholderStyles}
        />
      ) : (
        <EuiFieldText
          placeholder={field.placeholder}
          aria-label={field.label || field.key}
          value={fieldValues[field.id] ?? ''}
          onChange={(event) => onFieldValueChange(field.id, event.target.value)}
          css={previewInputPlaceholderStyles}
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

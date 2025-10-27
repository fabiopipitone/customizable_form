import React, { ChangeEvent, useMemo, useRef, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { NotificationsStart } from '@kbn/core/public';
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
  EuiPageTemplate,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import { FormConfig, FormFieldConfig, FormFieldType } from './types';

interface CustomizableFormBuilderProps {
  notifications: NotificationsStart;
}

const FIELD_TYPE_OPTIONS = [
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
];

const CONNECTOR_OPTIONS = [
  {
    value: 'index',
    text: i18n.translate('customizableForm.builder.connector.index', {
      defaultMessage: 'Index connector',
    }),
  },
];

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
  connectorId: CONNECTOR_OPTIONS[0].value,
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

export const CustomizableFormBuilder = ({ notifications }: CustomizableFormBuilderProps) => {
  const [formConfig, setFormConfig] = useState<FormConfig>(INITIAL_CONFIG);
  const fieldCounter = useRef<number>(INITIAL_CONFIG.fields.length);

  const updateConfig = (partial: Partial<FormConfig>) => {
    setFormConfig((prev) => ({ ...prev, ...partial }));
  };

  const updateField = (fieldId: string, changes: Partial<FormFieldConfig>) => {
    setFormConfig((prev) => ({
      ...prev,
      fields: prev.fields.map((field) => (field.id === fieldId ? { ...field, ...changes } : field)),
    }));
  };

  const removeField = (fieldId: string) => {
    setFormConfig((prev) => ({
      ...prev,
      fields: prev.fields.filter((field) => field.id !== fieldId),
    }));
  };

  const addField = () => {
    fieldCounter.current += 1;
    const newFieldNumber = fieldCounter.current;
    const newField: FormFieldConfig = {
      id: `field-${newFieldNumber}`,
      key: `field_${newFieldNumber}`,
      label: i18n.translate('customizableForm.builder.newFieldLabel', {
        defaultMessage: 'Field {position}',
        values: { position: newFieldNumber },
      }),
      placeholder: '',
      type: 'text',
      required: false,
    };

    setFormConfig((prev) => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
  };

  const handleSave = () => {
    notifications.toasts.addSuccess({
      title: i18n.translate('customizableForm.builder.configurationSavedTitle', {
        defaultMessage: 'Configuration saved',
      }),
      text: i18n.translate('customizableForm.builder.configurationSavedText', {
        defaultMessage: 'Persisting the configuration will be implemented in a later iteration.',
      }),
    });
  };

  const previewConnectorName = useMemo(() => {
    const selected = CONNECTOR_OPTIONS.find((option) => option.value === formConfig.connectorId);
    return selected?.text ?? formConfig.connectorId;
  }, [formConfig.connectorId]);

  return (
    <EuiPageTemplate paddingSize="m">
      <EuiPageTemplate.Header
        pageTitle={i18n.translate('customizableForm.builder.pageTitle', {
          defaultMessage: 'Customizable form builder',
        })}
        description={i18n.translate('customizableForm.builder.pageDescription', {
          defaultMessage:
            'Configure the fields shown on the dashboard widget and map them to the connector payload.',
        })}
      />

      <EuiPageTemplate.Section paddingSize="l" grow={true}>
        <EuiFlexGroup gutterSize="l" alignItems="stretch">
          <EuiFlexItem grow={3}>
            <PreviewPanel config={formConfig} connectorLabel={previewConnectorName} />
          </EuiFlexItem>

          <EuiFlexItem grow={2}>
            <ConfigurationPanel
              config={formConfig}
              onTitleChange={(value) => updateConfig({ title: value })}
              onDescriptionChange={(value) => updateConfig({ description: value })}
              onConnectorChange={(value) => updateConfig({ connectorId: value })}
              onTemplateChange={(value) => updateConfig({ documentTemplate: value })}
              onFieldChange={updateField}
              onFieldRemove={removeField}
              onAddField={addField}
              onSave={handleSave}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

interface ConfigurationPanelProps {
  config: FormConfig;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onConnectorChange: (value: string) => void;
  onTemplateChange: (value: string) => void;
  onFieldChange: (fieldId: string, changes: Partial<FormFieldConfig>) => void;
  onFieldRemove: (fieldId: string) => void;
  onAddField: () => void;
  onSave: () => void;
}

const ConfigurationPanel = ({
  config,
  onTitleChange,
  onDescriptionChange,
  onConnectorChange,
  onTemplateChange,
  onFieldChange,
  onFieldRemove,
  onAddField,
  onSave,
}: ConfigurationPanelProps) => {
  return (
    <EuiPanel paddingSize="m" hasShadow={false} hasBorder={true}>
      <EuiTitle size="s">
        <h2>
          {i18n.translate('customizableForm.builder.configurationPanelTitle', {
            defaultMessage: 'Configuration',
          })}
        </h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      <EuiForm component="div">
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
            onChange={(event) => onTitleChange(event.target.value)}
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
            onChange={(event) => onDescriptionChange(event.target.value)}
            aria-label={i18n.translate('customizableForm.builder.formDescriptionAria', {
              defaultMessage: 'Form description',
            })}
          />
        </EuiFormRow>

        <EuiFormRow
          label={i18n.translate('customizableForm.builder.connectorLabel', {
            defaultMessage: 'Connector',
          })}
          helpText={i18n.translate('customizableForm.builder.connectorHelpText', {
            defaultMessage:
              'Index connectors are supported for now. Additional connector types will be available later.',
          })}
        >
          <EuiSelect
            options={CONNECTOR_OPTIONS}
            value={config.connectorId}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => onConnectorChange(event.target.value)}
          />
        </EuiFormRow>

        <EuiSpacer size="l" />

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
                onChange={(event) => onFieldChange(field.id, { label: event.target.value })}
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
                onChange={(event) => onFieldChange(field.id, { key: event.target.value })}
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('customizableForm.builder.fieldPlaceholderLabel', {
                defaultMessage: 'Placeholder',
              })}
            >
              <EuiFieldText
                value={field.placeholder ?? ''}
                onChange={(event) => onFieldChange(field.id, { placeholder: event.target.value })}
              />
            </EuiFormRow>

            <EuiFormRow
              label={i18n.translate('customizableForm.builder.fieldTypeLabel', {
                defaultMessage: 'Input type',
              })}
            >
              <EuiSelect
                options={FIELD_TYPE_OPTIONS}
                value={field.type}
                onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                  onFieldChange(field.id, { type: event.target.value as FormFieldType })
                }
              />
            </EuiFormRow>

            <EuiFormRow display="columnCompressed">
              <EuiSwitch
                label={i18n.translate('customizableForm.builder.fieldRequiredLabel', {
                  defaultMessage: 'Required',
                })}
                checked={field.required}
                onChange={(event) => onFieldChange(field.id, { required: event.target.checked })}
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

        <EuiSpacer size="l" />

        <EuiTitle size="xs">
          <h3>
            {i18n.translate('customizableForm.builder.templateSectionTitle', {
              defaultMessage: 'Connector payload template',
            })}
          </h3>
        </EuiTitle>

        <EuiSpacer size="s" />

        <EuiFormRow
          label={i18n.translate('customizableForm.builder.templateLabel', {
            defaultMessage: 'Document to index',
          })}
          helpText={i18n.translate('customizableForm.builder.templateHelpText', {
            defaultMessage: 'Use the variables defined above to compose a valid JSON document. Example: {example}.',
            values: { example: '{{message}}' },
          })}
        >
          <EuiTextArea
            resize="vertical"
            value={config.documentTemplate}
            onChange={(event) => onTemplateChange(event.target.value)}
            aria-label={i18n.translate('customizableForm.builder.templateAriaLabel', {
              defaultMessage: 'Connector payload template',
            })}
            rows={10}
          />
        </EuiFormRow>

        <EuiSpacer size="l" />

        <EuiButton fill iconType="save" onClick={onSave}>
          {i18n.translate('customizableForm.builder.saveButton', {
            defaultMessage: 'Save configuration',
          })}
        </EuiButton>
      </EuiForm>
    </EuiPanel>
  );
};

interface PreviewPanelProps {
  config: FormConfig;
  connectorLabel: string;
}

const PreviewPanel = ({ config, connectorLabel }: PreviewPanelProps) => {
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

  return (
    <EuiPanel paddingSize="l" hasShadow={false} hasBorder={true}>
      <EuiTitle size="l">
        <h1>{title}</h1>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiText color="subdued">
        <p>{description}</p>
      </EuiText>

      <EuiSpacer size="m" />

      {hasFields ? (
        <EuiForm component="form">
          {config.fields.map((field) => (
            <EuiFormRow
              key={field.id}
              label={field.label || field.key}
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
                <EuiTextArea placeholder={field.placeholder} aria-label={field.label || field.key} />
              ) : (
                <EuiFieldText placeholder={field.placeholder} aria-label={field.label || field.key} />
              )}
            </EuiFormRow>
          ))}

          <EuiSpacer size="m" />

          <EuiButton fill iconType="play">
            {i18n.translate('customizableForm.builder.previewSubmitButton', {
              defaultMessage: 'Trigger connector',
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

      <EuiSpacer size="l" />

      <EuiCallOut
        title={i18n.translate('customizableForm.builder.previewConnectorTitle', {
          defaultMessage: 'Selected connector',
        })}
        iconType="indexManagementApp"
      >
        <p>{connectorLabel}</p>
      </EuiCallOut>

      <EuiSpacer size="l" />

      <EuiTitle size="xs">
        <h3>
          {i18n.translate('customizableForm.builder.previewTemplateTitle', {
            defaultMessage: 'Payload preview',
          })}
        </h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      <EuiCodeBlock language="json" isCopyable>
        {config.documentTemplate}
      </EuiCodeBlock>
    </EuiPanel>
  );
};

export default CustomizableFormBuilder;

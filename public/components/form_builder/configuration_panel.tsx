import React, { ChangeEvent, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiDualRange,
  EuiEmptyPrompt,
  EuiFieldNumber,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTextArea,
  EuiTitle,
  EuiButtonIcon,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import type { ActionType } from '@kbn/actions-types';

import PanelHeader from './panel_header';
import {
  DEFAULT_NUMBER_SIZE,
  DEFAULT_STRING_SIZE,
  MAX_LAYOUT_COLUMNS,
  MIN_LAYOUT_COLUMNS,
} from './constants';
import type {
  FormConfig,
  FormFieldType,
  FormFieldDataType,
  FormFieldConfig,
  SupportedConnectorTypeId,
} from './types';
import {
  VARIABLE_NAME_RULES,
  type VariableNameValidationResult,
} from './validation';

const fieldDragHandleStyles = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: inherit;
  border-radius: 4px;
  padding: 2px;

  &:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 119, 204, 0.3);
  }
`;

const getDefaultSizeForDataType = (dataType: FormFieldConfig['dataType']) =>
  dataType === 'number' ? { ...DEFAULT_NUMBER_SIZE } : { ...DEFAULT_STRING_SIZE };

const getConnectorFallbackLabel = (index: number) =>
  i18n.translate('customizableForm.builder.connectorFallbackLabel', {
    defaultMessage: 'Connector {number}',
    values: { number: index + 1 },
  });

const toConnectorOptions = (connectors: ActionConnector[]) =>
  connectors.map((connector) => ({ value: connector.id, text: connector.name }));

type ConnectorStatus = {
  hasWarning: boolean;
  hasError: boolean;
  hasTemplateWarning: boolean;
  hasTemplateError: boolean;
};

type ConnectorSelectionStateEntry = {
  connectorsForType: Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>;
  availableConnectors: Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>;
  hasType: boolean;
  hasSelection: boolean;
};

const DEFAULT_CONNECTOR_STATUS: ConnectorStatus = {
  hasWarning: false,
  hasError: false,
  hasTemplateWarning: false,
  hasTemplateError: false,
};

interface ConfigurationPanelProps {
  config: FormConfig;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onShowTitleChange: (value: boolean) => void;
  onShowDescriptionChange: (value: boolean) => void;
  onLayoutColumnsChange: (value: number) => void;
  onRequireConfirmationChange: (value: boolean) => void;
  onConnectorTypeChange: (connectorConfigId: string, value: string) => void;
  onConnectorChange: (connectorConfigId: string, value: string) => void;
  onConnectorLabelChange: (connectorConfigId: string, value: string) => void;
  onConnectorTemplateChange: (connectorConfigId: string, value: string) => void;
  onConnectorAdd: () => void;
  onConnectorRemove: (connectorConfigId: string) => void;
  onFieldChange: (fieldId: string, changes: Partial<FormFieldConfig>) => void;
  onFieldRemove: (fieldId: string) => void;
  onAddField: () => void;
  onFieldReorder: (sourceIndex: number, destinationIndex: number) => void;
  variableNameValidationById: Record<string, VariableNameValidationResult>;
  hasInvalidVariableNames: boolean;
  onSaveRequest: () => void;
  connectorTypeOptions: Array<{ value: string; text: string }>;
  connectorTypes: Array<ActionType & { id: SupportedConnectorTypeId }>;
  connectorsByType: Record<string, Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>>;
  templateValidationByConnector: Record<string, { missing: string[]; unused: Array<{ key: string; label: string }> }>;
  connectorStatusById: Record<string, ConnectorStatus>;
  connectorSelectionState: Record<string, ConnectorSelectionStateEntry>;
  isLoadingConnectorTypes: boolean;
  isLoadingConnectors: boolean;
  connectorTypesError: string | null;
  connectorsError: string | null;
  hasEmptyConnectorLabels: boolean;
  isSaveDisabled: boolean;
  isSaving: boolean;
}

type ConfigurationTab = 'general' | 'connectors' | 'fields' | 'payload';

export const ConfigurationPanel = ({
  config,
  onTitleChange,
  onDescriptionChange,
  onShowTitleChange,
  onShowDescriptionChange,
  onConnectorTypeChange,
  onConnectorChange,
  onConnectorLabelChange,
  onConnectorTemplateChange,
  onConnectorAdd,
  onConnectorRemove,
  onFieldChange,
  onFieldRemove,
  onAddField,
  onFieldReorder,
  onLayoutColumnsChange,
  onRequireConfirmationChange,
  variableNameValidationById,
  hasInvalidVariableNames,
  onSaveRequest,
  connectorTypeOptions,
  connectorTypes,
  connectorsByType,
  templateValidationByConnector,
  connectorStatusById,
  connectorSelectionState,
  isLoadingConnectorTypes,
  isLoadingConnectors,
  connectorTypesError,
  connectorsError,
  hasEmptyConnectorLabels,
  isSaveDisabled,
  isSaving,
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

          <EuiFormRow
            label={i18n.translate('customizableForm.builder.layoutColumnsLabel', {
              defaultMessage: 'Preview columns',
            })}
            helpText={i18n.translate('customizableForm.builder.layoutColumnsHelpText', {
              defaultMessage:
                'Select between {min} and {max} columns. Extra fields wrap onto the next row.',
              values: {
                min: MIN_LAYOUT_COLUMNS,
                max: MAX_LAYOUT_COLUMNS,
              },
            })}
          >
            <EuiFieldNumber
              min={MIN_LAYOUT_COLUMNS}
              max={MAX_LAYOUT_COLUMNS}
              step={1}
              value={config.layoutColumns}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isFinite(value)) {
                  const normalized = Math.min(
                    MAX_LAYOUT_COLUMNS,
                    Math.max(MIN_LAYOUT_COLUMNS, Math.trunc(value))
                  );
                  onLayoutColumnsChange(normalized);
                }
              }}
              fullWidth
            />
          </EuiFormRow>

          <EuiFormRow
            label={i18n.translate('customizableForm.builder.requireConfirmationLabel', {
              defaultMessage: 'Submission confirmation',
            })}
            display="columnCompressed"
            hasChildLabel={false}
          >
            <EuiSwitch
              label={i18n.translate('customizableForm.builder.requireConfirmationSwitch', {
                defaultMessage: 'Ask for confirmation before executing connectors',
              })}
              checked={config.requireConfirmationOnSubmit}
              onChange={(event) => onRequireConfirmationChange(event.target.checked)}
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
              const selectionState = connectorSelectionState[connectorConfig.id];
              const connectorsForType = selectionState?.connectorsForType ?? [];
              const availableConnectorsForType = selectionState?.availableConnectors ?? [];
              const connectorStatus = connectorStatusById[connectorConfig.id] ?? DEFAULT_CONNECTOR_STATUS;

              const connectorSelectOptions = [
                {
                  value: '',
                  text: i18n.translate('customizableForm.builder.selectConnectorPlaceholder', {
                    defaultMessage: 'Select a connector',
                  }),
                },
                ...toConnectorOptions(availableConnectorsForType),
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

              const currentLabel = connectorConfig.label || '';
              const labelPlaceholder =
                selectedConnectorInstance?.name ?? selectedType?.name ?? getConnectorFallbackLabel(index);
              const isLabelInvalid = !currentLabel.trim();

              const accordionLabel =
                currentLabel.trim() ||
                selectedConnectorInstance?.name ||
                selectedType?.name ||
                getConnectorFallbackLabel(index);

              const showConnectorErrorIcon = connectorStatus.hasError;
              const showConnectorWarningIcon = !connectorStatus.hasError && connectorStatus.hasWarning;

              const connectorAccordionLabel = (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>{accordionLabel}</span>
                  {showConnectorErrorIcon ? <EuiIcon type="alert" color="danger" size="s" /> : null}
                  {showConnectorWarningIcon ? <EuiIcon type="warning" color="warning" size="s" /> : null}
                </span>
              );

              const shouldShowConnectorWarning = connectorStatus.hasWarning;

              return (
                <React.Fragment key={connectorConfig.id}>
                  <EuiAccordion
                    id={connectorConfig.id}
                    buttonContent={connectorAccordionLabel}
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
                      label={i18n.translate('customizableForm.builder.connectorLabelInputLabel', {
                        defaultMessage: 'Label',
                      })}
                      isInvalid={isLabelInvalid}
                      error={
                        isLabelInvalid
                          ? [
                              i18n.translate('customizableForm.builder.connectorLabelRequiredError', {
                                defaultMessage: 'Label is required.',
                              }),
                            ]
                          : undefined
                      }
                    >
                      <EuiFieldText
                        value={connectorConfig.label}
                        placeholder={labelPlaceholder}
                        onChange={(event) =>
                          onConnectorLabelChange(connectorConfig.id, event.target.value)
                        }
                        aria-label={i18n.translate('customizableForm.builder.connectorLabelInputAria', {
                          defaultMessage: 'Connector label',
                        })}
                      />
                    </EuiFormRow>

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
                              defaultMessage: 'Create a connector of this type or free an existing one to enable submissions.',
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

          {hasEmptyConnectorLabels ? (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut
                color="danger"
                iconType="alert"
                size="s"
                title={i18n.translate('customizableForm.builder.connectorLabelsCalloutTitle', {
                  defaultMessage: 'Connector labels required',
                })}
              >
                <p>
                  {i18n.translate('customizableForm.builder.connectorLabelsCalloutBody', {
                    defaultMessage: 'Provide a label for each connector before saving.',
                  })}
                </p>
              </EuiCallOut>
            </>
          ) : null}
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

          <EuiDragDropContext
            onDragEnd={({ source, destination }) => {
              if (!destination) return;
              onFieldReorder(source.index, destination.index);
            }}
          >
            <EuiDroppable droppableId="customizableFormFields" direction="vertical">
              {(droppableProvided) => (
                <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
                  {config.fields.map((field, index) => {
                    const accordionLabel =
                      field.label ||
                      i18n.translate('customizableForm.builder.fieldFallbackLabel', {
                        defaultMessage: 'Field {number}',
                        values: { number: index + 1 },
                      });

                    const variableValidation = variableNameValidationById[field.id] ?? {
                      isValid: true,
                    };
                    const sizeDefaults = getDefaultSizeForDataType(field.dataType);
                    const sizeBounds = field.dataType === 'number' ? DEFAULT_NUMBER_SIZE : DEFAULT_STRING_SIZE;
                    const currentSize = field.size ?? sizeDefaults;
                    const sanitizedMin = Math.min(
                      sizeBounds.max,
                      Math.max(sizeBounds.min, currentSize.min)
                    );
                    const sanitizedMax = Math.max(
                      sanitizedMin,
                      Math.min(sizeBounds.max, currentSize.max)
                    );
                    const sizeRange: [string, string] = [
                      String(sanitizedMin),
                      String(sanitizedMax),
                    ];
                    const isBooleanType = field.dataType === 'boolean';

                    return (
                      <EuiDraggable
                        key={field.id}
                        draggableId={`field-${field.id}`}
                        index={index}
                        customDragHandle
                      >
                        {(draggableProvided) => (
                          <div
                            ref={draggableProvided.innerRef}
                            {...draggableProvided.draggableProps}
                            style={{
                              ...draggableProvided.draggableProps.style,
                              marginBottom: index === config.fields.length - 1 ? 0 : 12,
                            }}
                          >
                            <EuiAccordion
                              id={field.id}
                              buttonContent={
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span
                                    css={fieldDragHandleStyles}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={i18n.translate(
                                      'customizableForm.builder.reorderFieldAriaLabel',
                                      {
                                        defaultMessage: 'Drag to reorder field {label}',
                                        values: { label: accordionLabel },
                                      }
                                    )}
                                    {...draggableProvided.dragHandleProps}
                                  >
                                    <EuiIcon type="grab" size="m" />
                                  </span>
                                  <span>{accordionLabel}</span>
                                </span>
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
                                    aria-label={i18n.translate(
                                      'customizableForm.builder.removeFieldAriaLabel',
                                      {
                                        defaultMessage: 'Remove field {label}',
                                        values: { label: field.label || index + 1 },
                                      }
                                    )}
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
                                  defaultMessage:
                                    'Used in the connector template as {example}. Must be {min}-{max} characters, start with a letter or underscore, and contain only letters, digits, underscores, or hyphens.',
                                  values: {
                                    example: '{{variable_name}}',
                                    min: VARIABLE_NAME_RULES.MIN_LENGTH,
                                    max: VARIABLE_NAME_RULES.MAX_LENGTH,
                                  },
                                })}
                                isInvalid={Boolean(variableValidation && !variableValidation.isValid)}
                                error={
                                  variableValidation && !variableValidation.isValid
                                    ? variableValidation.message
                                    : undefined
                                }
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

                              <EuiFormRow
                                label={i18n.translate('customizableForm.builder.fieldDataTypeLabel', {
                                  defaultMessage: 'Field data type',
                                })}
                              >
                                <EuiSelect
                                  options={[
                                    {
                                      value: 'string',
                                      text: i18n.translate('customizableForm.builder.fieldDataType.string', {
                                        defaultMessage: 'String',
                                      }),
                                    },
                                    {
                                      value: 'number',
                                      text: i18n.translate('customizableForm.builder.fieldDataType.number', {
                                        defaultMessage: 'Number',
                                      }),
                                    },
                                    {
                                      value: 'boolean',
                                      text: i18n.translate('customizableForm.builder.fieldDataType.boolean', {
                                        defaultMessage: 'Boolean',
                                      }),
                                    },
                                  ]}
                                  value={field.dataType}
                                  onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                                    const nextType = e.target.value as FormFieldDataType;
                                    onFieldChange(field.id, {
                                      dataType: nextType,
                                      size:
                                        nextType === 'boolean'
                                          ? undefined
                                          : field.size ?? getDefaultSizeForDataType(nextType),
                                    });
                                  }}
                                />
                              </EuiFormRow>

                              {!isBooleanType ? (
                                <EuiFormRow
                                  label={i18n.translate('customizableForm.builder.fieldSizeLabel', {
                                    defaultMessage: 'Size constraint',
                                  })}
                                  helpText={i18n.translate('customizableForm.builder.fieldSizeHelpText', {
                                    defaultMessage: 'Allowed {type} range. Values outside this range trigger a warning and inhibit submission.',
                                    values: {
                                      type: field.dataType === 'number' ? 'numeric' : 'character',
                                    },
                                  })}
                                >
                                  <EuiDualRange
                                    min={sizeBounds.min}
                                    max={sizeBounds.max}
                                    value={sizeRange}
                                    showInput="inputWithPopover"
                                    onChange={(range) => {
                                      const [minValue, maxValue] = range.map((val) => Number(val));
                                      const normalizedMin = Number.isFinite(minValue)
                                        ? Math.max(sizeBounds.min, Math.floor(minValue))
                                        : sizeBounds.min;
                                      const normalizedMax = Number.isFinite(maxValue)
                                        ? Math.max(normalizedMin, Math.floor(maxValue))
                                        : Math.max(normalizedMin, sizeBounds.max);
                                      onFieldChange(field.id, {
                                        size: {
                                          min: normalizedMin,
                                          max: normalizedMax,
                                        },
                                      });
                                    }}
                                    fullWidth
                                  />
                                </EuiFormRow>
                              ) : null}

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
                          </div>
                        )}
                      </EuiDraggable>
                    );
                  })}
                  {droppableProvided.placeholder}
                </div>
              )}
            </EuiDroppable>
          </EuiDragDropContext>

          <EuiSpacer size="s" />

          <EuiButton iconType="plusInCircle" onClick={onAddField} size="s">
            {i18n.translate('customizableForm.builder.addFieldButton', {
              defaultMessage: 'Add field',
            })}
          </EuiButton>

          {hasInvalidVariableNames ? (
            <>
              <EuiSpacer size="s" />
              <EuiCallOut
                color="danger"
                iconType="alert"
                size="s"
                title={i18n.translate('customizableForm.builder.invalidVariableNamesTitle', {
                  defaultMessage: 'Invalid variable names',
                })}
              >
                <p>
                  {i18n.translate('customizableForm.builder.invalidVariableNamesBody', {
                    defaultMessage:
                      'Ensure each variable name is unique, between {min} and {max} characters, and matches the allowed pattern.',
                    values: {
                      min: VARIABLE_NAME_RULES.MIN_LENGTH,
                      max: VARIABLE_NAME_RULES.MAX_LENGTH,
                    },
                  })}
                </p>
              </EuiCallOut>
            </>
          ) : null}
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

              const currentLabel = connectorConfig.label || '';
              const accordionLabel =
                currentLabel.trim() ||
                selectedConnectorInstance?.name ||
                selectedType?.name ||
                getConnectorFallbackLabel(index);

              const connectorStatus = connectorStatusById[connectorConfig.id] ?? DEFAULT_CONNECTOR_STATUS;
              const showTemplateErrorIcon = connectorStatus.hasTemplateError;
              const showTemplateWarningIcon =
                !connectorStatus.hasTemplateError && connectorStatus.hasTemplateWarning;
              const templateAccordionLabel = (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span>{accordionLabel}</span>
                  {showTemplateErrorIcon ? <EuiIcon type="alert" color="danger" size="s" /> : null}
                  {showTemplateWarningIcon ? <EuiIcon type="warning" color="warning" size="s" /> : null}
                </span>
              );

              return (
                <React.Fragment key={`payload-${connectorConfig.id}`}>
                  <EuiAccordion
                    id={`payload-${connectorConfig.id}`}
                    buttonContent={templateAccordionLabel}
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
          <EuiButton
            fill
            iconType="save"
            onClick={onSaveRequest}
            disabled={isSaveDisabled || isSaving}
            isLoading={isSaving}
          >
            {i18n.translate('customizableForm.builder.saveVisualizationButton', {
              defaultMessage: 'Save Visualization',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

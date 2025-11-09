import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiDualRange,
  EuiFieldText,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiSwitch,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { DEFAULT_NUMBER_SIZE, DEFAULT_STRING_SIZE } from '../constants';
import type { FormFieldConfig, FormFieldDataType, FormFieldType } from '../types';
import { VARIABLE_NAME_RULES, validateVariableName } from '../validation';
import { useFormBuilderContext } from '../form_builder_context';

const dragHandleStyles = css`
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

interface FieldsTabProps {
  variableNameValidationById: Record<string, ReturnType<typeof validateVariableName>>;
  hasInvalidVariableNames: boolean;
}

export const FieldsTab = ({ variableNameValidationById, hasInvalidVariableNames }: FieldsTabProps) => {
  const { formConfig, updateField, removeField, addField, handleFieldReorder } = useFormBuilderContext();

  const handleDataTypeChange = (fieldId: string, nextType: FormFieldDataType, field: FormFieldConfig) => {
    updateField(fieldId, {
      dataType: nextType,
      size: nextType === 'boolean' ? undefined : field.size ?? getDefaultSizeForDataType(nextType),
    });
  };

  return (
    <>
      {formConfig.fields.length === 0 ? (
        <EuiCallOut
          color="primary"
          iconType="plusInCircle"
          title={i18n.translate('customizableForm.builder.fieldsEmptyStateTitle', {
            defaultMessage: 'Add your first field',
          })}
        >
          <p>
            {i18n.translate('customizableForm.builder.fieldsEmptyStateBody', {
              defaultMessage: 'Fields capture user input and can be referenced in connector payloads.',
            })}
          </p>
        </EuiCallOut>
      ) : null}

      <EuiDragDropContext
        onDragEnd={({ source, destination }) => {
          if (!destination) return;
          if (source.index === destination.index && source.droppableId === destination.droppableId) {
            return;
          }
          handleFieldReorder(source.index, destination.index);
        }}
      >
        <EuiDroppable droppableId="customizableFormFields" direction="vertical">
          {(droppableProvided) => (
            <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
              {formConfig.fields.map((field, index) => {
                const variableValidation = variableNameValidationById[field.id];
                const sizeBounds = field.dataType === 'number' ? DEFAULT_NUMBER_SIZE : DEFAULT_STRING_SIZE;
                const tupleSizeRange: [number, number] =
                  field.size && field.dataType !== 'boolean'
                    ? [field.size.min, field.size.max]
                    : [sizeBounds.min, sizeBounds.max];
                const isBooleanType = field.dataType === 'boolean';

                return (
                  <EuiDraggable key={field.id} index={index} draggableId={field.id} customDragHandle>
                    {(draggableProvided, dragState) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        style={{
                          ...draggableProvided.draggableProps.style,
                          marginBottom: 12,
                          opacity: dragState.isDragging ? 0.7 : 1,
                        }}
                      >
                        <EuiAccordion
                          id={field.id}
                          buttonContent={
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <EuiButtonIcon
                                iconType="grab"
                                color="text"
                                {...draggableProvided.dragHandleProps}
                                css={dragHandleStyles}
                                aria-label={i18n.translate('customizableForm.builder.reorderFieldAriaLabel', {
                                  defaultMessage: 'Reorder field {number}',
                                  values: { number: index + 1 },
                                })}
                              />
                              <span>
                                {field.label ||
                                  field.key ||
                                  i18n.translate('customizableForm.builder.untitledFieldLabel', {
                                    defaultMessage: 'Field {number}',
                                    values: { number: index + 1 },
                                  })}
                              </span>
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
                                aria-label={i18n.translate('customizableForm.builder.removeFieldAriaLabel', {
                                  defaultMessage: 'Remove field {number}',
                                  values: { number: index + 1 },
                                })}
                                onClick={() => removeField(field.id)}
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
                              onChange={(e) => updateField(field.id, { label: e.target.value })}
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
                              onChange={(e) => updateField(field.id, { key: e.target.value })}
                            />
                          </EuiFormRow>

                          <EuiFormRow
                            label={i18n.translate('customizableForm.builder.fieldPlaceholderLabel', {
                              defaultMessage: 'Placeholder',
                            })}
                          >
                            <EuiFieldText
                              value={field.placeholder ?? ''}
                              onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
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
                              onChange={(e) => updateField(field.id, { type: e.target.value as FormFieldType })}
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
                              onChange={(e) =>
                                handleDataTypeChange(field.id, e.target.value as FormFieldDataType, field)
                              }
                            />
                          </EuiFormRow>

                          {!isBooleanType ? (
                            <EuiFormRow
                              label={i18n.translate('customizableForm.builder.fieldSizeLabel', {
                                defaultMessage: 'Size constraint',
                              })}
                              helpText={i18n.translate('customizableForm.builder.fieldSizeHelpText', {
                                defaultMessage:
                                  'Allowed {type} range. Values outside this range trigger a warning and inhibit submission.',
                                values: {
                                  type: field.dataType === 'number' ? 'numeric' : 'character',
                                },
                              })}
                            >
                              <EuiDualRange
                                min={sizeBounds.min}
                                max={sizeBounds.max}
                                value={tupleSizeRange}
                                showInput="inputWithPopover"
                                onChange={(range) => {
                                  const [minValue, maxValue] = range.map((val) => Number(val));
                                  const normalizedMin = Number.isFinite(minValue)
                                    ? Math.max(sizeBounds.min, Math.floor(minValue))
                                    : sizeBounds.min;
                                  const normalizedMax = Number.isFinite(maxValue)
                                    ? Math.max(normalizedMin, Math.floor(maxValue))
                                    : Math.max(normalizedMin, sizeBounds.max);
                                  updateField(field.id, {
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
                              onChange={(e) => updateField(field.id, { required: e.target.checked })}
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

      <EuiButton iconType="plusInCircle" onClick={addField} size="s">
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
  );
};


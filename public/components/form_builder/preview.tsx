import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';

import type { FormConfig, FormFieldConfig } from './types';
import {
  DEFAULT_LAYOUT_COLUMNS,
  MAX_LAYOUT_COLUMNS,
  MIN_LAYOUT_COLUMNS,
} from './constants';

const previewInputPlaceholderStyles = css`
  ::placeholder {
    font-style: italic;
  }
`;

const previewContainerStyles = css`
  padding: 0 16px 16px;
  width: 100%;
  box-sizing: border-box;
`;

const GRID_GAP = 16;

const getPreviewGridStyles = () => css`
  display: flex;
  flex-wrap: wrap;
  gap: ${GRID_GAP}px;
  width: 100%;
`;

const getFlexBasis = (columnsInRow: number) => {
  if (columnsInRow <= 1) {
    return '100%';
  }
  const totalGap = (columnsInRow - 1) * GRID_GAP;
  return `calc((100% - ${totalGap}px) / ${columnsInRow})`;
};

const getCellStyles = (columnsInRow: number) =>
  css`
    flex: 0 0 ${getFlexBasis(columnsInRow)};
    max-width: ${getFlexBasis(columnsInRow)};
    min-width: 0;
    display: flex;

    @media (max-width: 1199px) {
      flex: 0 0 ${getFlexBasis(Math.min(columnsInRow, 2))};
      max-width: ${getFlexBasis(Math.min(columnsInRow, 2))};
    }

    @media (max-width: 767px) {
      flex: 0 0 100%;
      max-width: 100%;
    }
  `;

const cellContentStyles = css`
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const formRowStyles = css`
  width: 100%;
  max-width: none;

  .euiFormRow__fieldWrapper {
    width: 100%;
  }
`;

const formStyles = css`
  width: 100%;
  max-width: none;
`;

export interface CustomizableFormPreviewProps {
  config: FormConfig;
  fieldValues: Record<string, string>;
  onFieldValueChange: (fieldId: string, value: string) => void;
  isSubmitDisabled: boolean;
  onSubmit: () => void;
  validationByFieldId?: Record<string, FieldValidationResult>;
  isSubmitting?: boolean;
}

export interface FieldValidationResult {
  isOutOfRange: boolean;
  message: string | null;
}

export const getFieldValidationResult = (
  field: FormFieldConfig,
  rawValue: string
): FieldValidationResult => {
  const value = rawValue ?? '';
  const size = field.size;

  if (!size || field.dataType === 'boolean') {
    return { isOutOfRange: false, message: null };
  }

  if (field.dataType === 'string') {
    if (value.length === 0) {
      return { isOutOfRange: false, message: null };
    }
    if (value.length < size.min || value.length > size.max) {
      return {
        isOutOfRange: true,
        message: i18n.translate('customizableForm.preview.validation.stringSize', {
          defaultMessage: '{label} should contain between {min} and {max} characters.',
          values: {
            label: field.label || field.key,
            min: size.min,
            max: size.max,
          },
        }),
      };
    }
    return { isOutOfRange: false, message: null };
  }

  if (value.trim().length === 0) {
    return { isOutOfRange: false, message: null };
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return {
      isOutOfRange: true,
      message: i18n.translate('customizableForm.preview.validation.numberInvalid', {
        defaultMessage: '{label} must be a valid number.',
        values: { label: field.label || field.key },
      }),
    };
  }

  if (parsed < size.min || parsed > size.max) {
    return {
      isOutOfRange: true,
      message: i18n.translate('customizableForm.preview.validation.numberSize', {
        defaultMessage: '{label} should be between {min} and {max}.',
        values: {
          label: field.label || field.key,
          min: size.min,
          max: size.max,
        },
      }),
    };
  }

  return { isOutOfRange: false, message: null };
};

export const CustomizableFormPreview = ({
  config,
  fieldValues,
  onFieldValueChange,
  isSubmitDisabled,
  onSubmit,
  validationByFieldId,
  isSubmitting = false,
}: CustomizableFormPreviewProps) => {
  const hasFields = config.fields.length > 0;
  const rawColumns =
    typeof config.layoutColumns === 'number' ? config.layoutColumns : DEFAULT_LAYOUT_COLUMNS;
  const columnCount = Math.min(
    MAX_LAYOUT_COLUMNS,
    Math.max(MIN_LAYOUT_COLUMNS, Math.round(rawColumns) || MIN_LAYOUT_COLUMNS)
  );
  const gridStyles = getPreviewGridStyles();
  const computedValidationByFieldId = React.useMemo(() => {
    if (validationByFieldId) {
      return validationByFieldId;
    }
    const map: Record<string, FieldValidationResult> = {};
    config.fields.forEach((field) => {
      map[field.id] = getFieldValidationResult(field, fieldValues[field.id] ?? '');
    });
    return map;
  }, [config.fields, fieldValues, validationByFieldId]);
  const totalFields = config.fields.length;
  const remainder = totalFields > 0 ? totalFields % columnCount : 0;
  const lastRowCount =
    totalFields === 0
      ? 0
      : remainder === 0
      ? Math.min(columnCount, totalFields)
      : remainder;
  const lastRowStartIndex = totalFields === 0 ? 0 : totalFields - lastRowCount;
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
    <div css={previewContainerStyles}>
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
        <EuiForm
          component="form"
          fullWidth
          css={formStyles}
          onSubmit={(event) => event.preventDefault()}
        >
          <div css={gridStyles}>
            {config.fields.map((field, index) => {
              const isInLastRow = totalFields > 0 && index >= lastRowStartIndex;
              const columnsInRowRaw = isInLastRow && lastRowCount > 0 ? lastRowCount : columnCount;
              const columnsForRow = Math.max(MIN_LAYOUT_COLUMNS, columnsInRowRaw);
              const validation = computedValidationByFieldId[field.id] ?? {
                isOutOfRange: false,
                message: null,
              };
              const showWarning = validation.isOutOfRange && validation.message;

              return (
                <div key={field.id} css={getCellStyles(columnsForRow)}>
                  <div css={cellContentStyles}>
                    <EuiFormRow
                      helpText={
                        showWarning ? (
                          <EuiText size="xs" color="warning">
                            {validation.message}
                          </EuiText>
                        ) : undefined
                      }
                      css={formRowStyles}
                      fullWidth
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
                          fullWidth
                          placeholder={field.placeholder}
                          aria-label={field.label || field.key}
                          value={fieldValues[field.id] ?? ''}
                          onChange={(event) => onFieldValueChange(field.id, event.target.value)}
                          css={previewInputPlaceholderStyles}
                        />
                      ) : (
                        <EuiFieldText
                          fullWidth
                          placeholder={field.placeholder}
                          aria-label={field.label || field.key}
                          value={fieldValues[field.id] ?? ''}
                          onChange={(event) => onFieldValueChange(field.id, event.target.value)}
                          css={previewInputPlaceholderStyles}
                        />
                      )}
                    </EuiFormRow>
                  </div>
                </div>
              );
            })}
          </div>

          <EuiSpacer size="m" />

          <EuiButton
            fill
            iconType="play"
            onClick={onSubmit}
            disabled={isSubmitDisabled || isSubmitting}
            isLoading={isSubmitting}
          >
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
    </div>
  );
};

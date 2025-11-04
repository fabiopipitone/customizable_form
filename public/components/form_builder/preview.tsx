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

import type { FormConfig } from './types';

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
const MIN_LAYOUT_COLUMNS = 1;
const MAX_LAYOUT_COLUMNS = 12;
const DEFAULT_LAYOUT_COLUMNS = 3;

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
}

export const CustomizableFormPreview = ({
  config,
  fieldValues,
  onFieldValueChange,
  isSubmitDisabled,
  onSubmit,
}: CustomizableFormPreviewProps) => {
  const hasFields = config.fields.length > 0;
  const rawColumns =
    typeof config.layoutColumns === 'number' ? config.layoutColumns : DEFAULT_LAYOUT_COLUMNS;
  const columnCount = Math.min(
    MAX_LAYOUT_COLUMNS,
    Math.max(MIN_LAYOUT_COLUMNS, Math.round(rawColumns) || MIN_LAYOUT_COLUMNS)
  );
  const gridStyles = getPreviewGridStyles();
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
              return (
                <div key={field.id} css={getCellStyles(columnsForRow)}>
                  <div css={cellContentStyles}>
                    <EuiFormRow
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
    </div>
  );
};

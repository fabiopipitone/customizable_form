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
  padding: 0 0 16px 16px;
`;

const GRID_GAP = 16;

const getPreviewGridStyles = (columns: number) => css`
  display: grid;
  gap: ${GRID_GAP}px;
  grid-template-columns: repeat(${columns}, minmax(0, 1fr));

  @media (max-width: 1199px) {
    grid-template-columns: repeat(${Math.min(columns, 2)}, minmax(0, 1fr));
  }

  @media (max-width: 767px) {
    grid-template-columns: 1fr;
  }
`;

const gridCellStyles = css`
  min-width: 0;
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
  const rawColumns = typeof config.layoutColumns === 'number' ? config.layoutColumns : 1;
  const columnCount = Math.min(Math.max(Math.round(rawColumns), 1), 3) as 1 | 2 | 3;
  const gridStyles = getPreviewGridStyles(columnCount);
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
        <EuiForm component="form" onSubmit={(event) => event.preventDefault()}>
          <div css={gridStyles}>
            {config.fields.map((field) => (
              <div key={field.id} css={gridCellStyles}>
                <EuiFormRow
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
              </div>
            ))}
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

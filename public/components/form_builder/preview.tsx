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

import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiEmptyPrompt,
  EuiFormRow,
  EuiIcon,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';

import { useFormBuilderContext, type FormBuilderContextValue } from '../form_builder_context';

interface PayloadTabProps {
  connectorSummaries: Array<{
    config: FormBuilderContextValue['formConfig']['connectors'][number];
    label: string;
  }>;
  connectorStatusById: Record<
    string,
    {
      hasWarning: boolean;
      hasError: boolean;
      hasTemplateWarning: boolean;
      hasTemplateError: boolean;
    }
  >;
  templateValidationByConnector: Record<
    string,
    { missing: string[]; unused: Array<{ key: string; label: string }> }
  >;
}

export const PayloadTab = ({
  connectorSummaries,
  connectorStatusById,
  templateValidationByConnector,
}: PayloadTabProps) => {
  const { formConfig, handleConnectorTemplateChange } = useFormBuilderContext();

  return (
    <>
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('customizableForm.builder.templateSectionTitle', {
            defaultMessage: 'Payload templates',
          })}
        </h3>
      </EuiTitle>

      <EuiSpacer size="s" />

      {formConfig.connectors.length === 0 ? (
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
        formConfig.connectors.map((connectorConfig, index) => {
          const validation = templateValidationByConnector[connectorConfig.id] ?? {
            missing: [],
            unused: [],
          };

          const summary = connectorSummaries.find((item) => item.config.id === connectorConfig.id);
          const label =
            summary?.label ??
            ((connectorConfig.label || '').trim() ||
              i18n.translate('customizableForm.builder.connectorFallbackLabel', {
                defaultMessage: 'Connector {number}',
                values: { number: index + 1 },
              }));

          const connectorStatus = connectorStatusById[connectorConfig.id];
          const showTemplateErrorIcon = connectorStatus?.hasTemplateError;
          const showTemplateWarningIcon =
            connectorStatus && !connectorStatus.hasTemplateError && connectorStatus.hasTemplateWarning;
          const templateAccordionLabel = (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>{label}</span>
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
                    onChange={(e) => handleConnectorTemplateChange(connectorConfig.id, e.target.value)}
                    aria-label={i18n.translate('customizableForm.builder.templateAriaLabel', {
                      defaultMessage: 'Connector payload template',
                    })}
                    rows={10}
                  />
                </EuiFormRow>

                {validation.missing.length > 0 ? (
                  <EuiText color="danger" size="s">
                    {i18n.translate('customizableForm.builder.templateMissingVariablesLabel', {
                      defaultMessage: 'The template references variables without matching fields: {variables}.',
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
  );
};

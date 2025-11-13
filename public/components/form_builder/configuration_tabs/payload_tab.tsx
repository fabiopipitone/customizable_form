import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiEmptyPrompt,
  EuiFormRow,
  EuiIcon,
  EuiIconTip,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';

import { useFormBuilderContext } from '../form_builder_context';
import type { SupportedConnectorTypeId } from '../types';

export const PayloadTab = () => {
  const {
    formConfig,
    derivedState: { connectorSummaries, connectorStatusById, templateValidationByConnector },
    handleConnectorTemplateChange,
  } = useFormBuilderContext();

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
            errors: [],
            warnings: [],
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
          const connectorTypeId = connectorConfig.connectorTypeId as SupportedConnectorTypeId | '' | null;
          const payloadHelp = getPayloadHint(connectorTypeId);
          const showTemplateErrorIcon = connectorStatus?.hasTemplateError;
          const showTemplateWarningIcon =
            connectorStatus && !connectorStatus.hasTemplateError && connectorStatus.hasTemplateWarning;
          const templateAccordionLabel = (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>{label}</span>
              {payloadHelp ? (
                <EuiIconTip
                  type="iInCircle"
                  content={payloadHelp}
                  size="s"
                  color="subdued"
                />
              ) : null}
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
                      'Use the variables defined in the Fields tab to compose a valid JSON document. Example: {example}.',
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

                {validation.errors.length > 0 ? (
                  <>
                    <EuiText color="danger" size="s">
                      <ul style={{ paddingLeft: 18, margin: 0 }}>
                        {validation.errors.map((error, idx) => (
                          <li key={`payload-error-${connectorConfig.id}-${idx}`}>{error}</li>
                        ))}
                      </ul>
                    </EuiText>
                    <EuiSpacer size="s" />
                  </>
                ) : null}

                {validation.missing.length > 0 ? (
                  <EuiText color="danger" size="s">
                    {i18n.translate('customizableForm.builder.templateMissingVariablesLabel', {
                      defaultMessage: 'The template references variables without matching fields: {variables}.',
                      values: { variables: validation.missing.join(', ') },
                    })}
                  </EuiText>
                ) : null}

                {validation.warnings.length > 0 ? (
                  <>
                    <EuiSpacer size="s" />
                    <EuiText color="warning" size="s">
                      <ul style={{ paddingLeft: 18, margin: 0 }}>
                        {validation.warnings.map((warning, idx) => (
                          <li key={`payload-warn-${connectorConfig.id}-${idx}`}>{warning}</li>
                        ))}
                      </ul>
                    </EuiText>
                  </>
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

const getPayloadHint = (typeId: SupportedConnectorTypeId | '' | null) => {
  switch (typeId) {
    case '.email':
      return i18n.translate('customizableForm.builder.payloadHelp.email', {
        defaultMessage: 'Allowed fields: to, cc, bcc, subject, message, messageHTML, attachments.',
      });
    case '.jira':
      return i18n.translate('customizableForm.builder.payloadHelp.jira', {
        defaultMessage:
          'Allowed fields: summary, description, issueType, priority, parent, labels, comments[].comment. Use the exact values/IDs from Jira.',
      });
    default:
      return null;
  }
};

import React, { useEffect, useState } from 'react';
import {
  EuiCodeBlock,
  EuiEmptyPrompt,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiIcon,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import PanelHeader from './panel_header';
import { ConnectorSummaryTable } from './connector_summary';
import { useFormBuilderContext } from './form_builder_context';

export const InfoPanel: React.FC = () => {
  const {
    derivedState: {
      connectorSummaries,
      connectorSummaryItems,
      renderedPayloads,
      templateValidationByConnector,
    },
  } = useFormBuilderContext();

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

  const activeValidation =
    activePayloadId !== null
      ? templateValidationByConnector[activePayloadId] ??
        { missing: [], unused: [], errors: [], warnings: [] }
      : { missing: [], unused: [], errors: [], warnings: [] };

  const activePayload = activePayloadId ? renderedPayloads[activePayloadId] ?? '' : '';

  return (
    <EuiPanel paddingSize="m" hasShadow hasBorder={false}>
      <PanelHeader
        title={i18n.translate('customizableForm.builder.infoPanelTitle', {
          defaultMessage: 'Info',
        })}
      />

      <section>
        <EuiTitle	size="xs">
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
          <ConnectorSummaryTable items={connectorSummaryItems} />
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
              {connectorSummaries.map(({ config, label, status }) => (
                <EuiTab
                  key={`payload-tab-${config.id}`}
                  isSelected={activePayloadId === config.id}
                  onClick={() => setActivePayloadId(config.id)}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <span>{label}</span>
                    {status.hasTemplateError || status.hasError ? (
                      <EuiIcon type="alert" color="danger" size="s" />
                    ) : null}
                    {!status.hasTemplateError &&
                    !status.hasError &&
                    (status.hasTemplateWarning || status.hasWarning) ? (
                      <EuiIcon type="warning" color="warning" size="s" />
                    ) : null}
                  </span>
                </EuiTab>
              ))}
            </EuiTabs>

            <EuiSpacer size="m" />

            <EuiCodeBlock language="json" isCopyable>
              {activePayload}
            </EuiCodeBlock>

            {activeValidation.errors.length > 0 ? (
              <>
                <EuiSpacer size="s" />
                <EuiText color="danger" size="s">
                  <ul style={{ paddingLeft: 18, margin: 0 }}>
                    {activeValidation.errors.map((error, idx) => (
                      <li key={`payload-error-${idx}`}>{error}</li>
                    ))}
                  </ul>
                </EuiText>
              </>
            ) : null}

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

            {activeValidation.warnings.length > 0 ? (
              <>
                <EuiSpacer size="s" />
                <EuiText color="warning" size="s">
                  <ul style={{ paddingLeft: 18, margin: 0 }}>
                    {activeValidation.warnings.map((warning, idx) => (
                      <li key={`payload-warning-${idx}`}>{warning}</li>
                    ))}
                  </ul>
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

export default InfoPanel;

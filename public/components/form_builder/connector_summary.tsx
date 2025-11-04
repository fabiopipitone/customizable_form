import React from 'react';
import { css } from '@emotion/react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface ConnectorSummaryStatus {
  hasWarning: boolean;
  hasError: boolean;
  hasTemplateWarning: boolean;
  hasTemplateError: boolean;
}

export interface ConnectorSummaryItem {
  id: string;
  label: string;
  connectorName: string;
  connectorTypeLabel: string;
  status?: ConnectorSummaryStatus;
}

export const DEFAULT_CONNECTOR_SUMMARY_STATUS: ConnectorSummaryStatus = {
  hasWarning: false,
  hasError: false,
  hasTemplateWarning: false,
  hasTemplateError: false,
};

const connectorSummaryRowBaseStyles = css`
  padding: 8px 12px;
  border-radius: 4px;
`;

const connectorSummaryHeaderTextStyles = css`
  font-size: 0.95rem;
`;

export const ConnectorSummaryTable: React.FC<{ items: ConnectorSummaryItem[] }> = ({ items }) => {
  if (items.length === 0) {
    return null;
  }

  return (
    <div>
      <div
        css={[
          connectorSummaryRowBaseStyles,
          {
            backgroundColor: '#ffffff',
            marginBottom: items.length > 0 ? 6 : 0,
          },
        ]}
      >
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
          <EuiFlexItem grow={1}>
            <EuiText size="xs" color="subdued" css={connectorSummaryHeaderTextStyles}>
              <strong>
                {i18n.translate('customizableForm.connectorSummary.header.label', {
                  defaultMessage: 'Label',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiText size="xs" color="subdued" css={connectorSummaryHeaderTextStyles}>
              <strong>
                {i18n.translate('customizableForm.connectorSummary.header.connector', {
                  defaultMessage: 'Connector',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={1}>
            <EuiText size="xs" color="subdued" css={connectorSummaryHeaderTextStyles}>
              <strong>
                {i18n.translate('customizableForm.connectorSummary.header.type', {
                  defaultMessage: 'Type',
                })}
              </strong>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      {items.map((item, index) => {
        const status = item.status ?? DEFAULT_CONNECTOR_SUMMARY_STATUS;
        const emphasizeError = status.hasError || status.hasTemplateError;
        const emphasizeWarning = !emphasizeError && (status.hasWarning || status.hasTemplateWarning);

        return (
          <div
            key={item.id}
            css={[
              connectorSummaryRowBaseStyles,
              {
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#f7fbff',
                marginBottom: index < items.length - 1 ? 6 : 0,
              },
            ]}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={1}>
                <EuiText size="s">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    {emphasizeError ? <EuiIcon type="alert" color="danger" size="s" /> : null}
                    {emphasizeWarning ? <EuiIcon type="warning" color="warning" size="s" /> : null}
                    <span>{item.label}</span>
                  </span>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiText size="s">{item.connectorName}</EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiText size="s">{item.connectorTypeLabel}</EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        );
      })}
    </div>
  );
};

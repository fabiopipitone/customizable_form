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

interface ConnectorSummaryTableProps {
  items: ConnectorSummaryItem[];
  showHeader?: boolean;
}

export const ConnectorSummaryTable: React.FC<ConnectorSummaryTableProps> = ({
  items,
  showHeader = true,
}) => {
  if (items.length === 0) {
    return null;
  }

  const headerLabels = {
    label: i18n.translate('customizableForm.connectorSummary.header.label', {
      defaultMessage: 'Label',
    }),
    connector: i18n.translate('customizableForm.connectorSummary.header.connector', {
      defaultMessage: 'Connector',
    }),
    type: i18n.translate('customizableForm.connectorSummary.header.type', {
      defaultMessage: 'Type',
    }),
  };

  type Row = {
    kind: 'header' | 'data';
    item?: ConnectorSummaryItem;
  };

  const rows: Row[] = [];
  if (showHeader) {
    rows.push({ kind: 'header' });
  }
  rows.push(...items.map((item): Row => ({ kind: 'data', item })));

  return (
    <div>
      {rows.map((row, rowIndex) => {
        const isHeader = row.kind === 'header';
        const item = row.item;
        const status = !isHeader ? item?.status ?? DEFAULT_CONNECTOR_SUMMARY_STATUS : undefined;
        const emphasizeError = !isHeader && status ? status.hasError || status.hasTemplateError : false;
        const emphasizeWarning =
          !isHeader && status ? !emphasizeError && (status.hasWarning || status.hasTemplateWarning) : false;

        const dataRowIndex = showHeader ? rowIndex - 1 : rowIndex;
        const backgroundColor = isHeader
          ? '#ffffff'
          : dataRowIndex % 2 === 0
          ? '#ffffff'
          : '#f7fbff';

        const marginBottom =
          rowIndex < rows.length - 1 ? 6 : 0;

        const labelText = isHeader ? headerLabels.label : item?.label ?? '';
        const connectorText = isHeader ? headerLabels.connector : item?.connectorName ?? '';
        const typeText = isHeader ? headerLabels.type : item?.connectorTypeLabel ?? '';

        return (
          <div
            key={isHeader ? '__connector-summary-header__' : item?.id ?? rowIndex}
            css={[
              connectorSummaryRowBaseStyles,
              {
                backgroundColor,
                marginBottom,
              },
            ]}
          >
            <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
              <EuiFlexItem grow={1}>
                <EuiText size={isHeader ? 'xs' : 's'} color={isHeader ? 'subdued' : undefined}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: isHeader ? 600 : 400 }}>
                    {!isHeader && emphasizeError ? <EuiIcon type="alert" color="danger" size="s" /> : null}
                    {!isHeader && emphasizeWarning ? <EuiIcon type="warning" color="warning" size="s" /> : null}
                    <span>{labelText}</span>
                  </span>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiText size={isHeader ? 'xs' : 's'} color={isHeader ? 'subdued' : undefined}>
                  <span style={{ fontWeight: isHeader ? 600 : 400 }}>{connectorText}</span>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={1}>
                <EuiText size={isHeader ? 'xs' : 's'} color={isHeader ? 'subdued' : undefined}>
                  <span style={{ fontWeight: isHeader ? 600 : 400 }}>{typeText}</span>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        );
      })}
    </div>
  );
};

import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import type { ActionType } from '@kbn/actions-types';

import type { FormConfig, FormConnectorConfig, SupportedConnectorTypeId, FormFieldConfig } from '../types';
import {
  DEFAULT_CONNECTOR_SUMMARY_STATUS,
  type ConnectorSummaryItem,
  type ConnectorSummaryStatus,
} from '../connector_summary';

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
};

const getConnectorFallbackLabel = (index: number) => `Connector ${index + 1}`;

export const buildConnectorLabels = (connectors: FormConnectorConfig[]): Record<string, string> => {
  const labels: Record<string, string> = {};
  connectors.forEach((connector, index) => {
    labels[connector.id] = (connector.label || '').trim() || getConnectorFallbackLabel(index);
  });
  return labels;
};

export const buildConnectorSummaries = ({
  formConfig,
  connectorTypes,
  connectors,
  connectorStatusById,
}: {
  formConfig: FormConfig;
  connectorTypes: Array<ActionType & { id: SupportedConnectorTypeId }>;
  connectors: Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>;
  connectorStatusById: Record<string, ConnectorSummaryStatus>;
}) =>
  formConfig.connectors.map((connectorConfig, index) => ({
    config: connectorConfig,
    type: connectorTypes.find((type) => type.id === connectorConfig.connectorTypeId) ?? null,
    connector:
      connectors.find((connectorInstance) => connectorInstance.id === connectorConfig.connectorId) ??
      null,
    label: (connectorConfig.label || '').trim() || getConnectorFallbackLabel(index),
    status: connectorStatusById[connectorConfig.id] ?? DEFAULT_CONNECTOR_SUMMARY_STATUS,
  }));

export const buildConnectorSummaryItems = (summaries: Array<{
  config: FormConnectorConfig;
  label: string;
  type: ActionType & { id: SupportedConnectorTypeId } | null;
  connector: ActionConnector & { actionTypeId: SupportedConnectorTypeId } | null;
  status: ConnectorSummaryStatus;
}>): ConnectorSummaryItem[] =>
  summaries.map((summary, index) => {
    const connectorName =
      summary.connector?.name ?? `Unnamed connector ${index + 1}`;
    const rawTypeLabel =
      summary.type?.name ??
      summary.connector?.actionTypeId ??
      summary.config.connectorTypeId;
    const typeLabel =
      rawTypeLabel && rawTypeLabel.trim().length > 0 ? rawTypeLabel : '—';

    return {
      id: summary.config.id,
      label: summary.label,
      connectorName,
      connectorTypeLabel: typeLabel,
      status: summary.status,
    };
  });

const TEMPLATE_VARIABLE_REGEX = /{{\s*([^{}\s]+)\s*}}/g;

export const getTemplateVariables = (template: string): string[] => {
  const variables = new Set<string>();
  template.replace(TEMPLATE_VARIABLE_REGEX, (_, variable: string) => {
    const trimmed = variable.trim();
    if (trimmed) {
      variables.add(trimmed);
    }
    return '';
  });
  return Array.from(variables);
};

export const renderConnectorPayload = ({
  connectorConfig,
  fields,
  fieldValues,
}: {
  connectorConfig: FormConnectorConfig;
  fields: FormFieldConfig[];
  fieldValues: Record<string, string>;
}): string => {
  const valueMap = fields.reduce<Record<string, string>>((acc, field) => {
    if (field.key) {
      acc[field.key.trim()] = fieldValues[field.id] ?? '';
    }
    return acc;
  }, {});

  return connectorConfig.documentTemplate.replace(TEMPLATE_VARIABLE_REGEX, (_, variable: string) => {
    const trimmed = variable.trim();
    return valueMap[trimmed] ?? '';
  });
};

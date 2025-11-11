import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import type { ActionType } from '@kbn/actions-types';
import type { CoreStart } from '@kbn/core/public';

import type { FormConfig, FormConnectorConfig, SupportedConnectorTypeId, FormFieldConfig } from '../types';
import {
  DEFAULT_CONNECTOR_SUMMARY_STATUS,
  type ConnectorSummaryItem,
  type ConnectorSummaryStatus,
} from '../connector_summary';
import { getErrorMessage } from './form_helpers';

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

export interface ExecuteConnectorHandlerParams {
  connector: FormConnectorConfig;
  http: CoreStart['http'];
  renderedPayload: string;
}

export type ExecuteConnectorHandler = (params: ExecuteConnectorHandlerParams) => Promise<void>;
export type ExecuteConnectorHandlerMap = Partial<
  Record<SupportedConnectorTypeId, ExecuteConnectorHandler>
>;

const indexHandler: ExecuteConnectorHandler = async ({ connector, http, renderedPayload }) => {
  const trimmed = renderedPayload.trim();
  if (!trimmed) {
    throw new Error('Rendered payload is empty.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    throw new Error(`Unable to parse payload as JSON: ${getErrorMessage(error)}`);
  }

  const documents = Array.isArray(parsed) ? parsed : [parsed];

  await http.post(`/api/actions/connector/${encodeURIComponent(connector.connectorId)}/_execute`, {
    body: JSON.stringify({
      params: {
        documents,
      },
    }),
  });
};

const webhookHandler: ExecuteConnectorHandler = async ({ connector, http, renderedPayload }) => {
  const trimmed = renderedPayload.trim();
  if (!trimmed) {
    throw new Error('Rendered payload is empty.');
  }

  await http.post(`/api/actions/connector/${encodeURIComponent(connector.connectorId)}/_execute`, {
    body: JSON.stringify({
      params: {
        body: trimmed,
      },
    }),
  });
};

const DEFAULT_HANDLERS: Record<SupportedConnectorTypeId, ExecuteConnectorHandler> = {
  '.index': indexHandler,
  '.webhook': webhookHandler,
};

export const executeConnectorHandlers = async ({
  http,
  connectors,
  renderedPayloads,
  customHandlers,
}: {
  http: CoreStart['http'];
  connectors: FormConnectorConfig[];
  renderedPayloads: Record<string, string>;
  customHandlers?: ExecuteConnectorHandlerMap;
}): Promise<
  Array<{
    connector: FormConnectorConfig;
    status: 'success' | 'error';
    message?: string;
  }>
> => {
  const handlerMap: ExecuteConnectorHandlerMap = {
    ...DEFAULT_HANDLERS,
    ...(customHandlers ?? {}),
  };

  const results: Array<{ connector: FormConnectorConfig; status: 'success' | 'error'; message?: string }> = [];

  for (const connector of connectors) {
    if (!connector.connectorId) {
      results.push({
        connector,
        status: 'error',
        message: 'Connector is missing an identifier.',
      });
      continue;
    }

    const payload = renderedPayloads[connector.id] ?? '';
    const handler = handlerMap[connector.connectorTypeId as SupportedConnectorTypeId];

    if (!handler) {
      results.push({
        connector,
        status: 'error',
        message: `Connectors of type ${connector.connectorTypeId || 'unknown'} are not supported yet.`,
      });
      continue;
    }

    try {
      await handler({ connector, http, renderedPayload: payload });
      results.push({ connector, status: 'success' });
    } catch (error) {
      results.push({
        connector,
        status: 'error',
        message: getErrorMessage(error),
      });
    }
  }

  return results;
};

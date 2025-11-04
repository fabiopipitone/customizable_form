import type { CoreStart } from '@kbn/core/public';
import type { FormConnectorConfig } from '../components/form_builder/types';

export type ConnectorExecutionStatus = 'success' | 'error';

export interface ConnectorExecutionResult {
  connector: FormConnectorConfig;
  status: ConnectorExecutionStatus;
  message?: string;
}

export interface ExecuteFormConnectorsParams {
  http: CoreStart['http'];
  connectors: FormConnectorConfig[];
  renderedPayloads: Record<string, string>;
}

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch (e) {
      return String(error);
    }
  }
  return String(error);
};

const executeIndexConnector = async (
  http: CoreStart['http'],
  connector: FormConnectorConfig,
  payload: string
): Promise<ConnectorExecutionResult> => {
  if (!connector.connectorId) {
    return {
      connector,
      status: 'error',
      message: 'Connector is missing an identifier.',
    };
  }

  const trimmed = payload.trim();
  if (!trimmed) {
    return {
      connector,
      status: 'error',
      message: 'Rendered payload is empty.',
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return {
      connector,
      status: 'error',
      message: `Unable to parse payload as JSON: ${getErrorMessage(error)}`,
    };
  }

  const documents = Array.isArray(parsed) ? parsed : [parsed];

  try {
    await http.post(`/api/actions/connector/${encodeURIComponent(connector.connectorId)}/_execute`, {
      body: JSON.stringify({
        params: {
          documents,
        },
      }),
    });

    return {
      connector,
      status: 'success',
    };
  } catch (error) {
    return {
      connector,
      status: 'error',
      message: getErrorMessage(error),
    };
  }
};

export const executeFormConnectors = async ({
  http,
  connectors,
  renderedPayloads,
}: ExecuteFormConnectorsParams): Promise<ConnectorExecutionResult[]> => {
  const results: ConnectorExecutionResult[] = [];

  for (const connector of connectors) {
    const payload = renderedPayloads[connector.id] ?? '';

    if (!connector.connectorId) {
      results.push({
        connector,
        status: 'error',
        message: 'Connector is missing an identifier.',
      });
      continue;
    }

    switch (connector.connectorTypeId) {
      case '.index': {
        const result = await executeIndexConnector(http, connector, payload);
        results.push(result);
        break;
      }
      default:
        results.push({
          connector,
          status: 'error',
          message: `Connectors of type ${connector.connectorTypeId || 'unknown'} are not supported yet.`,
        });
        break;
    }
  }

  return results;
};

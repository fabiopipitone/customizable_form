import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import type { ActionType } from '@kbn/actions-types';

import type { FormConfig, SupportedConnectorTypeId } from '../types';
import type { ConnectorSummaryItem, ConnectorSummaryStatus } from '../connector_summary';
import { DEFAULT_CONNECTOR_SUMMARY_STATUS } from '../connector_summary';

export interface ConnectorSelectionStateEntry {
  connectorsForType: Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>;
  availableConnectors: Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>;
  hasType: boolean;
  hasSelection: boolean;
}

interface UseConnectorStateParams {
  formConfig: FormConfig;
  connectorTypes: Array<ActionType & { id: SupportedConnectorTypeId }>;
  connectors: Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>;
  isLoadingConnectors: boolean;
  templateValidationByConnector: Record<
    string,
    { missing: string[]; unused: Array<{ key: string; label: string }> }
  >;
}

export const useConnectorState = ({
  formConfig,
  connectorTypes,
  connectors,
  isLoadingConnectors,
  templateValidationByConnector,
}: UseConnectorStateParams) => {
  const connectorSelectionState = useMemo(() => {
    const state: Record<string, ConnectorSelectionStateEntry> = {};

    formConfig.connectors.forEach((connectorConfig) => {
      const connectorsForType = connectorConfig.connectorTypeId
        ? connectors.filter((connector) => connector.actionTypeId === connectorConfig.connectorTypeId)
        : [];

      const takenConnectorIds = new Set(
        formConfig.connectors
          .filter((item) => item.id !== connectorConfig.id)
          .map((item) => item.connectorId)
          .filter((id): id is string => Boolean(id))
      );

      const availableConnectors = connectorsForType.filter(
        (connector) => connector.id === connectorConfig.connectorId || !takenConnectorIds.has(connector.id)
      );

      const hasType = Boolean(connectorConfig.connectorTypeId);
      const hasSelection =
        hasType &&
        Boolean(connectorConfig.connectorId) &&
        availableConnectors.some((connector) => connector.id === connectorConfig.connectorId);

      state[connectorConfig.id] = {
        connectorsForType,
        availableConnectors,
        hasType,
        hasSelection,
      };
    });

    return state;
  }, [formConfig.connectors, connectors]);

  const connectorStatusById = useMemo(() => {
    const status: Record<string, ConnectorSummaryStatus> = {};

    formConfig.connectors.forEach((connectorConfig) => {
      const selection = connectorSelectionState[connectorConfig.id];
      const validation = templateValidationByConnector[connectorConfig.id] ?? {
        missing: [],
        unused: [],
      };

      const hasLabelError = !(connectorConfig.label || '').trim();
      const hasType = selection?.hasType ?? false;
      const hasSelection = selection?.hasSelection ?? false;
      const availableCount = selection?.availableConnectors.length ?? 0;

      const hasSelectionWarning = !isLoadingConnectors && hasType && availableCount === 0;
      const hasSelectionError = hasType && !hasSelection;
      const hasTypeError = !hasType;

      const hasWarning = hasSelectionWarning;
      const hasError = hasLabelError || hasSelectionError || hasTypeError;

      const hasTemplateError = validation.missing.length > 0;
      const hasTemplateWarning = validation.unused.length > 0;

      status[connectorConfig.id] = {
        hasWarning,
        hasError,
        hasTemplateWarning,
        hasTemplateError,
      };
    });

    return status;
  }, [formConfig.connectors, connectorSelectionState, templateValidationByConnector, isLoadingConnectors]);

  const connectorSummaries = useMemo(() => {
    return formConfig.connectors.map((connectorConfig, index) => ({
      config: connectorConfig,
      type: connectorTypes.find((type) => type.id === connectorConfig.connectorTypeId) ?? null,
      connector:
        connectors.find((connectorInstance) => connectorInstance.id === connectorConfig.connectorId) ??
        null,
      label:
        (connectorConfig.label || '').trim() ||
        i18n.translate('customizableForm.builder.connectorFallbackLabel', {
          defaultMessage: 'Connector {number}',
          values: { number: index + 1 },
        }),
      status: connectorStatusById[connectorConfig.id] ?? DEFAULT_CONNECTOR_SUMMARY_STATUS,
    }));
  }, [formConfig.connectors, connectorTypes, connectors, connectorStatusById]);

  const connectorSummaryItems = useMemo<ConnectorSummaryItem[]>(() => {
    return connectorSummaries.map((summary, index) => {
      const connectorName =
        summary.connector?.name ??
        i18n.translate('customizableForm.builder.connectorSummary.connectorFallback', {
          defaultMessage: 'Unnamed connector {index}',
          values: { index: index + 1 },
        });
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
  }, [connectorSummaries]);

  return {
    connectorSelectionState,
    connectorStatusById,
    connectorSummaries,
    connectorSummaryItems,
  };
};

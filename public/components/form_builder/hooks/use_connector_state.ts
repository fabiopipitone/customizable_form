import { useMemo } from 'react';
import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import type { ActionType } from '@kbn/actions-types';

import type { FormConfig, FormConnectorConfig, SupportedConnectorTypeId } from '../types';
import type { ConnectorSummaryItem, ConnectorSummaryStatus } from '../connector_summary';
import {
  buildConnectorSummaries,
  buildConnectorSummaryItems,
} from '../utils/shared';

export interface ConnectorSelectionStateEntry {
  connectorsForType: Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>;
  availableConnectors: Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>;
  hasType: boolean;
  hasSelection: boolean;
}

export interface ConnectorSummaryEntry {
  config: FormConnectorConfig;
  type: ActionType & { id: SupportedConnectorTypeId } | null;
  connector: ActionConnector & { actionTypeId: SupportedConnectorTypeId } | null;
  label: string;
  status: ConnectorSummaryStatus;
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

  const connectorSummaries = useMemo<ConnectorSummaryEntry[]>(
    () =>
      buildConnectorSummaries({
        formConfig,
        connectorTypes,
        connectors,
        connectorStatusById,
      }),
    [formConfig, connectorTypes, connectors, connectorStatusById]
  );

  const connectorSummaryItems = useMemo<ConnectorSummaryItem[]>(
    () => buildConnectorSummaryItems(connectorSummaries),
    [connectorSummaries]
  );

  return {
    connectorSelectionState,
    connectorStatusById,
    connectorSummaries,
    connectorSummaryItems,
  };
};

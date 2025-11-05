import { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import type { CoreStart } from '@kbn/core/public';
import { loadActionTypes, loadAllActions } from '@kbn/triggers-actions-ui-plugin/public/common/constants';
import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import type { ActionType } from '@kbn/actions-types';

import type { SupportedConnectorTypeId } from './types';

const CONNECTOR_TYPE_CANONICAL: Record<string, SupportedConnectorTypeId> = {
  '.index': '.index',
  index: '.index',
  '.webhook': '.webhook',
  webhook: '.webhook',
};

export const getCanonicalConnectorTypeId = (id?: string | null): SupportedConnectorTypeId | null => {
  if (!id) return null;
  return CONNECTOR_TYPE_CANONICAL[id] ?? null;
};

const getErrorMessage = (error: unknown): string => {
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

export interface ConnectorsData {
  connectorTypes: Array<ActionType & { id: SupportedConnectorTypeId }>;
  connectors: Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>;
  isLoadingConnectorTypes: boolean;
  isLoadingConnectors: boolean;
  connectorTypesError: string | null;
  connectorsError: string | null;
  reloadConnectorTypes: () => void;
  reloadConnectors: () => void;
}

interface UseConnectorsDataParams {
  http: CoreStart['http'];
  toasts: CoreStart['notifications']['toasts'];
}

export const useConnectorsData = ({ http, toasts }: UseConnectorsDataParams): ConnectorsData => {
  const [connectorTypes, setConnectorTypes] = useState<
    Array<ActionType & { id: SupportedConnectorTypeId }>
  >([]);
  const [connectors, setConnectors] = useState<
    Array<ActionConnector & { actionTypeId: SupportedConnectorTypeId }>
  >([]);
  const [isLoadingConnectorTypes, setIsLoadingConnectorTypes] = useState(false);
  const [isLoadingConnectors, setIsLoadingConnectors] = useState(false);
  const [connectorTypesError, setConnectorTypesError] = useState<string | null>(null);
  const [connectorsError, setConnectorsError] = useState<string | null>(null);
  const [connectorTypesReloadToken, setConnectorTypesReloadToken] = useState(0);
  const [connectorsReloadToken, setConnectorsReloadToken] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadConnectorTypesFx = async () => {
      setIsLoadingConnectorTypes(true);
      setConnectorTypesError(null);

      try {
        const response = await loadActionTypes({
          http,
          includeSystemActions: false,
        });

        if (!isMounted) return;

        const filtered = response
          .map((type) => {
            const canonicalId = getCanonicalConnectorTypeId(type.id);
            return canonicalId
              ? ({ ...type, id: canonicalId } as ActionType & { id: SupportedConnectorTypeId })
              : null;
          })
          .filter((t): t is ActionType & { id: SupportedConnectorTypeId } => t !== null)
          .sort((a, b) => a.name.localeCompare(b.name));

        setConnectorTypes(filtered);
      } catch (error) {
        if (abortController.signal.aborted || !isMounted) return;
        const message = getErrorMessage(error);
        setConnectorTypesError(message);
        toasts.addDanger({
          title: i18n.translate('customizableForm.builder.loadConnectorTypesErrorTitle', {
            defaultMessage: 'Unable to load connector types',
          }),
          text: message,
        });
      } finally {
        if (isMounted) setIsLoadingConnectorTypes(false);
      }
    };

    loadConnectorTypesFx();
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [http, toasts, connectorTypesReloadToken]);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    const loadConnectorsFx = async () => {
      setIsLoadingConnectors(true);
      setConnectorsError(null);

      try {
        const response = await loadAllActions({
          http,
          includeSystemActions: false,
        });

        if (!isMounted) return;

        const filtered = response
          .map((connector) => {
            const rawType: string | undefined =
              (connector as any).actionTypeId ?? (connector as any).connector_type_id;

            const canonicalId = getCanonicalConnectorTypeId(rawType);
            return canonicalId
              ? ({
                  ...connector,
                  actionTypeId: canonicalId,
                } as ActionConnector & { actionTypeId: SupportedConnectorTypeId })
              : null;
          })
          .filter(
            (c): c is ActionConnector & { actionTypeId: SupportedConnectorTypeId } => c !== null
          )
          .sort((a, b) => a.name.localeCompare(b.name));

        setConnectors(filtered);
      } catch (error) {
        if (abortController.signal.aborted || !isMounted) return;
        const message = getErrorMessage(error);
        setConnectorsError(message);
        toasts.addDanger({
          title: i18n.translate('customizableForm.builder.loadConnectorsErrorTitle', {
            defaultMessage: 'Unable to load connectors',
          }),
          text: message,
        });
      } finally {
        if (isMounted) setIsLoadingConnectors(false);
      }
    };

    loadConnectorsFx();
    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [http, toasts, connectorsReloadToken]);

  const reloadConnectorTypes = () => setConnectorTypesReloadToken((value) => value + 1);
  const reloadConnectors = () => setConnectorsReloadToken((value) => value + 1);

  return useMemo(
    () => ({
      connectorTypes,
      connectors,
      isLoadingConnectorTypes,
      isLoadingConnectors,
      connectorTypesError,
      connectorsError,
      reloadConnectorTypes,
      reloadConnectors,
    }),
    [
      connectorTypes,
      connectors,
      isLoadingConnectorTypes,
      isLoadingConnectors,
      connectorTypesError,
      connectorsError,
    ]
  );
};

import { useCallback, useMemo, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { FormConfig } from '../types';
import { executeFormConnectors } from '../../../services/execute_connectors';

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

export interface UseConnectorExecutionParams {
  http: CoreStart['http'];
  toasts: CoreStart['notifications']['toasts'];
  formConfig: FormConfig | null;
  renderedPayloads: Record<string, string>;
  connectorLabelsById: Record<string, string>;
}

export const useConnectorExecution = ({
  http,
  toasts,
  formConfig,
  renderedPayloads,
  connectorLabelsById,
}: UseConnectorExecutionParams) => {
  const [isExecuting, setIsExecuting] = useState(false);

  const hasConnectors = useMemo(() => Boolean(formConfig && formConfig.connectors.length > 0), [formConfig]);

  const executeNow = useCallback(async () => {
    if (!formConfig || formConfig.connectors.length === 0) {
      toasts.addWarning({
        title: i18n.translate('customizableForm.executeConnectors.noConnectorsTitle', {
          defaultMessage: 'No connectors configured',
        }),
        text: i18n.translate('customizableForm.executeConnectors.noConnectorsBody', {
          defaultMessage: 'Add at least one connector before submitting the form.',
        }),
      });
      return;
    }

    setIsExecuting(true);

    try {
      const results = await executeFormConnectors({
        http,
        connectors: formConfig.connectors,
        renderedPayloads,
      });

      const successes = results.filter((result) => result.status === 'success');
      const errors = results.filter((result) => result.status === 'error');

      successes.forEach((result) => {
        const label =
          connectorLabelsById[result.connector.id] ??
          result.connector.label ??
          result.connector.id;
        toasts.addSuccess({
          title: i18n.translate('customizableForm.executeConnectors.successTitle', {
            defaultMessage: 'Connector executed',
          }),
          text: i18n.translate('customizableForm.executeConnectors.successBody', {
            defaultMessage: '{label} executed successfully.',
            values: { label },
          }),
        });
      });

      errors.forEach((result) => {
        const label =
          connectorLabelsById[result.connector.id] ??
          result.connector.label ??
          result.connector.id;
        toasts.addDanger({
          title: i18n.translate('customizableForm.executeConnectors.errorTitle', {
            defaultMessage: 'Connector execution failed',
          }),
          text:
            result.message ??
            i18n.translate('customizableForm.executeConnectors.errorBody', {
              defaultMessage: 'Unable to execute {label}.',
              values: { label },
            }),
        });
      });
    } catch (error) {
      toasts.addDanger({
        title: i18n.translate('customizableForm.executeConnectors.unexpectedErrorTitle', {
          defaultMessage: 'Submit failed',
        }),
        text: getErrorMessage(error),
      });
    } finally {
      setIsExecuting(false);
    }
  }, [formConfig, renderedPayloads, http, toasts, connectorLabelsById]);

  return {
    executeNow,
    isExecuting,
    hasConnectors,
  };
};

import { useCallback, useMemo, useState } from 'react';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';

import type { FormConfig } from '../types';
import type { ExecuteConnectorHandlerMap } from '../utils/shared';
import { executeConnectorHandlers } from '../utils/shared';
import { getErrorMessage } from '../utils/form_helpers';
import { logSubmission } from '../../../services/submission_logger';
import { SUBMISSION_TIMESTAMP_VARIABLE } from '../constants';

export interface UseConnectorExecutionParams {
  http: CoreStart['http'];
  toasts: CoreStart['notifications']['toasts'];
  formConfig: FormConfig | null;
  buildRenderedPayloads: (extraVariables?: Record<string, string>) => Record<string, string>;
  fieldValues: Record<string, string>;
  connectorLabelsById: Record<string, string>;
  handlers?: ExecuteConnectorHandlerMap;
}

export const useConnectorExecution = ({
  http,
  toasts,
  formConfig,
  buildRenderedPayloads,
  fieldValues,
  connectorLabelsById,
  handlers,
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
      const submissionTimestamp = new Date().toISOString();
      const renderedPayloads = buildRenderedPayloads({
        [SUBMISSION_TIMESTAMP_VARIABLE]: submissionTimestamp,
      });

      const fieldsLog = formConfig.fields.reduce<Record<string, unknown>>((acc, field) => {
        const key = field.key.trim();
        if (!key) {
          return acc;
        }
        acc[key] = fieldValues[field.id] ?? '';
        return acc;
      }, {});

      const connectorsLog = formConfig.connectors.map((connector) => {
        const raw = renderedPayloads[connector.id] ?? '';
        let payload: unknown = raw;
        try {
          payload = raw ? JSON.parse(raw) : raw;
        } catch {
          // keep string
        }
        return {
          id: connector.id,
          label: connector.label?.trim() || undefined,
          type: connector.connectorTypeId?.replace(/^\./, '') ?? connector.connectorTypeId,
          connector_id: connector.connectorId || undefined,
          payload,
          raw_payload: raw,
        };
      });

      logSubmission(http, {
        '@timestamp': submissionTimestamp,
        form_title: formConfig.title,
        form_description: formConfig.description,
        fields: fieldsLog,
        connectors: connectorsLog,
      }).catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.debug('customizableForm: failed to log submission', error);
      });

      const results = await executeConnectorHandlers({
        http,
        connectors: formConfig.connectors,
        renderedPayloads,
        customHandlers: handlers,
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
  }, [formConfig, buildRenderedPayloads, http, fieldValues, toasts, connectorLabelsById, handlers]);

  return {
    executeNow,
    isExecuting,
    hasConnectors,
  };
};

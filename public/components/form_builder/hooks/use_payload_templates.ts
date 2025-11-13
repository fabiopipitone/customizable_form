import { useMemo } from 'react';

import type { FormConfig, SupportedConnectorTypeId } from '../types';
import { getTemplateVariables, renderConnectorPayload } from '../utils/shared';
import { validateConnectorPayloadTemplate } from '../validation/payloads';

export interface ConnectorTemplateValidation {
  missing: string[];
  unused: Array<{ key: string; label: string }>;
  errors: string[];
  warnings: string[];
}

interface UsePayloadTemplatesParams {
  formConfig: FormConfig | null;
  fieldValues: Record<string, string>;
}

export const usePayloadTemplates = ({ formConfig, fieldValues }: UsePayloadTemplatesParams) => {
  const connectors = formConfig?.connectors ?? [];
  const fields = formConfig?.fields ?? [];

  const renderedPayloads = useMemo(() => {
    if (!formConfig) {
      return {};
    }

    return connectors.reduce<Record<string, string>>((acc, connectorConfig) => {
      acc[connectorConfig.id] = renderConnectorPayload({
        connectorConfig,
        fields,
        fieldValues,
      });
      return acc;
    }, {});
  }, [formConfig, connectors, fields, fieldValues]);

  const templateValidationByConnector = useMemo(() => {
    if (!formConfig) {
      return {};
    }

    const definedKeys = new Set(fields.map((field) => field.key.trim()).filter((key) => key.length > 0));
    return connectors.reduce<Record<string, ConnectorTemplateValidation>>((acc, connectorConfig) => {
      const variables = getTemplateVariables(connectorConfig.documentTemplate);
      const missing = variables.filter((variable) => !definedKeys.has(variable));
      const usedVariables = new Set(variables);
      const unused = fields
        .map((field) => {
          const key = field.key.trim();
          if (!key || usedVariables.has(key)) {
            return null;
          }
          return {
            key,
            label: field.label?.trim() || key,
          };
        })
        .filter((field): field is { key: string; label: string } => field !== null);

      const { errors, warnings } = validateConnectorPayloadTemplate({
        connectorTypeId: connectorConfig.connectorTypeId as SupportedConnectorTypeId | '' | null,
        template: connectorConfig.documentTemplate,
      });

      acc[connectorConfig.id] = {
        missing,
        unused,
        errors,
        warnings,
      };
      return acc;
    }, {});
  }, [formConfig, connectors, fields]);

  return {
    renderedPayloads,
    templateValidationByConnector,
  };
};

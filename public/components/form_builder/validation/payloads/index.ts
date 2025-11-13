import type { SupportedConnectorTypeId } from '../../types';
import { validateEmailPayload } from './email';
import { validateJiraPayload } from './jira';
import { validateTeamsPayload } from './teams';
import type {
  ConnectorPayloadValidationResult,
  ConnectorPayloadValidator,
} from './types';

const CONNECTOR_PAYLOAD_VALIDATORS: Partial<Record<SupportedConnectorTypeId, ConnectorPayloadValidator>> = {
  '.email': validateEmailPayload,
  '.jira': validateJiraPayload,
  '.teams': validateTeamsPayload,
};

export const validateConnectorPayloadTemplate = ({
  connectorTypeId,
  template,
}: {
  connectorTypeId: SupportedConnectorTypeId | '' | null | undefined;
  template: string;
}): ConnectorPayloadValidationResult => {
  if (!connectorTypeId) {
    return { errors: [], warnings: [] };
  }

  const validator = CONNECTOR_PAYLOAD_VALIDATORS[connectorTypeId];
  return validator ? validator(template) : { errors: [], warnings: [] };
};

export interface ConnectorPayloadValidationResult {
  errors: string[];
  warnings: string[];
}

export type ConnectorPayloadValidator = (template: string) => ConnectorPayloadValidationResult;

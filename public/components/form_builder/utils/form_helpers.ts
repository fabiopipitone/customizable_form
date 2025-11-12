import type { FormFieldConfig, SupportedConnectorTypeId } from '../types';

export const getErrorMessage = (error: unknown): string => {
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

export const buildInitialFieldValues = (fields: FormFieldConfig[]): Record<string, string> =>
  fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.id] = '';
    return acc;
  }, {});

export const DEFAULT_PAYLOAD_TEMPLATE = `{
  "event_timestamp": "{{timestamp}}",
  "event_id": "{{id}}",
  "event_message": "This is an alert raised via Customizable Form. Here's the message: {{message}}"
}`;

export const DEFAULT_EMAIL_PAYLOAD_TEMPLATE = `{
  "to": ["<target email address>"],
  "subject": "<email subject>",
  "message": "<email message>"
}`;

const CONNECTOR_TEMPLATE_OVERRIDES: Partial<Record<SupportedConnectorTypeId, string>> = {
  '.email': DEFAULT_EMAIL_PAYLOAD_TEMPLATE,
};

export const getDefaultTemplateForConnectorType = (
  typeId?: SupportedConnectorTypeId | '' | null
): string => {
  if (!typeId) {
    return DEFAULT_PAYLOAD_TEMPLATE;
  }
  return CONNECTOR_TEMPLATE_OVERRIDES[typeId] ?? DEFAULT_PAYLOAD_TEMPLATE;
};

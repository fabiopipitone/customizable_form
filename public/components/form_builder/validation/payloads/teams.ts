import type { ConnectorPayloadValidationResult } from './types';

export const validateTeamsPayload = (template: string): ConnectorPayloadValidationResult => {
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(template);
  } catch (error) {
    errors.push(
      `Teams payload template must be valid JSON: ${(error as Error)?.message ?? String(error)}`
    );
    return { errors, warnings: [] };
  }

  if (!isPlainObject(parsed)) {
    errors.push('Teams payload template must be a JSON object.');
    return { errors, warnings: [] };
  }

  const { message, ...rest } = parsed as Record<string, unknown>;
  if (Object.keys(rest).length > 0) {
    errors.push(
      `Teams payload contains unsupported properties: ${Object.keys(rest)
        .map((key) => `"${key}"`)
        .join(', ')}.`
    );
  }

  if (typeof message !== 'string' || !message.trim()) {
    errors.push('Field "message" is required and must be a non-empty string.');
  }

  return { errors, warnings: [] };
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

import type { SupportedConnectorTypeId } from '../types';

export const validateConnectorPayloadTemplate = ({
  connectorTypeId,
  template,
}: {
  connectorTypeId: SupportedConnectorTypeId | '' | null | undefined;
  template: string;
}): string[] => {
  if (!connectorTypeId) {
    return [];
  }

  const validator = CONNECTOR_PAYLOAD_VALIDATORS[connectorTypeId];
  return validator ? validator(template) : [];
};

type ConnectorPayloadValidator = (template: string) => string[];

const CONNECTOR_PAYLOAD_VALIDATORS: Partial<Record<SupportedConnectorTypeId, ConnectorPayloadValidator>> = {
  '.email': validateEmailPayload,
};

function validateEmailPayload(template: string): string[] {
  const errors: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(template);
  } catch (error) {
    errors.push(
      `Email payload template must be valid JSON: ${(error as Error)?.message ?? String(error)}`
    );
    return errors;
  }

  if (!isPlainObject(parsed)) {
    errors.push('Email payload template must be a JSON object.');
    return errors;
  }

  const {
    to,
    cc,
    bcc,
    subject,
    message,
    messageHTML,
    kibanaFooterLink,
    attachments,
    ...rest
  } = parsed;

  const unexpectedKeys = Object.keys(rest);
  if (unexpectedKeys.length > 0) {
    errors.push(
      `Email payload contains unsupported properties: ${unexpectedKeys
        .map((key) => `"${key}"`)
        .join(', ')}.`
    );
  }

  const toList = ensureStringArray(to, 'to', errors);
  const ccList = ensureStringArray(cc, 'cc', errors);
  const bccList = ensureStringArray(bcc, 'bcc', errors);

  if ((toList?.length ?? 0) + (ccList?.length ?? 0) + (bccList?.length ?? 0) === 0) {
    errors.push('Provide at least one recipient across "to", "cc", or "bcc".');
  }

  if (typeof subject !== 'string' || !subject.trim()) {
    errors.push('Field "subject" is required and must be a non-empty string.');
  }

  if (typeof message !== 'string' || !message.trim()) {
    errors.push('Field "message" is required and must be a non-empty string.');
  }

  if (messageHTML != null && typeof messageHTML !== 'string') {
    errors.push('Field "messageHTML" must be a string or null.');
  }

  if (kibanaFooterLink != null) {
    if (!isPlainObject(kibanaFooterLink)) {
      errors.push('Field "kibanaFooterLink" must be an object.');
    } else {
      const { path, text, ...extra } = kibanaFooterLink as Record<string, unknown>;
      if (path != null && typeof path !== 'string') {
        errors.push('Field "kibanaFooterLink.path" must be a string.');
      }
      if (text != null && typeof text !== 'string') {
        errors.push('Field "kibanaFooterLink.text" must be a string.');
      }
      const extraKeys = Object.keys(extra);
      if (extraKeys.length > 0) {
        errors.push(
          `Field "kibanaFooterLink" contains unsupported properties: ${extraKeys
            .map((key) => `"${key}"`)
            .join(', ')}.`
        );
      }
    }
  }

  if (attachments != null) {
    if (!Array.isArray(attachments)) {
      errors.push('Field "attachments" must be an array.');
    } else {
      attachments.forEach((attachment, index) => {
        if (!isPlainObject(attachment)) {
          errors.push(`Attachment #${index + 1} must be an object.`);
          return;
        }
        const { content, filename, contentType, encoding, ...extra } = attachment as Record<
          string,
          unknown
        >;
        if (typeof content !== 'string' || !content.length) {
          errors.push(`Attachment #${index + 1} must include a non-empty "content" string.`);
        }
        if (typeof filename !== 'string' || !filename.length) {
          errors.push(`Attachment #${index + 1} must include a non-empty "filename" string.`);
        }
        if (contentType != null && typeof contentType !== 'string') {
          errors.push(`Attachment #${index + 1} has invalid "contentType"; expected string.`);
        }
        if (encoding != null && typeof encoding !== 'string') {
          errors.push(`Attachment #${index + 1} has invalid "encoding"; expected string.`);
        }
        const extraAttachmentKeys = Object.keys(extra);
        if (extraAttachmentKeys.length > 0) {
          errors.push(
            `Attachment #${index + 1} contains unsupported properties: ${extraAttachmentKeys
              .map((key) => `"${key}"`)
              .join(', ')}.`
          );
        }
      });
    }
  }

  return errors;
}

function ensureStringArray(
  value: unknown,
  field: string,
  errors: string[]
): string[] | undefined {
  if (value == null) {
    return [];
  }
  if (!Array.isArray(value)) {
    errors.push(`Field "${field}" must be an array of strings.`);
    return undefined;
  }
  const invalid = value.some((item) => typeof item !== 'string');
  if (invalid) {
    errors.push(`Field "${field}" must be an array of strings.`);
    return undefined;
  }
  return value as string[];
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

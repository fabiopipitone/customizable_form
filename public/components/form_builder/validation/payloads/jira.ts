import type { ConnectorPayloadValidationResult } from './types';

const ALLOWED_INCIDENT_KEYS = new Set([
  'summary',
  'description',
  'issueType',
  'priority',
  'labels',
  'parent',
]);

export const validateJiraPayload = (template: string): ConnectorPayloadValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];
  let parsed: unknown;

  try {
    parsed = JSON.parse(template);
  } catch (error) {
    errors.push(
      `Jira payload template must be valid JSON: ${(error as Error)?.message ?? String(error)}`
    );
    return { errors, warnings };
  }

  if (!isPlainObject(parsed)) {
    errors.push('Jira payload template must be a JSON object.');
    return { errors, warnings };
  }

  const { subAction, subActionParams, ...rest } = parsed as Record<string, unknown>;
  if (Object.keys(rest).length > 0) {
    errors.push(
      `Jira payload contains unsupported properties: ${Object.keys(rest)
        .map((key) => `"${key}"`)
        .join(', ')}.`
    );
  }

  if (subAction !== 'pushToService') {
    errors.push('Field "subAction" must be set to "pushToService".');
  }

  if (!isPlainObject(subActionParams)) {
    errors.push('Field "subActionParams" must be an object.');
    return { errors, warnings };
  }

  const { incident, comments, ...extraParams } = subActionParams as Record<string, unknown>;
  if (Object.keys(extraParams).length > 0) {
    errors.push(
      `Field "subActionParams" contains unsupported properties: ${Object.keys(extraParams)
        .map((key) => `"${key}"`)
        .join(', ')}.`
    );
  }

  if (!isPlainObject(incident)) {
    errors.push('Field "subActionParams.incident" must be an object.');
  } else {
    const incidentRecord = incident as Record<string, unknown>;
    const {
      summary,
      description,
      issueType,
      priority,
      labels,
      parent,
      ...incidentRest
    } = incidentRecord;

    if (Object.keys(incidentRest).length > 0) {
      errors.push(
        `Incident contains unsupported properties: ${Object.keys(incidentRest)
          .map((key) => `"${key}"`)
          .join(', ')}. Allowed keys: ${Array.from(ALLOWED_INCIDENT_KEYS)
          .map((key) => `"${key}"`)
          .join(', ')}.`
      );
    }

    if (typeof summary !== 'string' || !summary.trim()) {
      errors.push('Incident "summary" is required and must be a non-empty string.');
    }

    if (issueType != null) {
      if (typeof issueType !== 'string' || !issueType.trim()) {
        errors.push('Incident "issueType" must be a non-empty string when provided.');
      } else {
        warnings.push(
          'Ensure the provided issueType matches the Jira project (use the ID returned by the connector if required).'
        );
      }
    }

    if (priority != null) {
      if (typeof priority !== 'string' || !priority.trim()) {
        errors.push('Incident "priority" must be a non-empty string when provided.');
      } else {
        warnings.push(
          'Ensure the provided priority matches the Jira project (use the ID returned by the connector if required).'
        );
      }
    }

    if (description != null && typeof description !== 'string') {
      errors.push('Incident "description" must be a string when provided.');
    }

    if (labels != null) {
      if (!Array.isArray(labels)) {
        errors.push('Incident "labels" must be an array of strings.');
      } else if (labels.some((label) => typeof label !== 'string')) {
        errors.push('Incident "labels" must be an array of strings.');
      }
    }

    if (parent != null) {
      if (typeof parent !== 'string') {
        errors.push('Incident "parent" must be a string when provided.');
      } else {
        warnings.push(
          'Ensure the specified parent issue already exists in Jira; otherwise the connector execution may fail.'
        );
      }
    }
  }

  if (comments != null) {
    if (!Array.isArray(comments)) {
      errors.push('Field "comments" must be an array.');
    } else {
      comments.forEach((comment, index) => {
        if (!isPlainObject(comment)) {
          errors.push(`Comment #${index + 1} must be an object.`);
          return;
        }
        const { comment: body, ...restComment } = comment as Record<string, unknown>;
        if (typeof body !== 'string' || !body.trim()) {
          errors.push(`Comment #${index + 1} must include a non-empty "comment" string.`);
        }
        if (Object.keys(restComment).length > 0) {
          errors.push(
            `Comment #${index + 1} contains unsupported properties: ${Object.keys(restComment)
              .map((key) => `"${key}"`)
              .join(', ')}.`
          );
        }
      });
    }
  }

  return { errors, warnings };
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

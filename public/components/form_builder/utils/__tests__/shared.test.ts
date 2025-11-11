import { renderConnectorPayload, getTemplateVariables } from '../shared';
import type { FormConnectorConfig, FormFieldConfig } from '../../types';

const connector = (template: string): FormConnectorConfig => ({
  id: 'connector-1',
  connectorTypeId: '.webhook',
  connectorId: 'abc',
  label: 'Webhook',
  documentTemplate: template,
  isLabelAuto: true,
});

const formField = (overrides: Partial<FormFieldConfig>): FormFieldConfig => ({
  id: overrides.id ?? 'field-1',
  key: overrides.key ?? 'field_1',
  label: overrides.label ?? 'Field 1',
  placeholder: '',
  type: 'text',
  required: false,
  dataType: 'string',
  size: { min: 0, max: 10 },
  ...overrides,
});

describe('renderConnectorPayload', () => {
  it('replaces all template variables with the matching field values', () => {
    const fields = [
      formField({ id: 'field-1', key: 'message' }),
      formField({ id: 'field-2', key: 'severity' }),
    ];
    const fieldValues = {
      'field-1': 'Disk failing',
      'field-2': 'high',
    };
    const template = `{"alert": "{{message}}", "severity": "{{ severity }}", "fixed": "value"}`;

    expect(renderConnectorPayload({ connectorConfig: connector(template), fields, fieldValues })).toEqual(
      `{"alert": "Disk failing", "severity": "high", "fixed": "value"}`
    );
  });

  it('replaces missing variables with empty strings', () => {
    const fields = [formField({ id: 'field-1', key: 'present' })];
    const template = `{{present}}|{{missing}}`;

    expect(renderConnectorPayload({ connectorConfig: connector(template), fields, fieldValues: { 'field-1': 'yes' } }))
      .toEqual(`yes|`);
  });

  it('returns the original template when no variables exist', () => {
    const fields = [formField({ id: 'field-1', key: 'unused' })];
    const template = `constant text`;

    expect(renderConnectorPayload({ connectorConfig: connector(template), fields, fieldValues: { 'field-1': 'foo' } }))
      .toEqual('constant text');
  });
});

describe('getTemplateVariables', () => {
  it('extracts unique trimmed variables in the order they appear', () => {
    const template = `
      {"one": "{{var1}}", "two": "{{  var2 }}", "dup": "{{var1}}", "spaced": "{{   var3   }}"}
    `;

    expect(getTemplateVariables(template)).toEqual(['var1', 'var2', 'var3']);
  });
});

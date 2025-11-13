import { renderConnectorPayload, getTemplateVariables, executeConnectorHandlers } from '../shared';
import type { FormConnectorConfig, FormFieldConfig } from '../../types';
import type { CoreStart } from '@kbn/core/public';

const mockHttp = () =>
  ({
    post: jest.fn().mockResolvedValue({}),
  } as unknown as CoreStart['http']);

const connectorConfig = (overrides: Partial<FormConnectorConfig>): FormConnectorConfig => ({
  id: overrides.id ?? 'connector-1',
  connectorTypeId: overrides.connectorTypeId ?? '.index',
  connectorId: overrides.connectorId ?? 'abc',
  label: overrides.label ?? 'Connector',
  documentTemplate: overrides.documentTemplate ?? '{"message":"{{msg}}"}',
  isLabelAuto: overrides.isLabelAuto ?? true,
});

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

  it('allows extra variables to override values', () => {
    const fields = [formField({ id: 'field-1', key: 'message' })];
    const template = `{{message}} {{__submission_timestamp__}}`;

    expect(
      renderConnectorPayload({
        connectorConfig: connector(template),
        fields,
        fieldValues: { 'field-1': 'hi' },
        extraVariables: { __submission_timestamp__: '2024-01-01T00:00:00Z' },
      })
    ).toEqual('hi 2024-01-01T00:00:00Z');
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

describe('executeConnectorHandlers', () => {
  it('executes supported connectors via http.post and returns success statuses', async () => {
    const http = mockHttp();
    const connectors = [connectorConfig({ id: 'conn-1', connectorTypeId: '.index' })];
    const renderedPayloads = { 'conn-1': '{"msg":"hi"}' };

    const results = await executeConnectorHandlers({
      http,
      connectors,
      renderedPayloads,
    });

    expect(http.post).toHaveBeenCalledWith('/api/actions/connector/abc/_execute', expect.any(Object));
    expect(results).toEqual([{ connector: connectors[0], status: 'success' }]);
  });

  it('returns an error when handler is missing', async () => {
    const http = mockHttp();
    const connectors = [connectorConfig({ id: 'conn-1', connectorTypeId: '.unsupported' as any })];

    const results = await executeConnectorHandlers({
      http,
      connectors,
      renderedPayloads: {},
    });

    expect(results[0]).toEqual({
      connector: connectors[0],
      status: 'error',
      message: 'Connectors of type .unsupported are not supported yet.',
    });
  });

  it('returns an error when connectorId is missing', async () => {
    const connectors = [connectorConfig({ id: 'conn-1', connectorId: '' })];
    const results = await executeConnectorHandlers({
      http: mockHttp(),
      connectors,
      renderedPayloads: {},
    });

    expect(results[0]).toEqual({
      connector: connectors[0],
      status: 'error',
      message: 'Connector is missing an identifier.',
    });
  });
});

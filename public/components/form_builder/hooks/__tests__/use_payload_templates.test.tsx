import { renderHook } from '@testing-library/react-hooks';

import { usePayloadTemplates } from '../use_payload_templates';
import type { FormConfig } from '../../types';

const formConfig = (overrides: Partial<FormConfig>): FormConfig => ({
  title: 'Test form',
  description: '',
  showTitle: true,
  showDescription: true,
  layoutColumns: 2,
  requireConfirmationOnSubmit: false,
  connectors: [],
  fields: [],
  ...overrides,
});

describe('usePayloadTemplates', () => {
  it('renders payloads for each connector', () => {
    const config = formConfig({
      fields: [
        {
          id: 'field-1',
          key: 'message',
          label: 'Message',
          placeholder: '',
          type: 'text',
          required: true,
          dataType: 'string',
          size: { min: 0, max: 10 },
        },
      ],
      connectors: [
        {
          id: 'conn-1',
          connectorTypeId: '.webhook',
          connectorId: 'abc',
          label: 'Hook',
          isLabelAuto: true,
          documentTemplate: '{"body":"{{message}}"}',
        },
      ],
    });

    const { result } = renderHook(() =>
      usePayloadTemplates({
        formConfig: config,
        fieldValues: { 'field-1': 'hello' },
      })
    );

    expect(result.current.renderedPayloads).toEqual({
      'conn-1': '{"body":"hello"}',
    });
  });

  it('flags missing and unused variables in validation', () => {
    const config = formConfig({
      fields: [
        {
          id: 'field-1',
          key: 'id',
          label: 'Id',
          placeholder: '',
          type: 'text',
          required: true,
          dataType: 'string',
          size: { min: 0, max: 10 },
        },
        {
          id: 'field-2',
          key: 'extra',
          label: 'Extra',
          placeholder: '',
          type: 'text',
          required: false,
          dataType: 'string',
          size: { min: 0, max: 10 },
        },
      ],
      connectors: [
        {
          id: 'conn-1',
          connectorTypeId: '.index',
          connectorId: '123',
          label: 'Index',
          isLabelAuto: true,
          documentTemplate: '{"id":"{{missing}}"}',
        },
      ],
    });

    const { result } = renderHook(() =>
      usePayloadTemplates({
        formConfig: config,
        fieldValues: { 'field-1': 'foo', 'field-2': 'bar' },
      })
    );

    expect(result.current.templateValidationByConnector['conn-1']).toEqual({
      missing: ['missing'],
      unused: [
        { key: 'id', label: 'Id' },
        { key: 'extra', label: 'Extra' },
      ],
      errors: [],
      warnings: [],
    });
  });

  it('validates email templates and surfaces errors', () => {
    const config = formConfig({
      fields: [],
      connectors: [
        {
          id: 'email-1',
          connectorTypeId: '.email',
          connectorId: 'email',
          label: 'Email',
          isLabelAuto: true,
          documentTemplate: '{"subject":"missing recipients","message":""}',
        },
      ],
    });

    const { result } = renderHook(() =>
      usePayloadTemplates({
        formConfig: config,
        fieldValues: {},
      })
    );

    expect(result.current.templateValidationByConnector['email-1'].errors).toEqual([
      'Provide at least one recipient across "to", "cc", or "bcc".',
      'Field "message" is required and must be a non-empty string.',
    ]);
    expect(result.current.templateValidationByConnector['email-1'].warnings).toEqual([]);
  });

  it('validates jira templates and surfaces errors', () => {
    const config = formConfig({
      fields: [],
      connectors: [
        {
          id: 'jira-1',
          connectorTypeId: '.jira',
          connectorId: 'jira',
          label: 'Jira',
          isLabelAuto: true,
          documentTemplate: '{"subAction":"pushToService","subActionParams":{"incident":{}}}',
        },
      ],
    });

    const { result } = renderHook(() =>
      usePayloadTemplates({
        formConfig: config,
        fieldValues: {},
      })
    );

    expect(result.current.templateValidationByConnector['jira-1'].errors).toEqual([
      'Incident "summary" is required and must be a non-empty string.',
    ]);
    expect(result.current.templateValidationByConnector['jira-1'].warnings).toEqual([]);
  });

  it('warns when Jira parent is provided', () => {
    const config = formConfig({
      fields: [],
      connectors: [
        {
          id: 'jira-parent',
          connectorTypeId: '.jira',
          connectorId: 'jira',
          label: 'Jira',
          isLabelAuto: true,
          documentTemplate:
            '{"subAction":"pushToService","subActionParams":{"incident":{"summary":"s","issueType":"10005","priority":"2","parent":"ABC-1"}}}',
        },
      ],
    });

    const { result } = renderHook(() =>
      usePayloadTemplates({
        formConfig: config,
        fieldValues: {},
      })
    );

    expect(result.current.templateValidationByConnector['jira-parent'].warnings).toEqual([
      'Ensure the provided issueType matches the Jira project (use the ID returned by the connector if required).',
      'Ensure the provided priority matches the Jira project (use the ID returned by the connector if required).',
      'Ensure the specified parent issue already exists in Jira; otherwise the connector execution may fail.',
    ]);
  });
});

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
    });
  });
});

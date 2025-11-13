import { renderHook } from '@testing-library/react';

import type { FormConfig } from '../../types';
import { useFieldValidation } from '../use_field_validation';

const buildFormConfig = (overrides: Partial<FormConfig> = {}): FormConfig => ({
  title: 'Form',
  description: '',
  showTitle: true,
  showDescription: true,
  layoutColumns: 2,
  requireConfirmationOnSubmit: false,
  connectors: [],
  fields: [
    {
      id: 'field-1',
      key: 'message',
      label: 'Message',
      type: 'text',
      required: true,
      dataType: 'string',
      size: { min: 2, max: 5 },
    },
    {
      id: 'field-2',
      key: 'count',
      label: 'Count',
      type: 'text',
      required: false,
      dataType: 'number',
      size: { min: 1, max: 10 },
    },
  ],
  ...overrides,
});

describe('useFieldValidation', () => {
  it('computes field validation and variable name validation maps', () => {
    const formConfig = buildFormConfig();
    const { result } = renderHook(() =>
      useFieldValidation({
        formConfig,
        fieldValues: {
          'field-1': 'hello world',
          'field-2': '0',
        },
      })
    );

    expect(result.current.fieldValidationById['field-1'].isOutOfRange).toBe(true);
    expect(result.current.fieldValidationById['field-2'].isOutOfRange).toBe(true);
    expect(result.current.variableNameValidationById['field-1'].isValid).toBe(true);
    expect(result.current.variableNameValidationById['field-2'].isValid).toBe(true);
    expect(result.current.hasFieldValidationWarnings).toBe(true);
    expect(result.current.hasInvalidVariableNames).toBe(false);
  });

  it('detects invalid or duplicate variable names', () => {
    const formConfig = buildFormConfig({
      fields: [
        {
          id: 'field-1',
          key: ' message ',
          label: 'Message',
          type: 'text',
          required: true,
          dataType: 'string',
        },
        {
          id: 'field-2',
          key: 'message',
          label: 'Message 2',
          type: 'text',
          required: false,
          dataType: 'string',
        },
      ],
    });

    const { result } = renderHook(() =>
      useFieldValidation({
        formConfig,
        fieldValues: {
          'field-1': 'ok',
          'field-2': 'ok',
        },
      })
    );

    expect(result.current.variableNameValidationById['field-1'].isValid).toBe(false);
    expect(result.current.variableNameValidationById['field-2'].isValid).toBe(false);
    expect(result.current.hasInvalidVariableNames).toBe(true);
    expect(result.current.hasFieldValidationWarnings).toBe(true);
  });

  it('rejects reserved submission timestamp variable name', () => {
    const formConfig = buildFormConfig({
      fields: [
        {
          id: 'field-1',
          key: '__submission_timestamp__',
          label: 'Reserved',
          type: 'text',
          required: false,
          dataType: 'string',
        },
      ],
    });

    const { result } = renderHook(() =>
      useFieldValidation({
        formConfig,
        fieldValues: { 'field-1': 'value' },
      })
    );

    expect(result.current.variableNameValidationById['field-1'].isValid).toBe(false);
    expect(result.current.hasInvalidVariableNames).toBe(true);
  });
});

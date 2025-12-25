import { deserializeFormConfig, serializeFormConfig } from '../serialization';
import type { FormConfig } from '../types';

const buildConfig = (overrides: Partial<FormConfig> = {}): FormConfig => ({
  title: 'Form',
  description: 'Desc',
  showTitle: true,
  showDescription: false,
  layoutColumns: 3,
  requireConfirmationOnSubmit: false,
  connectors: [
    {
      id: 'conn-1',
      connectorTypeId: '.webhook',
      connectorId: 'test-connector',
      label: 'Webhook',
      isLabelAuto: false,
      documentTemplate: '{{message}}',
    },
  ],
  fields: [
    {
      id: 'field-1',
      key: 'message',
      label: 'Message',
      type: 'textarea',
      required: true,
      dataType: 'string',
      size: { min: 5, max: 10 },
    },
    {
      id: 'field-2',
      key: 'count',
      label: 'Count',
      type: 'text',
      required: false,
      dataType: 'number',
      size: { min: 0, max: 100 },
    },
    {
      id: 'field-3',
      key: 'enabled',
      label: 'Enabled',
      type: 'text',
      required: false,
      dataType: 'boolean',
    },
  ],
  ...overrides,
});

describe('serialization', () => {
  it('serializes form config with clamped layout columns and normalized sizes', () => {
    const config = buildConfig({ layoutColumns: 99 });
    const serialized = serializeFormConfig(config);

    expect(serialized.layoutColumns).toBe(12);
    expect(serialized.connectors).toHaveLength(1);
    expect(serialized.fields[0].size).toEqual({ min: 5, max: 10 });
    expect(serialized.fields[1].size).toEqual({ min: 0, max: 100 });
    expect(serialized.fields[2].size).toBeUndefined();
  });

  it('deserializes form config applying defaults and clamping invalid values', () => {
    const serialized = serializeFormConfig(
      buildConfig({
        layoutColumns: -3,
        connectors: [
          {
            id: 'conn-1',
            connectorTypeId: '.webhook',
            connectorId: 'test-connector',
            label: 'Webhook',
            isLabelAuto: true,
            documentTemplate: '{{message}}',
          },
        ],
        fields: [
          {
            id: 'field-1',
            key: 'message',
            label: 'Message',
            type: 'textarea',
            required: true,
            dataType: 'string',
            size: { min: -5, max: 2 },
          },
        ],
      })
    );

    const deserialized = deserializeFormConfig({
      ...serialized,
      layoutColumns: NaN,
      fields: [
        {
          ...serialized.fields[0],
          size: { min: -10, max: -1 },
        },
      ],
    });

    expect(deserialized.layoutColumns).toBeGreaterThanOrEqual(1);
    expect(deserialized.layoutColumns).toBeLessThanOrEqual(12);
    expect(deserialized.fields[0].size).toEqual({ min: 0, max: 0 });
    expect(deserialized.connectors[0].isLabelAuto).toBe(true);
  });

  it('round-trips serialize/deserialize without losing data', () => {
    const config = buildConfig();
    const roundTrip = deserializeFormConfig(serializeFormConfig(config));
    expect(roundTrip).toEqual({
      ...config,
      allowRowPicker: false,
      layoutColumns: config.layoutColumns,
      fields: [
        { ...config.fields[0], placeholder: undefined, size: { min: 5, max: 10 } },
        { ...config.fields[1], placeholder: undefined, size: { min: 0, max: 100 } },
        { ...config.fields[2], placeholder: undefined, size: undefined },
      ],
    });
  });
});

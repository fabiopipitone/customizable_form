import type {
  FormConfig,
  FormConnectorConfig,
  FormFieldConfig,
  FormFieldDataType,
  FormFieldSizeConstraint,
} from './types';
import {
  DEFAULT_LAYOUT_COLUMNS,
  DEFAULT_NUMBER_SIZE,
  DEFAULT_STRING_SIZE,
  MAX_LAYOUT_COLUMNS,
  MIN_LAYOUT_COLUMNS,
} from './constants';

const normalizeLayoutColumns = (value: number | undefined): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return DEFAULT_LAYOUT_COLUMNS;
  }
  const rounded = Math.round(value);
  return Math.min(MAX_LAYOUT_COLUMNS, Math.max(MIN_LAYOUT_COLUMNS, rounded));
};

const normalizeSize = (
  dataType: FormFieldDataType,
  size: FormFieldSizeConstraint | undefined
): FormFieldSizeConstraint | undefined => {
  if (dataType === 'boolean') {
    return undefined;
  }

  const defaults = dataType === 'number' ? DEFAULT_NUMBER_SIZE : DEFAULT_STRING_SIZE;
  const min = size?.min ?? defaults.min;
  const max = size?.max ?? defaults.max;

  const normalizedMin = Number.isFinite(min) ? min : defaults.min;
  const normalizedMax = Number.isFinite(max) ? max : defaults.max;

  const clampedMin = Math.max(0, Math.floor(normalizedMin));
  const clampedMax = Math.max(clampedMin, Math.floor(normalizedMax));

  return { min: clampedMin, max: clampedMax };
};

export interface SerializedConnectorConfig {
  id: string;
  label: string;
  connectorTypeId: FormConnectorConfig['connectorTypeId'];
  connectorId: string;
  documentTemplate: string;
  isLabelAuto: boolean;
}

export interface SerializedFieldConfig {
  id: string;
  key: string;
  label: string;
  placeholder?: string;
  type: FormFieldConfig['type'];
  required: boolean;
  dataType?: FormFieldDataType;
  size?: FormFieldSizeConstraint;
}

export interface SerializedFormConfig {
  title: string;
  description: string;
  showTitle: boolean;
  showDescription: boolean;
  layoutColumns?: number;
  requireConfirmationOnSubmit?: boolean;
  allowRowPicker?: boolean;
  connectors: SerializedConnectorConfig[];
  fields: SerializedFieldConfig[];
}

const serializeConnector = (connector: FormConnectorConfig): SerializedConnectorConfig => ({
  id: connector.id,
  label: connector.label,
  connectorTypeId: connector.connectorTypeId,
  connectorId: connector.connectorId,
  documentTemplate: connector.documentTemplate,
  isLabelAuto: connector.isLabelAuto,
});

const serializeField = (field: FormFieldConfig): SerializedFieldConfig => ({
  id: field.id,
  key: field.key,
  label: field.label,
  placeholder: field.placeholder,
  type: field.type,
  required: field.required,
  dataType: field.dataType,
  size: normalizeSize(field.dataType, field.size),
});

export const serializeFormConfig = (config: FormConfig): SerializedFormConfig => ({
  title: config.title,
  description: config.description,
  showTitle: config.showTitle,
  showDescription: config.showDescription,
  layoutColumns: normalizeLayoutColumns(config.layoutColumns),
  requireConfirmationOnSubmit: config.requireConfirmationOnSubmit,
  allowRowPicker: config.allowRowPicker === true,
  connectors: config.connectors.map(serializeConnector),
  fields: config.fields.map(serializeField),
});

export const serializeFormConfigToJson = (config: FormConfig): string =>
  JSON.stringify(serializeFormConfig(config));

const deserializeConnector = (connector: SerializedConnectorConfig): FormConnectorConfig => ({
  id: connector.id,
  connectorTypeId: connector.connectorTypeId,
  connectorId: connector.connectorId,
  label: connector.label,
  documentTemplate: connector.documentTemplate,
  isLabelAuto: connector.isLabelAuto ?? false,
});

const deserializeField = (field: SerializedFieldConfig): FormFieldConfig => {
  const dataType: FormFieldDataType = field.dataType ?? 'string';
  return {
    id: field.id,
    key: field.key,
    label: field.label,
    placeholder: field.placeholder,
    type: field.type,
    required: field.required,
    dataType,
    size: normalizeSize(dataType, field.size),
  };
};

export const deserializeFormConfig = (serialized: SerializedFormConfig): FormConfig => ({
  title: serialized.title,
  description: serialized.description,
  showTitle: serialized.showTitle,
  showDescription: serialized.showDescription,
  requireConfirmationOnSubmit: serialized.requireConfirmationOnSubmit === true,
  allowRowPicker: serialized.allowRowPicker === true,
  layoutColumns: normalizeLayoutColumns(serialized.layoutColumns),
  connectors: serialized.connectors.map(deserializeConnector),
  fields: serialized.fields.map(deserializeField),
});

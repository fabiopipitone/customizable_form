import type { FormConfig, FormConnectorConfig, FormFieldConfig } from './types';

export interface SerializedConnectorConfig {
  id: string;
  label: string;
  connectorTypeId: string;
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
}

export interface SerializedFormConfig {
  title: string;
  description: string;
  showTitle: boolean;
  showDescription: boolean;
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
});

export const serializeFormConfig = (config: FormConfig): SerializedFormConfig => ({
  title: config.title,
  description: config.description,
  showTitle: config.showTitle,
  showDescription: config.showDescription,
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

const deserializeField = (field: SerializedFieldConfig): FormFieldConfig => ({
  id: field.id,
  key: field.key,
  label: field.label,
  placeholder: field.placeholder,
  type: field.type,
  required: field.required,
});

export const deserializeFormConfig = (serialized: SerializedFormConfig): FormConfig => ({
  title: serialized.title,
  description: serialized.description,
  showTitle: serialized.showTitle,
  showDescription: serialized.showDescription,
  connectors: serialized.connectors.map(deserializeConnector),
  fields: serialized.fields.map(deserializeField),
});

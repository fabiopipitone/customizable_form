export type FormFieldType = 'text' | 'textarea';

export interface FormFieldConfig {
  id: string;
  key: string;
  label: string;
  placeholder?: string;
  type: FormFieldType;
  required: boolean;
}

export type SupportedConnectorTypeId = '.index' | '.webhook';

export interface FormConnectorConfig {
  id: string;
  connectorTypeId: SupportedConnectorTypeId | '';
  connectorId: string;
  documentTemplate: string;
}

export interface FormConfig {
  title: string;
  description: string;
  showTitle: boolean;
  showDescription: boolean;
  connectors: FormConnectorConfig[];
  fields: FormFieldConfig[];
}

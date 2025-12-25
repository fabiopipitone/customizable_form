export type FormFieldType = 'text' | 'textarea';
export type FormFieldDataType = 'string' | 'number' | 'boolean';

export interface FormFieldSizeConstraint {
  min: number;
  max: number;
}

export interface FormFieldConfig {
  id: string;
  key: string;
  label: string;
  placeholder?: string;
  type: FormFieldType;
  required: boolean;
  dataType: FormFieldDataType;
  size?: FormFieldSizeConstraint;
}

export type SupportedConnectorTypeId = '.index' | '.webhook' | '.email' | '.jira' | '.teams';

export interface FormConnectorConfig {
  id: string;
  connectorTypeId: SupportedConnectorTypeId | '';
  connectorId: string;
  label: string;
  isLabelAuto: boolean;
  documentTemplate: string;
}

export interface FormConfig {
  title: string;
  description: string;
  showTitle: boolean;
  showDescription: boolean;
  layoutColumns: number;
  requireConfirmationOnSubmit: boolean;
  allowRowPicker?: boolean;
  connectors: FormConnectorConfig[];
  fields: FormFieldConfig[];
}

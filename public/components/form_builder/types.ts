export type FormFieldType = 'text' | 'textarea';

export interface FormFieldConfig {
  id: string;
  key: string;
  label: string;
  placeholder?: string;
  type: FormFieldType;
  required: boolean;
}

export interface FormConfig {
  title: string;
  description: string;
  showTitle: boolean;
  showDescription: boolean;
  connectorTypeId: string;
  connectorId: string;
  documentTemplate: string;
  fields: FormFieldConfig[];
}

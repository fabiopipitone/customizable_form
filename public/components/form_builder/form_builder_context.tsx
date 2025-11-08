import React, { createContext, useContext } from 'react';

import type { FormConfig, FormFieldConfig } from './types';

export interface FormBuilderContextValue {
  formConfig: FormConfig;
  fieldValues: Record<string, string>;
  updateConfig: (changes: Partial<FormConfig>) => void;
  addField: () => void;
  removeField: (fieldId: string) => void;
  updateField: (fieldId: string, changes: Partial<FormFieldConfig>) => void;
  handleFieldReorder: (sourceIndex: number, destinationIndex: number) => void;
  handleFieldValueChange: (fieldId: string, value: string) => void;
  addConnector: () => void;
  removeConnector: (connectorConfigId: string) => void;
  handleConnectorTypeChange: (connectorConfigId: string, value: string) => void;
  handleConnectorChange: (connectorConfigId: string, value: string) => void;
  handleConnectorLabelChange: (connectorConfigId: string, value: string) => void;
  handleConnectorTemplateChange: (connectorConfigId: string, value: string) => void;
}

const FormBuilderContext = createContext<FormBuilderContextValue | null>(null);

export const FormBuilderProvider = ({
  value,
  children,
}: {
  value: FormBuilderContextValue;
  children: React.ReactNode;
}) => <FormBuilderContext.Provider value={value}>{children}</FormBuilderContext.Provider>;

export const useFormBuilderContext = (): FormBuilderContextValue => {
  const context = useContext(FormBuilderContext);
  if (!context) {
    throw new Error('useFormBuilderContext must be used within a FormBuilderProvider');
  }
  return context;
};

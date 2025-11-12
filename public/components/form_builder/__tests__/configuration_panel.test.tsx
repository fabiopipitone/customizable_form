import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { ConfigurationPanel } from '../configuration_panel';
import { FormBuilderProvider } from '../form_builder_context';
import type { FormBuilderContextValue } from '../form_builder_context';

const contextValue: FormBuilderContextValue = {
  formConfig: {
    title: 'context title',
    description: '',
    showTitle: true,
    showDescription: true,
    layoutColumns: 2,
    requireConfirmationOnSubmit: false,
    connectors: [],
    fields: [],
  },
  fieldValues: {},
  derivedState: {
    fieldValidationById: {},
    variableNameValidationById: {},
    hasFieldValidationWarnings: false,
    hasInvalidVariableNames: false,
    renderedPayloads: {},
    templateValidationByConnector: {},
    connectorSelectionState: {},
    connectorStatusById: {},
    connectorSummaries: [],
    connectorSummaryItems: [],
  },
  updateConfig: jest.fn(),
  addField: jest.fn(),
  removeField: jest.fn(),
  updateField: jest.fn(),
  handleFieldReorder: jest.fn(),
  handleFieldValueChange: jest.fn(),
  addConnector: jest.fn(),
  removeConnector: jest.fn(),
  handleConnectorTypeChange: jest.fn(),
  handleConnectorChange: jest.fn(),
  handleConnectorLabelChange: jest.fn(),
  handleConnectorTemplateChange: jest.fn(),
};

const baseProps: React.ComponentProps<typeof ConfigurationPanel> = {
  onSaveRequest: jest.fn(),
  connectorTypeOptions: [],
  connectorTypes: [],
  isLoadingConnectorTypes: false,
  isLoadingConnectors: false,
  connectorTypesError: null,
  connectorsError: null,
  isSaveDisabled: false,
  isSaving: false,
};

const renderWithProvider = (ui: React.ReactElement) =>
  render(<FormBuilderProvider value={contextValue}>{ui}</FormBuilderProvider>);

describe('ConfigurationPanel', () => {
  it('renders tabs and calls onSaveRequest when clicking save', () => {
    const onSaveRequest = jest.fn();
    renderWithProvider(<ConfigurationPanel {...baseProps} onSaveRequest={onSaveRequest} />);

    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Connectors')).toBeInTheDocument();
    expect(screen.getByText('Fields')).toBeInTheDocument();
    expect(screen.getByText('Payload Templates')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Save Visualization'));
    expect(onSaveRequest).toHaveBeenCalled();
  });

  it('disables save button while saving', () => {
    renderWithProvider(<ConfigurationPanel {...baseProps} isSaveDisabled={true} isSaving={true} />);
    const saveButton = screen.getByRole('button', { name: /save visualization/i });
    expect(saveButton).toBeDisabled();
  });
});

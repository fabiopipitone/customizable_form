import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import FormBuilderLayout from '../form_builder_layout';
import { FormBuilderProvider } from '../form_builder_context';
import type { FormBuilderContextValue } from '../form_builder_context';

const connectorSummaryItem = {
  id: 'conn-1',
  label: 'Connector A',
  connectorName: 'Connector A',
  connectorTypeLabel: 'Webhook',
  status: {
    hasWarning: false,
    hasError: false,
    hasTemplateWarning: false,
    hasTemplateError: false,
  },
};

const contextValue: FormBuilderContextValue = {
  formConfig: {
    title: 'Test form',
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
    connectorSummaryItems: [connectorSummaryItem],
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

const renderLayout = (props?: Partial<React.ComponentProps<typeof FormBuilderLayout>>) =>
  render(
    <FormBuilderProvider value={contextValue}>
      <FormBuilderLayout
        isSubmitDisabled={false}
        onSubmit={jest.fn()}
        isSubmitting={false}
        isSubmitConfirmationVisible={false}
        onConfirmConnectorExecution={jest.fn()}
        onCancelConnectorExecution={jest.fn()}
        connectorTypeOptions={[]}
        connectorTypes={[]}
        isLoadingConnectorTypes={false}
        isLoadingConnectors={false}
        connectorTypesError={null}
        connectorsError={null}
        isSaveDisabled={false}
        isSaving={false}
        onSaveRequest={jest.fn()}
        {...props}
      />
    </FormBuilderProvider>
  );

describe('FormBuilderLayout', () => {
  it('renders preview, info, and configuration panels', () => {
    renderLayout();
    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
    expect(screen.getByText('Configuration')).toBeInTheDocument();
  });

  it('shows confirmation modal and wires confirm/cancel callbacks', () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    renderLayout({
      isSubmitConfirmationVisible: true,
      onConfirmConnectorExecution: onConfirm,
      onCancelConnectorExecution: onCancel,
    });

    fireEvent.click(screen.getByText('Execute connectors'));
    expect(onConfirm).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('disables save button when isSaveDisabled is true', () => {
    renderLayout({ isSaveDisabled: true });
    const saveButton = screen.getByRole('button', { name: /save visualization/i });
    expect(saveButton).toBeDisabled();
  });
});

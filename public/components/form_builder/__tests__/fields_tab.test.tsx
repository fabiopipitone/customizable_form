import React from 'react';
import { render, screen } from '@testing-library/react';

import { FieldsTab } from '../configuration_tabs/fields_tab';
import { FormBuilderProvider } from '../form_builder_context';
import type { FormBuilderContextValue } from '../form_builder_context';

const buildContextValue = (): FormBuilderContextValue => ({
  formConfig: {
    title: 'Context title',
    description: '',
    showTitle: true,
    showDescription: true,
    layoutColumns: 2,
    requireConfirmationOnSubmit: false,
    connectors: [],
    fields: [
      {
        id: 'field-1',
        key: 'field_1',
        label: 'Test label',
        placeholder: 'placeholder',
        type: 'text',
        required: true,
        dataType: 'string',
        size: { min: 1, max: 5 },
      },
    ],
  },
  fieldValues: {},
  derivedState: {
    fieldValidationById: {},
    variableNameValidationById: {
      'field-1': { isValid: true },
    },
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
});

const renderFieldsTab = () =>
  render(
    <FormBuilderProvider value={buildContextValue()}>
      <FieldsTab />
    </FormBuilderProvider>
  );

describe('FieldsTab accessibility', () => {
  it('wires form labels to inputs via matching ids', () => {
    const { container } = renderFieldsTab();

    const labelInput = screen.getByLabelText('Label') as HTMLInputElement;
    expect(labelInput.id).toBe('field-1-label');

    const labelElement = container.querySelector('label[for="field-1-label"]');
    expect(labelElement).not.toBeNull();
  });

  it('renders the size control as a fieldset with a legend instead of a label', () => {
    const { container } = renderFieldsTab();

    const sizeLegend = screen.getByText('Size constraint');
    expect(sizeLegend.tagName).toBe('LEGEND');
    expect(sizeLegend.closest('fieldset')).not.toBeNull();
    expect(container.querySelector('label[for="field-1-size"]')).toBeNull();
  });
});

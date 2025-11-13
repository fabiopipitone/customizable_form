import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';

import InfoPanel from '../info_panel';
import { FormBuilderProvider, type FormBuilderContextValue } from '../form_builder_context';

const createContextValue = (
  overrides: Partial<FormBuilderContextValue> = {}
): FormBuilderContextValue => ({
  formConfig: {
    title: 'Form',
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
  ...overrides,
});

const renderInfoPanel = (context: FormBuilderContextValue) =>
  render(
    <FormBuilderProvider value={context}>
      <InfoPanel />
    </FormBuilderProvider>
  );

describe('InfoPanel', () => {
  it('shows empty states when no connectors are configured', () => {
    const context = createContextValue();
    renderInfoPanel(context);

    expect(screen.getByText('Connectors Summary')).toBeInTheDocument();
    expect(screen.getByText('No connectors configured yet.')).toBeInTheDocument();
    expect(screen.getByText('No payloads available')).toBeInTheDocument();
  });

  it('renders connector summary and payload tabs for configured connectors', () => {
    const context = createContextValue({
      derivedState: {
        fieldValidationById: {},
        variableNameValidationById: {},
        hasFieldValidationWarnings: false,
        hasInvalidVariableNames: false,
        renderedPayloads: {
          'conn-1': '{"message":"hello"}',
          'conn-2': '{"count":1}',
        },
        templateValidationByConnector: {
          'conn-1': {
            missing: ['message'],
            unused: [],
            errors: ['Payload problem'],
            warnings: ['Parent issue must exist'],
          },
          'conn-2': {
            missing: [],
            unused: [{ key: 'foo', label: 'Foo' }],
            errors: [],
            warnings: [],
          },
        },
        connectorSelectionState: {},
        connectorStatusById: {
          'conn-1': {
            hasWarning: false,
            hasError: false,
            hasTemplateWarning: false,
            hasTemplateError: true,
          },
          'conn-2': {
            hasWarning: true,
            hasError: false,
            hasTemplateWarning: true,
            hasTemplateError: false,
          },
        },
        connectorSummaries: [
          {
            config: {
              id: 'conn-1',
              connectorTypeId: '.webhook',
              connectorId: '1',
              label: 'Connector A',
              isLabelAuto: false,
              documentTemplate: '{{message}}',
            },
            type: null,
            connector: null,
            label: 'Connector A',
            status: {
              hasWarning: false,
              hasError: false,
              hasTemplateWarning: false,
              hasTemplateError: true,
            },
          },
          {
            config: {
              id: 'conn-2',
              connectorTypeId: '.webhook',
              connectorId: '2',
              label: 'Connector B',
              isLabelAuto: false,
              documentTemplate: '{{count}}',
            },
            type: null,
            connector: null,
            label: 'Connector B',
            status: {
              hasWarning: true,
              hasError: false,
              hasTemplateWarning: true,
              hasTemplateError: false,
            },
          },
        ],
        connectorSummaryItems: [
          {
            id: 'conn-1',
            label: 'Connector A',
            connectorName: 'Webhook A',
            connectorTypeLabel: 'Webhook',
            status: {
              hasWarning: false,
              hasError: false,
              hasTemplateWarning: false,
              hasTemplateError: true,
            },
          },
          {
            id: 'conn-2',
            label: 'Connector B',
            connectorName: 'Webhook B',
            connectorTypeLabel: 'Webhook',
            status: {
              hasWarning: true,
              hasError: false,
              hasTemplateWarning: true,
              hasTemplateError: false,
            },
          },
        ],
      },
    });

    renderInfoPanel(context);

    expect(screen.getAllByText('Connector A')).toHaveLength(2);
    expect(screen.getAllByText('Connector B')).toHaveLength(2);
    expect(screen.getByText('{"message":"hello"}')).toBeInTheDocument();
    expect(screen.getByText('Payload problem')).toBeInTheDocument();
    expect(screen.getByText('Missing variables: message.')).toBeInTheDocument();
    expect(screen.getByText('Parent issue must exist')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Connector B/i }));

    expect(screen.getByText('{"count":1}')).toBeInTheDocument();
    expect(screen.getByText('Unused fields: Foo.')).toBeInTheDocument();
  });
});

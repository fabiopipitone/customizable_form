import React from 'react';
import { render, screen } from '@testing-library/react';

import { PreviewCard } from '../preview_card';
import { FormBuilderProvider, type FormBuilderContextValue } from '../form_builder_context';

jest.mock('../preview', () => ({
  CustomizableFormPreview: jest.fn(() => <div data-test-subj="mock-preview" />),
}));

const CustomizableFormPreview = jest.requireMock('../preview').CustomizableFormPreview as jest.Mock;

const createContextValue = (): FormBuilderContextValue => ({
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
  fieldValues: { field1: 'value' },
  derivedState: {
    fieldValidationById: { field1: { isOutOfRange: false, message: null } },
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
});

const renderPreviewCard = (props?: Partial<React.ComponentProps<typeof PreviewCard>>) => {
  const contextValue = createContextValue();
  const onSubmit = jest.fn();
  render(
    <FormBuilderProvider value={contextValue}>
      <PreviewCard isSubmitDisabled={false} isSubmitting={false} onSubmit={onSubmit} {...props} />
    </FormBuilderProvider>
  );
  return { contextValue, onSubmit };
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('PreviewCard', () => {
  it('renders header and forwards context data to CustomizableFormPreview', () => {
    const { contextValue, onSubmit } = renderPreviewCard();

    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(CustomizableFormPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        config: contextValue.formConfig,
        fieldValues: contextValue.fieldValues,
        validationByFieldId: contextValue.derivedState.fieldValidationById,
        isSubmitDisabled: false,
        isSubmitting: false,
        onSubmit,
        onFieldValueChange: contextValue.handleFieldValueChange,
      }),
      {}
    );
  });

  it('passes submit state props down to CustomizableFormPreview', () => {
    renderPreviewCard({ isSubmitDisabled: true, isSubmitting: true });

    expect(CustomizableFormPreview).toHaveBeenCalledWith(
      expect.objectContaining({ isSubmitDisabled: true, isSubmitting: true }),
      {}
    );
  });
});

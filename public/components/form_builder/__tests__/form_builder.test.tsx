import React from 'react';
import { render, screen } from '@testing-library/react';
import type { AppMountParameters, CoreStart, NotificationsStart } from '@kbn/core/public';

import FormBuilder from '../form_builder';
import type { FormBuilderContextValue } from '../form_builder_context';

jest.mock('../hooks/use_form_builder_lifecycle', () => ({
  useFormBuilderLifecycle: jest.fn(),
}));

jest.mock('../form_builder_layout', () => ({
  __esModule: true,
  default: jest.fn(() => <div data-test-subj="layout">Layout</div>),
}));

const useFormBuilderLifecycle = jest.requireMock('../hooks/use_form_builder_lifecycle')
  .useFormBuilderLifecycle as jest.Mock;
const FormBuilderLayout = jest.requireMock('../form_builder_layout').default as jest.Mock;

const baseContext: FormBuilderContextValue = {
  formConfig: {
    title: 'Test',
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

const buildLifecycleReturn = (overrides: Record<string, unknown> = {}) => ({
  formConfig: baseContext.formConfig,
  fieldValues: {},
  connectorTypes: [],
  connectors: [],
  isLoadingConnectorTypes: false,
  isLoadingConnectors: false,
  connectorTypesError: null,
  connectorsError: null,
  isInitialLoading: false,
  initialLoadError: null,
  isSaving: false,
  handleSaveVisualizationRequest: jest.fn(),
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
  derivedState: baseContext.derivedState,
  formBuilderContextValue: baseContext,
  connectorTypeOptions: [],
  hasEmptyConnectorLabels: false,
  hasInvalidConnectorSelections: false,
  isSaveDisabled: false,
  isSubmitDisabled: false,
  isSubmitConfirmationVisible: false,
  handleTestSubmission: jest.fn(),
  handleConfirmConnectorExecution: jest.fn(),
  handleCancelConnectorExecution: jest.fn(),
  isConnectorExecutionInFlight: false,
  ...overrides,
});

const historyMock: AppMountParameters['history'] = {
  createSubHistory: jest.fn(),
  createHref: jest.fn(() => '/'),
  length: 1,
  action: 'PUSH',
  location: {
    pathname: '/',
    search: '',
    hash: '',
    state: undefined,
  },
  push: jest.fn(),
  replace: jest.fn(),
  go: jest.fn(),
  goBack: jest.fn(),
  goForward: jest.fn(),
  listen: jest.fn(),
  block: jest.fn(),
};

const createBuilderProps = (
  overrides: Partial<React.ComponentProps<typeof FormBuilder>> = {}
) => ({
  mode: 'create' as const,
  notifications: {
    toasts: {
      addDanger: jest.fn(),
      addSuccess: jest.fn(),
      addWarning: jest.fn(),
      addInfo: jest.fn(),
    },
  } as unknown as NotificationsStart,
  http: {} as CoreStart['http'],
  application: {
    navigateToApp: jest.fn(),
  } as unknown as CoreStart['application'],
  history: historyMock,
  ...overrides,
});

describe('FormBuilder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows spinner while initial loading', () => {
    useFormBuilderLifecycle.mockReturnValue(buildLifecycleReturn({ isInitialLoading: true }));
    const { container } = render(<FormBuilder {...createBuilderProps()} />);
    expect(container.querySelector('.euiLoadingSpinner')).toBeTruthy();
  });

  it('renders error callout when initial load fails', () => {
    useFormBuilderLifecycle.mockReturnValue(
      buildLifecycleReturn({ initialLoadError: 'boom', isInitialLoading: false })
    );
    render(<FormBuilder {...createBuilderProps()} />);
    expect(screen.getByText('Unable to load form')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('renders layout when ready and passes props', () => {
    useFormBuilderLifecycle.mockReturnValue(buildLifecycleReturn());
    render(<FormBuilder {...createBuilderProps()} />);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    expect(FormBuilderLayout).toHaveBeenCalledWith(
      expect.objectContaining({ isSubmitDisabled: false, isSaveDisabled: false }),
      {}
    );
  });
});

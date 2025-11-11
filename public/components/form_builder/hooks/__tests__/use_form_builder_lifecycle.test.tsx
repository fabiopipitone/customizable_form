import { renderHook, act } from '@testing-library/react-hooks';

import { useFormBuilderLifecycle } from '../use_form_builder_lifecycle';
import type { FormConfig } from '../../types';
import { buildInitialFieldValues } from '../../utils/form_helpers';
import * as savedObjectsModal from '@kbn/saved-objects-plugin/public';

const MOCK_CONNECTOR_TYPES = [
  {
    id: '.index' as const,
    name: '.index',
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: [],
    enabledInConfig: true,
    enabled: true,
    isSystemActionType: false,
  },
];
const MOCK_CONNECTORS: any[] = [];

jest.mock('@kbn/saved-objects-plugin/public', () => ({
  showSaveModal: jest.fn(),
}));

jest.mock('../../../../services/persistence', () => ({
  createCustomizableForm: jest.fn().mockResolvedValue({ id: 'new', references: [] }),
  updateCustomizableForm: jest.fn().mockResolvedValue({ id: 'existing', references: [] }),
  resolveCustomizableForm: jest.fn().mockResolvedValue({
    saved_object: {
      id: 'existing',
      attributes: {},
      references: [],
    },
    outcome: 'exactMatch',
  }),
  getDocumentFromResolveResponse: jest.fn((resolveResult) => ({
    formConfig: MOCK_FORM_CONFIG,
    attributes: { title: 'Loaded', description: '' },
  })),
}));

jest.mock('../../../../services/embeddable_state_transfer', () => ({
  getEmbeddableStateTransfer() {
    return {
      navigateToWithEmbeddablePackage: jest.fn(),
    };
  },
}));

const mockedShowSaveModal = savedObjectsModal.showSaveModal as jest.Mock;
mockedShowSaveModal.mockImplementation((element: any) => {
  const props = element.props;
  props.onSave({
    newTitle: 'title',
    newDescription: '',
    newCopyOnSave: false,
    dashboardId: undefined,
    addToLibrary: true,
  });
});

jest.mock('../../use_connectors_data', () => ({
  useConnectorsData: () => ({
    connectorTypes: MOCK_CONNECTOR_TYPES,
    connectors: MOCK_CONNECTORS,
    isLoadingConnectorTypes: false,
    isLoadingConnectors: false,
    connectorTypesError: null,
    connectorsError: null,
  }),
  getCanonicalConnectorTypeId: (id: string) => id,
}));

const MOCK_FORM_CONFIG: FormConfig = {
  title: 'Form',
  description: '',
  showTitle: true,
  showDescription: true,
  layoutColumns: 2,
  requireConfirmationOnSubmit: false,
  connectors: [],
  fields: [
    {
      id: 'field-1',
      key: 'message',
      label: 'Message',
      placeholder: '',
      type: 'text',
      required: true,
      dataType: 'string',
      size: { min: 0, max: 10 },
    },
  ],
};

const createParams = (overrides: Partial<Parameters<typeof useFormBuilderLifecycle>[0]> = {}) => ({
  mode: 'create' as const,
  savedObjectId: undefined,
  notifications: { toasts: { addDanger: jest.fn(), addSuccess: jest.fn(), addWarning: jest.fn() } } as any,
  http: {} as any,
  application: { navigateToApp: jest.fn() } as any,
  history: { push: jest.fn(), replace: jest.fn() } as any,
  initialConfig: MOCK_FORM_CONFIG,
  initialAttributes: { title: '', description: '' },
  ...overrides,
});

describe('useFormBuilderLifecycle', () => {
  it('initializes create mode with default field values', () => {
    const props = createParams();
    const { result } = renderHook(() => useFormBuilderLifecycle(props));
    expect(result.current.formConfig.fields).toHaveLength(1);
    expect(result.current.fieldValues).toEqual(buildInitialFieldValues(MOCK_FORM_CONFIG.fields));
    expect(result.current.isInitialLoading).toBe(false);
    expect(result.current.initialLoadError).toBeNull();
  });

  it('shows submit confirmation flags and executes connector flow', () => {
    const params = createParams();
    const { result } = renderHook(() => useFormBuilderLifecycle(params));

    act(() => {
      result.current.handleTestSubmission();
    });
    expect(params.notifications.toasts.addWarning).toHaveBeenCalled();
  });

  it('handles save request in create mode', async () => {
    const params = createParams();
    const { result } = renderHook(() => useFormBuilderLifecycle(params));

    await act(async () => {
      await result.current.handleSaveVisualizationRequest();
    });

    expect(params.notifications.toasts.addSuccess).toHaveBeenCalled();
  });

  it('loads configuration when editing', async () => {
    const params = createParams({ mode: 'edit', savedObjectId: 'existing' });
    const { result, waitForNextUpdate } = renderHook(() => useFormBuilderLifecycle(params));

    await waitForNextUpdate();
    expect(result.current.isInitialLoading).toBe(false);
    expect(result.current.formConfig.fields).toHaveLength(1);
  });
});

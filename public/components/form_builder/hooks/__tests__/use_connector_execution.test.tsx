import { renderHook, act } from '@testing-library/react-hooks';
import type { IToasts } from '@kbn/core-notifications-browser';

import { useConnectorExecution } from '../use_connector_execution';
import type { FormConfig, SupportedConnectorTypeId } from '../../types';
import { executeConnectorHandlers } from '../../utils/shared';

jest.mock('../../utils/shared', () => {
  const actual = jest.requireActual('../../utils/shared');
  return {
    ...actual,
    executeConnectorHandlers: jest.fn(),
  };
});

const mockToasts = (): IToasts => ({
  get$: jest.fn(),
  add: jest.fn(),
  remove: jest.fn(),
  addInfo: jest.fn(),
  addSuccess: jest.fn(),
  addWarning: jest.fn(),
  addDanger: jest.fn(),
  addError: jest.fn(),
});

const connector = (id: string) => ({
  id,
  connectorTypeId: '.index' as SupportedConnectorTypeId,
  connectorId: id,
  label: `Connector ${id}`,
  isLabelAuto: true,
  documentTemplate: '{"body":"{{message}}"}',
});

const formConfig: FormConfig = {
  title: 'Test',
  description: '',
  showTitle: true,
  showDescription: true,
  layoutColumns: 2,
  requireConfirmationOnSubmit: false,
  connectors: [connector('1')],
  fields: [],
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('useConnectorExecution', () => {
  it('warns when no connectors are configured', async () => {
    const toasts = mockToasts();
    const { result } = renderHook(() =>
      useConnectorExecution({
        http: {} as any,
        toasts,
        formConfig: { ...formConfig, connectors: [] },
        renderedPayloads: {},
        connectorLabelsById: {},
      })
    );

    await act(async () => {
      await result.current.executeNow();
    });

    expect(toasts.addWarning).toHaveBeenCalled();
    expect(result.current.hasConnectors).toBe(false);
  });

  it('shows success and error toasts based on execution results', async () => {
    const toasts = mockToasts();
    (executeConnectorHandlers as jest.Mock).mockResolvedValue([
      { connector: formConfig.connectors[0], status: 'success' as const },
      { connector: formConfig.connectors[0], status: 'error' as const, message: 'boom' },
    ]);
    const { result } = renderHook(() =>
      useConnectorExecution({
        http: {} as any,
        toasts,
        formConfig,
        renderedPayloads: { '1': '{}' },
        connectorLabelsById: { '1': 'Connector 1' },
      })
    );

    await act(async () => {
      await result.current.executeNow();
    });

    expect(toasts.addSuccess).toHaveBeenCalled();
    expect(toasts.addDanger).toHaveBeenCalled();
  });
});

import { renderHook } from '@testing-library/react-hooks';

import { useConnectorState } from '../use_connector_state';
import type { FormConfig } from '../../types';
import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import type { ActionType } from '@kbn/actions-types';

const connector = (id: string, overrides: Partial<FormConfig['connectors'][number]> = {}) => ({
  id,
  connectorTypeId: overrides.connectorTypeId ?? '.index',
  connectorId: overrides.connectorId ?? `conn-${id}`,
  label: overrides.label ?? `Connector ${id}`,
  isLabelAuto: overrides.isLabelAuto ?? true,
  documentTemplate: overrides.documentTemplate ?? '{"message":"{{message}}"}',
});

const baseConfig: FormConfig = {
  title: 'Form',
  description: '',
  showTitle: true,
  showDescription: true,
  layoutColumns: 2,
  requireConfirmationOnSubmit: false,
  connectors: [connector('1')],
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

const actionType = (id: string): ActionType & { id: any } => ({
  id,
  name: id,
  enabledInLicense: true,
  minimumLicenseRequired: 'basic',
  supportedFeatureIds: [],
});

const actionConnector = (id: string, actionTypeId: string): ActionConnector & { actionTypeId: any } => ({
  id,
  name: `Connector ${id}`,
  actionTypeId,
  config: {},
  secrets: {},
});

describe('useConnectorState', () => {
  it('builds connector selection state and statuses', () => {
    const formConfig: FormConfig = {
      ...baseConfig,
      connectors: [
        connector('1', { connectorId: 'c1', connectorTypeId: '.index' }),
        connector('2', { connectorId: '', connectorTypeId: '', label: '' }),
      ],
    };

    const connectorTypes = [actionType('.index'), actionType('.webhook')];
    const connectors = [actionConnector('c1', '.index'), actionConnector('c2', '.webhook')];

    const { result } = renderHook(() =>
      useConnectorState({
        formConfig,
        connectorTypes,
        connectors,
        isLoadingConnectors: false,
        templateValidationByConnector: {
          '1': { missing: [], unused: [] },
          '2': { missing: ['msg'], unused: [] },
        },
      })
    );

    const state = result.current.connectorSelectionState;
    expect(state['1'].hasSelection).toBe(true);
    expect(state['2'].hasSelection).toBe(false);

    const status = result.current.connectorStatusById;
    expect(status['1']).toMatchObject({ hasError: false, hasWarning: false });
    expect(status['2']).toMatchObject({ hasError: true, hasTemplateError: true });

    expect(result.current.connectorSummaries).toHaveLength(2);
    expect(result.current.connectorSummaryItems.map((item) => item.label)).toEqual([
      'Connector 1',
      'Connector 2',
    ]);
  });
});

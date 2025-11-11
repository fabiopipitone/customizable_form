import { renderHook, act } from '@testing-library/react-hooks';

import { useFormConfigState } from '../../use_form_config_state';
import type { FormConfig, SupportedConnectorTypeId } from '../../types';
import type { ActionType } from '@kbn/actions-types';
import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';

const initialConfig: FormConfig = {
  title: 'Form',
  description: '',
  showTitle: true,
  showDescription: true,
  layoutColumns: 2,
  requireConfirmationOnSubmit: false,
  connectors: [],
  fields: [],
};

const connectorType = (id: SupportedConnectorTypeId): ActionType & { id: SupportedConnectorTypeId } =>
  ({
    id,
    name: id,
    enabledInLicense: true,
    minimumLicenseRequired: 'basic',
    supportedFeatureIds: [],
    enabledInConfig: true,
    enabled: true,
    isSystemActionType: false,
  } as ActionType & { id: SupportedConnectorTypeId });

const actionConnector = (
  id: string,
  actionTypeId: SupportedConnectorTypeId
): ActionConnector & { actionTypeId: SupportedConnectorTypeId } =>
  ({
    id,
    name: `Connector ${id}`,
    actionTypeId,
    config: {},
    secrets: {},
    isPreconfigured: false,
    isDeprecated: false,
    isSystemAction: false,
  } as ActionConnector & { actionTypeId: SupportedConnectorTypeId });

const connectorTypes = [connectorType('.index'), connectorType('.webhook')];
const connectors = [actionConnector('c1', '.index'), actionConnector('c2', '.webhook')];

describe('useFormConfigState', () => {
  it('adds and reorders fields', () => {
    const { result } = renderHook(() => useFormConfigState({ initialConfig }));

    act(() => {
      result.current.addField();
      result.current.addField();
    });
    expect(result.current.formConfig.fields).toHaveLength(2);
    expect(result.current.formConfig.fields[0].id).toBe('field-1');
    expect(result.current.formConfig.fields[1].id).toBe('field-2');

    act(() => {
      result.current.handleFieldReorder(0, 1);
    });
    expect(result.current.formConfig.fields[0].id).toBe('field-2');
    expect(result.current.formConfig.fields[1].id).toBe('field-1');
  });

  it('adds connector with auto label and template', () => {
    const { result } = renderHook(() => useFormConfigState({ initialConfig }));

    act(() => {
      result.current.addConnector({
        connectorTypes,
        connectors,
        defaultTemplate: '{"test":true}',
      });
    });

    const [conn] = result.current.formConfig.connectors;
    expect(conn.connectorTypeId).toBe('.index');
    expect(conn.connectorId).toBe('c1');
    expect(conn.label).toBe('Connector c1');
    expect(conn.documentTemplate).toBe('{"test":true}');
  });

  it('handles connector type changes and resets selection when unavailable', () => {
    const configWithConnector: FormConfig = {
      ...initialConfig,
      connectors: [
        {
          id: 'connector-1',
          connectorTypeId: '.index',
          connectorId: 'c1',
          label: 'Connector 1',
          isLabelAuto: true,
          documentTemplate: '{}',
        },
      ],
    };
    const { result } = renderHook(() => useFormConfigState({ initialConfig: configWithConnector }));

    act(() => {
      result.current.handleConnectorTypeChange('connector-1', '.webhook', {
        connectorTypes,
        connectors,
      });
    });
    expect(result.current.formConfig.connectors[0].connectorTypeId).toBe('.webhook');
    expect(result.current.formConfig.connectors[0].connectorId).toBe('c2');

    act(() => {
      result.current.handleConnectorChange('connector-1', 'non-existent', {
        connectorTypes,
        connectors,
      });
    });
    expect(result.current.formConfig.connectors[0].connectorId).toBe('c2');
  });

  it('syncs connector selections when options disappear', () => {
    const configWithInvalid: FormConfig = {
      ...initialConfig,
      connectors: [
        {
          id: 'connector-1',
          connectorTypeId: '.webhook',
          connectorId: 'missing',
          label: 'Connector 1',
          isLabelAuto: true,
          documentTemplate: '{}',
        },
      ],
    };
    const { result } = renderHook(() => useFormConfigState({ initialConfig: configWithInvalid }));

    act(() => {
      result.current.syncConnectorSelections({
        connectorTypes,
        connectors,
      });
    });
    expect(result.current.formConfig.connectors[0].connectorId).toBe('c2');
  });
});

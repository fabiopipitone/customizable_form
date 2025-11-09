import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiSpacer,
  EuiTab,
  EuiTabs,
} from '@elastic/eui';
import type { ActionType } from '@kbn/actions-types';

import PanelHeader from './panel_header';
import type { SupportedConnectorTypeId } from './types';
import { type VariableNameValidationResult } from './validation';
import type { ConnectorSelectionStateEntry } from './hooks/use_connector_state';
import type { FormBuilderContextValue } from './form_builder_context';
import { GeneralTab } from './configuration_tabs/general_tab';
import { ConnectorsTab } from './configuration_tabs/connectors_tab';
import { FieldsTab } from './configuration_tabs/fields_tab';
import { PayloadTab } from './configuration_tabs/payload_tab';

interface ConfigurationPanelProps {
  variableNameValidationById: Record<string, VariableNameValidationResult>;
  hasInvalidVariableNames: boolean;
  onSaveRequest: () => void;
  connectorTypeOptions: Array<{ value: string; text: string }>;
  connectorTypes: Array<ActionType & { id: SupportedConnectorTypeId }>;
  templateValidationByConnector: Record<string, { missing: string[]; unused: Array<{ key: string; label: string }> }>;
  connectorStatusById: Record<
    string,
    {
      hasWarning: boolean;
      hasError: boolean;
      hasTemplateWarning: boolean;
      hasTemplateError: boolean;
    }
  >;
  connectorSummaries: Array<{
    config: FormBuilderContextValue['formConfig']['connectors'][number];
    label: string;
  }>;
  connectorSelectionState: Record<string, ConnectorSelectionStateEntry>;
  isLoadingConnectorTypes: boolean;
  isLoadingConnectors: boolean;
  connectorTypesError: string | null;
  connectorsError: string | null;
  hasEmptyConnectorLabels: boolean;
  isSaveDisabled: boolean;
  isSaving: boolean;
}

type ConfigurationTabId = 'general' | 'connectors' | 'fields' | 'payload';

export const ConfigurationPanel = ({
  variableNameValidationById,
  hasInvalidVariableNames,
  onSaveRequest,
  connectorTypeOptions,
  connectorTypes,
  templateValidationByConnector,
  connectorStatusById,
  connectorSummaries,
  connectorSelectionState,
  isLoadingConnectorTypes,
  isLoadingConnectors,
  connectorTypesError,
  connectorsError,
  hasEmptyConnectorLabels,
  isSaveDisabled,
  isSaving,
}: ConfigurationPanelProps) => {
  const [activeTab, setActiveTab] = useState<ConfigurationTabId>('general');
  const tabs: Array<{ id: ConfigurationTabId; label: string }> = [
    {
      id: 'general',
      label: i18n.translate('customizableForm.builder.configurationTab.general', {
        defaultMessage: 'General',
      }),
    },
    {
      id: 'connectors',
      label: i18n.translate('customizableForm.builder.configurationTab.connectors', {
        defaultMessage: 'Connectors',
      }),
    },
    {
      id: 'fields',
      label: i18n.translate('customizableForm.builder.configurationTab.fields', {
        defaultMessage: 'Fields',
      }),
    },
    {
      id: 'payload',
      label: i18n.translate('customizableForm.builder.configurationTab.payload', {
        defaultMessage: 'Payload Templates',
      }),
    },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'general':
        return <GeneralTab />;
      case 'connectors':
        return (
          <ConnectorsTab
            connectorTypeOptions={connectorTypeOptions}
            connectorTypes={connectorTypes}
            connectorSelectionState={connectorSelectionState}
            connectorStatusById={connectorStatusById}
            isLoadingConnectorTypes={isLoadingConnectorTypes}
            isLoadingConnectors={isLoadingConnectors}
            connectorTypesError={connectorTypesError}
            connectorsError={connectorsError}
            hasEmptyConnectorLabels={hasEmptyConnectorLabels}
          />
        );
      case 'fields':
        return (
          <FieldsTab
            variableNameValidationById={variableNameValidationById}
            hasInvalidVariableNames={hasInvalidVariableNames}
          />
        );
      case 'payload':
        return (
          <PayloadTab
            connectorSummaries={connectorSummaries}
            connectorStatusById={connectorStatusById}
            templateValidationByConnector={templateValidationByConnector}
          />
        );
      default:
        return null;
    }
  };

  return (
    <EuiPanel paddingSize="m" hasShadow hasBorder={false}>
      <PanelHeader
        title={i18n.translate('customizableForm.builder.configurationPanelTitleText', {
          defaultMessage: 'Configuration',
        })}
      />

      <EuiTabs>
        {tabs.map((tab) => (
          <EuiTab
            key={tab.id}
            isSelected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </EuiTab>
        ))}
      </EuiTabs>

      <EuiSpacer size="m" />

      {renderActiveTab()}

      <EuiSpacer size="l" />

      <EuiFlexGroup justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <EuiButton
            fill
            iconType="save"
            onClick={onSaveRequest}
            disabled={isSaveDisabled || isSaving}
            isLoading={isSaving}
          >
            {i18n.translate('customizableForm.builder.saveVisualizationButton', {
              defaultMessage: 'Save Visualization',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiConfirmModal, EuiFlexGroup, EuiFlexItem, EuiOverlayMask, EuiSpacer, EuiText } from '@elastic/eui';
import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import type { ActionType } from '@kbn/actions-types';

import type {
  FormConnectorConfig,
  SupportedConnectorTypeId,
} from './types';
import type { FieldValidationResult } from './preview';
import type { VariableNameValidationResult } from './validation';
import type { ConnectorSummaryItem, ConnectorSummaryStatus } from './connector_summary';
import PreviewCard from './preview_card';
import InfoPanel from './info_panel';
import { ConfigurationPanel } from './configuration_panel';
import { ConnectorSummaryTable } from './connector_summary';
import { useFormBuilderContext } from './form_builder_context';
import type { ConnectorSelectionStateEntry } from './hooks/use_connector_state';

export interface FormBuilderLayoutProps {
  isSubmitDisabled: boolean;
  onSubmit: () => void;
  validationByFieldId: Record<string, FieldValidationResult>;
  isSubmitting: boolean;
  connectorSummaries: Array<{
    config: FormConnectorConfig;
    label: string;
    type: ActionType & { id: SupportedConnectorTypeId } | null;
    connector: ActionConnector & { actionTypeId: SupportedConnectorTypeId } | null;
    status: ConnectorSummaryStatus;
  }>;
  connectorSummaryItems: ConnectorSummaryItem[];
  renderedPayloads: Record<string, string>;
  templateValidationByConnector: Record<
    string,
    { missing: string[]; unused: Array<{ key: string; label: string }> }
  >;
  isSubmitConfirmationVisible: boolean;
  onConfirmConnectorExecution: () => void;
  onCancelConnectorExecution: () => void;
  connectorTypeOptions: Array<{ value: string; text: string }>;
  connectorTypes: Array<ActionType & { id: SupportedConnectorTypeId }>;
  connectorStatusById: Record<string, ConnectorSummaryStatus>;
  connectorSelectionState: Record<string, ConnectorSelectionStateEntry>;
  isLoadingConnectorTypes: boolean;
  isLoadingConnectors: boolean;
  connectorTypesError: string | null;
  connectorsError: string | null;
  hasEmptyConnectorLabels: boolean;
  variableNameValidationById: Record<string, VariableNameValidationResult>;
  hasInvalidVariableNames: boolean;
  isSaveDisabled: boolean;
  isSaving: boolean;
  onSaveRequest: () => void;
}

export const FormBuilderLayout = ({
  isSubmitDisabled,
  onSubmit,
  validationByFieldId,
  isSubmitting,
  connectorSummaries,
  connectorSummaryItems,
  renderedPayloads,
  templateValidationByConnector,
  isSubmitConfirmationVisible,
  onConfirmConnectorExecution,
  onCancelConnectorExecution,
  connectorTypeOptions,
  connectorTypes,
  connectorStatusById,
  connectorSelectionState,
  isLoadingConnectorTypes,
  isLoadingConnectors,
  connectorTypesError,
  connectorsError,
  hasEmptyConnectorLabels,
  variableNameValidationById,
  hasInvalidVariableNames,
  isSaveDisabled,
  isSaving,
  onSaveRequest,
}: FormBuilderLayoutProps) => {
  const { formConfig, fieldValues, handleFieldValueChange } = useFormBuilderContext();

  return (
    <>
      {isSubmitConfirmationVisible ? (
      <EuiOverlayMask>
        <EuiConfirmModal
          title={i18n.translate('customizableForm.builder.executeConfirmModalTitle', {
            defaultMessage: 'Execute connectors?',
          })}
          onCancel={onCancelConnectorExecution}
          onConfirm={onConfirmConnectorExecution}
          cancelButtonText={i18n.translate('customizableForm.builder.executeConfirmModalCancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('customizableForm.builder.executeConfirmModalConfirm', {
            defaultMessage: 'Execute connectors',
          })}
          defaultFocusedButton="confirm"
          maxWidth={640}
          style={{ width: '640px' }}
        >
          <EuiText size="s">
            <p>
              {i18n.translate('customizableForm.builder.executeConfirmModalBody', {
                defaultMessage: 'You are about to trigger the following connectors.',
              })}
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <ConnectorSummaryTable items={connectorSummaryItems} />
        </EuiConfirmModal>
      </EuiOverlayMask>
      ) : null}

    <div
      style={{
        backgroundColor: '#f6f9fc',
        minHeight: '100vh',
        padding: '24px 32px 32px',
        boxSizing: 'border-box',
      }}
    >
      <EuiFlexGroup gutterSize="m" alignItems="stretch">
        <EuiFlexItem grow={4}>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem grow={false}>
              <PreviewCard
                config={formConfig}
                fieldValues={fieldValues}
                onFieldValueChange={handleFieldValueChange}
                isSubmitDisabled={isSubmitDisabled}
                onSubmit={onSubmit}
                validationByFieldId={validationByFieldId}
                isSubmitting={isSubmitting}
              />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <InfoPanel
                connectorSummaries={connectorSummaries}
                connectorSummaryItems={connectorSummaryItems}
                renderedPayloads={renderedPayloads}
                templateValidationByConnector={templateValidationByConnector}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>

        <EuiFlexItem grow={2}>
          <ConfigurationPanel
            variableNameValidationById={variableNameValidationById}
            hasInvalidVariableNames={hasInvalidVariableNames}
            onSaveRequest={onSaveRequest}
            connectorTypeOptions={connectorTypeOptions}
            connectorTypes={connectorTypes}
            templateValidationByConnector={templateValidationByConnector}
            connectorStatusById={connectorStatusById}
            connectorSummaries={connectorSummaries}
            connectorSelectionState={connectorSelectionState}
            isLoadingConnectorTypes={isLoadingConnectorTypes}
            isLoadingConnectors={isLoadingConnectors}
            connectorTypesError={connectorTypesError}
            connectorsError={connectorsError}
            hasEmptyConnectorLabels={hasEmptyConnectorLabels}
            isSaveDisabled={isSaveDisabled}
            isSaving={isSaving}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </div>
    </>
  );
};

export default FormBuilderLayout;

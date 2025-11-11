import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { ActionType } from '@kbn/actions-types';

import type { SupportedConnectorTypeId } from './types';
import PreviewCard from './preview_card';
import InfoPanel from './info_panel';
import { ConfigurationPanel } from './configuration_panel';
import { ConnectorSummaryTable } from './connector_summary';
import { useFormBuilderContext } from './form_builder_context';

export interface FormBuilderLayoutProps {
  isSubmitDisabled: boolean;
  onSubmit: () => void;
  isSubmitting: boolean;
  isSubmitConfirmationVisible: boolean;
  onConfirmConnectorExecution: () => void;
  onCancelConnectorExecution: () => void;
  connectorTypeOptions: Array<{ value: string; text: string }>;
  connectorTypes: Array<ActionType & { id: SupportedConnectorTypeId }>;
  isLoadingConnectorTypes: boolean;
  isLoadingConnectors: boolean;
  connectorTypesError: string | null;
  connectorsError: string | null;
  isSaveDisabled: boolean;
  isSaving: boolean;
  onSaveRequest: () => void;
}

export const FormBuilderLayout = ({
  isSubmitDisabled,
  onSubmit,
  isSubmitting,
  isSubmitConfirmationVisible,
  onConfirmConnectorExecution,
  onCancelConnectorExecution,
  connectorTypeOptions,
  connectorTypes,
  isLoadingConnectorTypes,
  isLoadingConnectors,
  connectorTypesError,
  connectorsError,
  isSaveDisabled,
  isSaving,
  onSaveRequest,
}: FormBuilderLayoutProps) => {
  const {
    derivedState: { connectorSummaryItems },
  } = useFormBuilderContext();

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
                  isSubmitDisabled={isSubmitDisabled}
                  onSubmit={onSubmit}
                  isSubmitting={isSubmitting}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <InfoPanel />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem grow={2}>
            <ConfigurationPanel
              onSaveRequest={onSaveRequest}
              connectorTypeOptions={connectorTypeOptions}
              connectorTypes={connectorTypes}
              isLoadingConnectorTypes={isLoadingConnectorTypes}
              isLoadingConnectors={isLoadingConnectors}
              connectorTypesError={connectorTypesError}
              connectorsError={connectorsError}
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

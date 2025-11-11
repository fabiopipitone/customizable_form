import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AppMountParameters, CoreStart, NotificationsStart } from '@kbn/core/public';
import { EuiButton, EuiCallOut, EuiLoadingSpinner, EuiSpacer } from '@elastic/eui';

import {
  FormConfig,
  FormConnectorConfig,
} from './types';
import { DEFAULT_LAYOUT_COLUMNS, DEFAULT_STRING_SIZE } from './constants';
import { useFormBuilderLifecycle } from './hooks/use_form_builder_lifecycle';
import { FormBuilderProvider } from './form_builder_context';
import FormBuilderLayout from './form_builder_layout';
import { DEFAULT_PAYLOAD_TEMPLATE } from './utils/form_helpers';
import type { CustomizableFormAttributesMeta } from '../../services/persistence';

interface CustomizableFormBuilderProps {
  mode: 'create' | 'edit';
  savedObjectId?: string;
  notifications: NotificationsStart;
  http: CoreStart['http'];
  application: CoreStart['application'];
  history: AppMountParameters['history'];
}

const getConnectorFallbackLabel = (index: number) =>
  i18n.translate('customizableForm.builder.connectorFallbackLabel', {
    defaultMessage: 'Connector {number}',
    values: { number: index + 1 },
  });

const INITIAL_CONNECTORS: FormConnectorConfig[] = [
  {
    id: 'connector-1',
    connectorTypeId: '',
    connectorId: '',
    label: getConnectorFallbackLabel(0),
    isLabelAuto: true,
    documentTemplate: DEFAULT_PAYLOAD_TEMPLATE,
  },
];

const INITIAL_CONFIG: FormConfig = {
  title: i18n.translate('customizableForm.builder.initialTitle', {
    defaultMessage: 'New customizable form',
  }),
  description: i18n.translate('customizableForm.builder.initialDescription', {
    defaultMessage: 'Describe form goals and connectors',
  }),
  showTitle: true,
  showDescription: true,
  layoutColumns: DEFAULT_LAYOUT_COLUMNS,
  requireConfirmationOnSubmit: false,
  connectors: INITIAL_CONNECTORS,
  fields: [
    {
      id: 'field-1',
      key: 'id',
      label: i18n.translate('customizableForm.builder.initialField.idLabel', {
        defaultMessage: 'Event ID',
      }),
      placeholder: 'e.g. e5f3-42aa',
      type: 'text',
      required: true,
      dataType: 'string',
      size: { ...DEFAULT_STRING_SIZE },
    },
    {
      id: 'field-2',
      key: 'timestamp',
      label: i18n.translate('customizableForm.builder.initialField.timestampLabel', {
        defaultMessage: 'Event timestamp',
      }),
      placeholder: 'YYYY-MM-DDTHH:mm:ssZ',
      type: 'text',
      required: true,
      dataType: 'string',
      size: { ...DEFAULT_STRING_SIZE },
    },
    {
      id: 'field-3',
      key: 'message',
      label: i18n.translate('customizableForm.builder.initialField.messageLabel', {
        defaultMessage: 'Message',
      }),
      placeholder: i18n.translate('customizableForm.builder.initialField.messagePlaceholder', {
        defaultMessage: 'Describe the anomaly that triggered this action',
      }),
      type: 'textarea',
      required: true,
      dataType: 'string',
      size: { ...DEFAULT_STRING_SIZE },
    },
  ],
};

const INITIAL_SAVED_OBJECT_ATTRIBUTES: CustomizableFormAttributesMeta = {
  title: '',
  description: '',
};

export const CustomizableFormBuilder = ({
  mode,
  savedObjectId: initialSavedObjectId,
  notifications,
  http,
  application,
  history,
}: CustomizableFormBuilderProps) => {
  const {
    connectorTypes,
    isLoadingConnectorTypes,
    isLoadingConnectors,
    connectorTypesError,
    connectorsError,
    isInitialLoading,
    initialLoadError,
    isSaving,
    handleSaveVisualizationRequest,
    formBuilderContextValue,
    connectorTypeOptions,
    isSaveDisabled,
    isSubmitDisabled,
    isSubmitConfirmationVisible,
    handleTestSubmission,
    handleConfirmConnectorExecution,
    handleCancelConnectorExecution,
    isConnectorExecutionInFlight,
  } = useFormBuilderLifecycle({
    mode,
    savedObjectId: initialSavedObjectId,
    notifications,
    http,
    application,
    history,
    initialConfig: INITIAL_CONFIG,
    initialAttributes: INITIAL_SAVED_OBJECT_ATTRIBUTES,
  });

  if (isInitialLoading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <EuiLoadingSpinner size="xl" />
      </div>
    );
  }

  if (initialLoadError) {
    return (
      <div
        style={{
          padding: '32px',
          maxWidth: 600,
          margin: '0 auto',
        }}
      >
        <EuiCallOut
          color="danger"
          iconType="alert"
          title={i18n.translate('customizableForm.builder.initialLoadErrorTitle', {
            defaultMessage: 'Unable to load form',
          })}
        >
          <p>{initialLoadError}</p>
        </EuiCallOut>
        <EuiSpacer size="m" />
        <EuiButton onClick={() => history.push('/create')} iconType="editorRedo" fill>
          {i18n.translate('customizableForm.builder.initialLoadErrorResetButton', {
            defaultMessage: 'Start a new form',
          })}
        </EuiButton>
      </div>
    );
  }

  return (
    <FormBuilderProvider value={formBuilderContextValue}>
      <FormBuilderLayout
        isSubmitDisabled={isSubmitDisabled}
        onSubmit={handleTestSubmission}
        isSubmitting={isConnectorExecutionInFlight}
        isSubmitConfirmationVisible={isSubmitConfirmationVisible}
        onConfirmConnectorExecution={handleConfirmConnectorExecution}
        onCancelConnectorExecution={handleCancelConnectorExecution}
        connectorTypeOptions={connectorTypeOptions}
        connectorTypes={connectorTypes}
        isLoadingConnectorTypes={isLoadingConnectorTypes}
        isLoadingConnectors={isLoadingConnectors}
        connectorTypesError={connectorTypesError}
        connectorsError={connectorsError}
        isSaveDisabled={isSaveDisabled}
        isSaving={isSaving}
        onSaveRequest={handleSaveVisualizationRequest}
      />
    </FormBuilderProvider>
  );
};

export default CustomizableFormBuilder;

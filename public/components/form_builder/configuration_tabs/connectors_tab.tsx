import React from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiEmptyPrompt,
  EuiFieldText,
  EuiFormRow,
  EuiIcon,
  EuiSelect,
  EuiSpacer,
  EuiToolTip,
} from '@elastic/eui';
import type { ActionConnector } from '@kbn/alerts-ui-shared/src/common/types';
import type { ActionType } from '@kbn/actions-types';

import type { SupportedConnectorTypeId } from '../types';
import { useFormBuilderContext } from '../form_builder_context';
import type { ConnectorSummaryStatus } from '../connector_summary';

const getConnectorFallbackLabel = (index: number) =>
  i18n.translate('customizableForm.builder.connectorFallbackLabel', {
    defaultMessage: 'Connector {number}',
    values: { number: index + 1 },
  });

const toConnectorOptions = (connectors: ActionConnector[]) =>
  connectors.map((connector) => ({ value: connector.id, text: connector.name }));

const DEFAULT_CONNECTOR_STATUS: ConnectorSummaryStatus = {
  hasWarning: false,
  hasError: false,
  hasTemplateWarning: false,
  hasTemplateError: false,
};

interface ConnectorsTabProps {
  connectorTypeOptions: Array<{ value: string; text: string }>;
  connectorTypes: Array<ActionType & { id: SupportedConnectorTypeId }>;
  isLoadingConnectorTypes: boolean;
  isLoadingConnectors: boolean;
  connectorTypesError: string | null;
  connectorsError: string | null;
}

export const ConnectorsTab = ({
  connectorTypeOptions,
  connectorTypes,
  isLoadingConnectorTypes,
  isLoadingConnectors,
  connectorTypesError,
  connectorsError,
}: ConnectorsTabProps) => {
  const {
    formConfig,
    derivedState: { connectorSelectionState, connectorStatusById },
    handleConnectorTypeChange,
    handleConnectorChange,
    handleConnectorLabelChange,
    addConnector,
    removeConnector,
  } = useFormBuilderContext();
  const hasEmptyConnectorLabels = formConfig.connectors.some(
    (connectorConfig) => !(connectorConfig.label || '').trim()
  );

  return (
    <>
      {connectorTypesError ? (
        <>
          <EuiCallOut
            color="danger"
            iconType="warning"
            title={i18n.translate('customizableForm.builder.connectorTypesErrorTitle', {
              defaultMessage: 'Connector types unavailable',
            })}
          >
            <p>{connectorTypesError}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      ) : null}

      {connectorsError ? (
        <>
          <EuiCallOut
            color="danger"
            iconType="warning"
            title={i18n.translate('customizableForm.builder.connectorsErrorTitle', {
              defaultMessage: 'Connectors unavailable',
            })}
          >
            <p>{connectorsError}</p>
          </EuiCallOut>
          <EuiSpacer size="m" />
        </>
      ) : null}

      {formConfig.connectors.length === 0 ? (
        <EuiEmptyPrompt
          iconType="plug"
          title={
            <h3>
              {i18n.translate('customizableForm.builder.connectorsEmptyStateTitle', {
                defaultMessage: 'No connectors configured',
              })}
            </h3>
          }
          body={i18n.translate('customizableForm.builder.connectorsEmptyStateBody', {
            defaultMessage: 'Add at least one connector to deliver the payload.',
          })}
        />
      ) : (
        formConfig.connectors.map((connectorConfig, index) => {
          const selectionState = connectorSelectionState[connectorConfig.id];
          const connectorsForType = selectionState?.connectorsForType ?? [];
          const availableConnectorsForType = selectionState?.availableConnectors ?? [];
          const connectorStatus = connectorStatusById[connectorConfig.id] ?? DEFAULT_CONNECTOR_STATUS;

          const connectorSelectOptions = [
            {
              value: '',
              text: i18n.translate('customizableForm.builder.selectConnectorPlaceholder', {
                defaultMessage: 'Select a connector',
              }),
            },
            ...toConnectorOptions(availableConnectorsForType),
          ];

          const connectorTypeSelectOptions = [
            {
              value: '',
              text: i18n.translate('customizableForm.builder.selectConnectorTypePlaceholder', {
                defaultMessage: 'Select a connector type',
              }),
            },
            ...connectorTypeOptions,
          ];

          const selectedType = connectorTypes.find(
            (type) => type.id === connectorConfig.connectorTypeId
          );
          const selectedConnectorInstance = connectorsForType.find(
            (item) => item.id === connectorConfig.connectorId
          );

          const currentLabel = connectorConfig.label || '';
          const labelPlaceholder =
            selectedConnectorInstance?.name ?? selectedType?.name ?? getConnectorFallbackLabel(index);
          const isLabelInvalid = !currentLabel.trim();

          const accordionLabel =
            currentLabel.trim() ||
            selectedConnectorInstance?.name ||
            selectedType?.name ||
            getConnectorFallbackLabel(index);

          const showConnectorErrorIcon = connectorStatus.hasError;
          const showConnectorWarningIcon = !connectorStatus.hasError && connectorStatus.hasWarning;

          const connectorAccordionLabel = (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>{accordionLabel}</span>
              {showConnectorErrorIcon ? <EuiIcon type="alert" color="danger" size="s" /> : null}
              {showConnectorWarningIcon ? <EuiIcon type="warning" color="warning" size="s" /> : null}
            </span>
          );

          const shouldShowConnectorWarning = connectorStatus.hasWarning;

          return (
            <React.Fragment key={connectorConfig.id}>
              <EuiAccordion
                id={connectorConfig.id}
                buttonContent={connectorAccordionLabel}
                paddingSize="s"
                initialIsOpen={index === 0}
                extraAction={
                  <EuiToolTip
                    content={i18n.translate('customizableForm.builder.removeConnectorTooltip', {
                      defaultMessage: 'Remove connector',
                    })}
                  >
                    <EuiButtonIcon
                      iconType="trash"
                      color="danger"
                      aria-label={i18n.translate('customizableForm.builder.removeConnectorAriaLabel', {
                        defaultMessage: 'Remove connector {number}',
                        values: { number: index + 1 },
                      })}
                      onClick={() => removeConnector(connectorConfig.id)}
                    />
                  </EuiToolTip>
                }
              >
                <EuiSpacer size="s" />

                <EuiFormRow
                  label={i18n.translate('customizableForm.builder.connectorLabelInputLabel', {
                    defaultMessage: 'Label',
                  })}
                  isInvalid={isLabelInvalid}
                  error={
                    isLabelInvalid
                      ? [
                          i18n.translate('customizableForm.builder.connectorLabelRequiredError', {
                            defaultMessage: 'Label is required.',
                          }),
                        ]
                      : undefined
                  }
                >
                  <EuiFieldText
                    value={connectorConfig.label}
                    placeholder={labelPlaceholder}
                    onChange={(event) =>
                      handleConnectorLabelChange(connectorConfig.id, event.target.value)
                    }
                    aria-label={i18n.translate('customizableForm.builder.connectorLabelInputAria', {
                      defaultMessage: 'Connector label',
                    })}
                  />
                </EuiFormRow>

                <EuiFormRow
                  label={i18n.translate('customizableForm.builder.connectorTypeLabel', {
                    defaultMessage: 'Connector type',
                  })}
                  helpText={i18n.translate('customizableForm.builder.connectorTypeHelpText', {
                    defaultMessage: 'Only supported connector types are listed.',
                  })}
                >
                  <EuiSelect
                    options={connectorTypeSelectOptions}
                    value={connectorConfig.connectorTypeId}
                    onChange={(event) =>
                      handleConnectorTypeChange(connectorConfig.id, event.target.value)
                    }
                    disabled={isLoadingConnectorTypes}
                  />
                </EuiFormRow>

                <EuiFormRow
                  label={i18n.translate('customizableForm.builder.connectorLabel', {
                    defaultMessage: 'Connector',
                  })}
                  helpText={i18n.translate('customizableForm.builder.connectorHelpText', {
                    defaultMessage:
                      'Choose an existing connector for the selected type. Configure connectors from Stack Management if none are available.',
                  })}
                >
                  <EuiSelect
                    options={connectorSelectOptions}
                    value={connectorConfig.connectorId}
                    onChange={(event) => handleConnectorChange(connectorConfig.id, event.target.value)}
                    disabled={
                      isLoadingConnectors ||
                      !connectorConfig.connectorTypeId ||
                      connectorSelectOptions.length <= 1
                    }
                  />
                </EuiFormRow>

                {shouldShowConnectorWarning ? (
                  <>
                    <EuiCallOut
                      color="warning"
                      iconType="iInCircle"
                      size="s"
                      title={i18n.translate('customizableForm.builder.noConnectorsWarningTitle', {
                        defaultMessage: 'No connectors found',
                      })}
                    >
                      <p>
                        {i18n.translate('customizableForm.builder.noConnectorsWarningBody', {
                          defaultMessage:
                            'Create a connector of this type or free an existing one to enable submissions.',
                        })}
                      </p>
                    </EuiCallOut>
                    <EuiSpacer size="m" />
                  </>
                ) : null}
              </EuiAccordion>

              <EuiSpacer size="m" />
            </React.Fragment>
          );
        })
      )}

      <EuiButton iconType="plusInCircle" onClick={addConnector} size="s">
        {i18n.translate('customizableForm.builder.addConnectorButton', {
          defaultMessage: 'Add connector',
        })}
      </EuiButton>

      {hasEmptyConnectorLabels ? (
        <>
          <EuiSpacer size="s" />
          <EuiCallOut
            color="danger"
            iconType="alert"
            size="s"
            title={i18n.translate('customizableForm.builder.missingConnectorLabelsTitle', {
              defaultMessage: 'Connector labels required',
            })}
          >
            <p>
              {i18n.translate('customizableForm.builder.missingConnectorLabelsBody', {
                defaultMessage: 'Each connector must have a label to discern which action it performs.',
              })}
            </p>
          </EuiCallOut>
        </>
      ) : null}
    </>
  );
};

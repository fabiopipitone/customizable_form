import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BehaviorSubject, lastValueFrom } from 'rxjs';
import {
  EuiCallOut,
  EuiConfirmModal,
  EuiLoadingSpinner,
  EuiOverlayMask,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { initializeTitleManager, titleComparators } from '@kbn/presentation-publishing';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getEsQueryConfig } from '@kbn/data-plugin/public';
import type { CellActionExecutionContext } from '@kbn/cell-actions';
import {
  buildCustomFilter,
  buildEsQuery,
  FilterStateStore,
  type AggregateQuery,
  type Filter,
  type Query,
  type TimeRange,
} from '@kbn/es-query';
import { buildDataTableRecord } from '@kbn/discover-utils';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { estypes } from '@elastic/elasticsearch';

import { CUSTOMIZABLE_FORM_EMBEDDABLE_TYPE, PLUGIN_ID, PLUGIN_NAME } from '../../common';
import { CustomizableFormPreview } from '../components/form_builder/preview';
import {
  resolveCustomizableForm,
  getDocumentFromResolveResponse,
  type CustomizableFormDocument,
} from '../services/persistence';
import { deserializeFormConfig, type SerializedFormConfig } from '../components/form_builder/serialization';
import type { CustomizableFormSavedObjectAttributes } from '../../common';
import type {
  CustomizableFormEmbeddableApi,
  CustomizableFormEmbeddableSerializedState,
} from './types';
import {
  ConnectorSummaryTable,
  DEFAULT_CONNECTOR_SUMMARY_STATUS,
  type ConnectorSummaryItem,
  type ConnectorSummaryStatus,
} from '../components/form_builder/connector_summary';
import { useFieldValidation } from '../components/form_builder/hooks/use_field_validation';
import { usePayloadTemplates } from '../components/form_builder/hooks/use_payload_templates';
import { useConnectorExecution } from '../components/form_builder/hooks/use_connector_execution';
import {
  buildInitialFieldValues,
  getErrorMessage,
} from '../components/form_builder/utils/form_helpers';
import {
  startRowPickerSession,
  cancelRowPickerSession,
  registerRowPickerScope,
  unregisterRowPickerScope,
  isCellActionContext,
  type RowPickerContext,
} from '../services/row_picker';

const documentFromAttributes = (
  attributes: CustomizableFormSavedObjectAttributes<SerializedFormConfig>
): CustomizableFormDocument => ({
  formConfig: deserializeFormConfig(attributes.formConfig),
  attributes: {
    title: typeof attributes.title === 'string' ? attributes.title : '',
    description: typeof attributes.description === 'string' ? attributes.description : '',
  },
});

type SavedSearchRowPickerMetadata = {
  dataView?: DataView;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  timeRange?: TimeRange;
};

export const getCustomizableFormEmbeddableFactory = ({
  coreStart,
  pluginsStart,
}: {
  coreStart: CoreStart;
  pluginsStart?: {
    uiActions?: import('@kbn/ui-actions-plugin/public').UiActionsStart;
    data?: DataPublicPluginStart;
  };
}): EmbeddableFactory<CustomizableFormEmbeddableSerializedState, CustomizableFormEmbeddableApi> => {
  return {
    type: CUSTOMIZABLE_FORM_EMBEDDABLE_TYPE,
    buildEmbeddable: async ({ initialState, finalizeApi, parentApi, uuid }) => {
      const initialRawState: CustomizableFormEmbeddableSerializedState = initialState.rawState ?? {};
      let savedObjectIdRef: string | null = initialRawState.savedObjectId ?? null;
      let attributesRef = initialRawState.attributes;
      let latestReferences = initialState.references ?? [];

      const titleManager = initializeTitleManager({
        title: initialRawState.title,
        description: initialRawState.description,
        hidePanelTitles: initialRawState.hidePanelTitles,
      });

      const defaultTitle$ = new BehaviorSubject<string | undefined>(undefined);
      const defaultDescription$ = new BehaviorSubject<string | undefined>(undefined);

      const serializeState = () => ({
        rawState: {
          ...titleManager.getLatestState(),
          savedObjectId: savedObjectIdRef ?? undefined,
          attributes: attributesRef,
        },
        references: latestReferences,
      });

      const updateStateRefs = (
        partialState: Partial<CustomizableFormEmbeddableSerializedState>,
        references = latestReferences
      ) => {
        if ('savedObjectId' in partialState) {
          savedObjectIdRef = partialState.savedObjectId ?? null;
        }
        if ('attributes' in partialState) {
          attributesRef = partialState.attributes;
        }
        latestReferences = references;
      };

      const unsavedChangesApi = initializeUnsavedChanges<CustomizableFormEmbeddableSerializedState>({
        uuid,
        parentApi,
        serializeState,
        anyStateChange$: titleManager.anyStateChange$,
        getComparators: () => ({
          ...titleComparators,
          savedObjectId: 'referenceEquality',
          attributes: 'skip',
        }),
        onReset: (lastSaved) => {
          titleManager.reinitializeState(lastSaved?.rawState ?? {});
          if (lastSaved?.rawState) {
            if ('savedObjectId' in lastSaved.rawState) {
              savedObjectIdRef = lastSaved.rawState.savedObjectId ?? null;
            }
            if ('attributes' in lastSaved.rawState) {
              attributesRef = lastSaved.rawState.attributes;
            }
          }
          latestReferences = lastSaved?.references ?? latestReferences;
        },
      });

      const api = finalizeApi({
        ...titleManager.api,
        ...unsavedChangesApi,
        defaultTitle$,
        defaultDescription$,
        serializeState,
        onEdit: async () => {
          if (savedObjectIdRef) {
            await coreStart.application.navigateToApp(PLUGIN_ID, {
              path: `/edit/${encodeURIComponent(savedObjectIdRef)}`,
            });
          } else {
            await coreStart.application.navigateToApp(PLUGIN_ID, { path: '/create' });
          }
        },
        isEditingEnabled: () => Boolean(savedObjectIdRef),
        getTypeDisplayName: () => PLUGIN_NAME,
      });

      const http = coreStart.http;
      const { toasts } = coreStart.notifications;
      const data = pluginsStart?.data;

      const Component: React.FC = () => {
        const [currentSavedObjectId, setCurrentSavedObjectId] = useState<string | null>(
          savedObjectIdRef
        );
        const hasSavedObjectReference = Boolean(currentSavedObjectId);

        const initialDocument = useMemo(() => {
          if (attributesRef) {
            return documentFromAttributes(attributesRef);
          }
          return null;
        }, [attributesRef]);

        const [document, setDocument] = useState<CustomizableFormDocument | null>(initialDocument);
        const [fieldValues, setFieldValues] = useState<Record<string, string>>(
          initialDocument ? buildInitialFieldValues(initialDocument.formConfig.fields) : {}
        );
        const [isSubmitConfirmationVisible, setIsSubmitConfirmationVisible] = useState(false);
        const [isLoading, setIsLoading] = useState<boolean>(
          hasSavedObjectReference && !initialDocument
        );
        const [error, setError] = useState<string | null>(null);
        const [isRowPickerActive, setIsRowPickerActive] = useState<boolean>(false);

        const documentRef = useRef<CustomizableFormDocument | null>(initialDocument);
        const rowPickerScopeRef = useRef<HTMLDivElement | null>(null);

        useEffect(() => {
          documentRef.current = document;
        }, [document]);

        useEffect(() => {
          if (!document?.formConfig.allowRowPicker || !rowPickerScopeRef.current) {
            return;
          }
          const scope = rowPickerScopeRef.current;
          registerRowPickerScope(scope);
          return () => {
            unregisterRowPickerScope(scope);
          };
        }, [document?.formConfig.allowRowPicker, registerRowPickerScope, unregisterRowPickerScope]);

        useEffect(() => {
          if (!document) {
            defaultTitle$.next(PLUGIN_NAME);
            defaultDescription$.next(undefined);
            return;
          }

          const title = document.attributes.title || document.formConfig.title;
          const description = document.attributes.description || document.formConfig.description;
          defaultTitle$.next(title);
          defaultDescription$.next(description);
        }, [document]);

        useEffect(() => {
          if (!hasSavedObjectReference) {
            return;
          }

          let isMounted = true;
          const load = async () => {
            setIsLoading(true);
            setError(null);

            try {
              const resolveResult = await resolveCustomizableForm(http, currentSavedObjectId!);
              if (!isMounted) {
                return;
              }

              const loadedDocument = getDocumentFromResolveResponse(resolveResult);
              setDocument(loadedDocument);
              setFieldValues(buildInitialFieldValues(loadedDocument.formConfig.fields));

              updateStateRefs(
                {
                  savedObjectId: resolveResult.saved_object.id,
                },
                resolveResult.saved_object.references ?? []
              );
              setCurrentSavedObjectId(resolveResult.saved_object.id);
            } catch (err) {
              if (!isMounted) {
                return;
              }
              const message = getErrorMessage(err);
              setError(message);
              toasts.addDanger({
                title: i18n.translate('customizableForm.embeddable.loadErrorTitle', {
                  defaultMessage: 'Unable to load form',
                }),
                text: message,
              });
            } finally {
              if (isMounted) {
                setIsLoading(false);
              }
            }
          };

          load();
          return () => {
            isMounted = false;
          };
        }, [currentSavedObjectId, hasSavedObjectReference, http, toasts]);

        useEffect(
          () => () => {
            cancelRowPickerSession();
          },
          []
        );

        const handleFieldValueChange = useCallback((fieldId: string, value: string) => {
          setFieldValues((prev) => {
            if (prev[fieldId] === value) {
              return prev;
            }
            return {
              ...prev,
              [fieldId]: value,
            };
          });
        }, []);

        const formConfig = document?.formConfig ?? null;
        const { buildRenderedPayloads } = usePayloadTemplates({
          formConfig,
          fieldValues,
        });

        const {
          fieldValidationById,
          hasFieldValidationWarnings,
          hasInvalidVariableNames,
        } = useFieldValidation({
          formConfig,
          fieldValues,
        });

        const formatValue = useCallback((value: unknown): string => {
          if (value == null) {
            return '';
          }
          if (typeof value === 'string') return value;
          if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value);
          }
          try {
            return JSON.stringify(value);
          } catch {
            return String(value);
          }
        }, []);

        const applyFieldValuesFromMap = useCallback(
          (columnValueByName: Map<string, unknown>) => {
            const currentDocument = documentRef.current;
            if (!currentDocument) {
              return { updatedCount: 0, missingRequiredLabels: [] as string[] };
            }

            const missingRequiredLabels: string[] = [];
            let updatedCount = 0;

            setFieldValues((prev) => {
              const next = { ...prev };
              currentDocument.formConfig.fields.forEach((field) => {
                const label = (field.label || field.key || '').trim();
                if (!label) {
                  return;
                }
                const columnValue = columnValueByName.get(label);
                if (columnValue === undefined) {
                  if (field.required) {
                    missingRequiredLabels.push(label);
                  }
                  return;
                }
                next[field.id] = formatValue(columnValue);
                updatedCount += 1;
              });
              return next;
            });

            return { updatedCount, missingRequiredLabels };
          },
          [formatValue, setFieldValues]
        );

        const applyPrefillToasts = useCallback(
          (updatedCount: number, missingRequiredLabels: string[]) => {
            if (updatedCount > 0) {
              toasts.addSuccess({
                title: i18n.translate('customizableForm.embeddable.rowPicker.prefillSuccessTitle', {
                  defaultMessage: 'Fields pre-filled',
                }),
                text: i18n.translate('customizableForm.embeddable.rowPicker.prefillSuccessBody', {
                  defaultMessage: '{count} field(s) were filled from the selected row.',
                  values: { count: updatedCount },
                }),
              });
            } else {
              toasts.addWarning({
                title: i18n.translate('customizableForm.embeddable.rowPicker.noFieldsTitle', {
                  defaultMessage: 'No matching fields found',
                }),
                text: i18n.translate('customizableForm.embeddable.rowPicker.noFieldsBody', {
                  defaultMessage: 'The selected row does not include any matching column names.',
                }),
              });
            }

            if (missingRequiredLabels.length > 0) {
              toasts.addWarning({
                title: i18n.translate('customizableForm.embeddable.rowPicker.missingRequiredTitle', {
                  defaultMessage: 'Some required fields are missing',
                }),
                text: i18n.translate('customizableForm.embeddable.rowPicker.missingRequiredBody', {
                  defaultMessage: 'Missing required columns: {labels}.',
                  values: { labels: missingRequiredLabels.join(', ') },
                }),
              });
            }
          },
          [toasts]
        );

        const applyLensRowPick = useCallback(
          (context: RowPickerContext) => {
            if (isCellActionContext(context)) {
              return;
            }

            const rowIndex = context.data?.rowIndex;
            const table = context.data?.table;
            if (
              !table ||
              typeof rowIndex !== 'number' ||
              !table.rows ||
              rowIndex < 0 ||
              rowIndex >= table.rows.length
            ) {
              toasts.addWarning({
                title: i18n.translate('customizableForm.embeddable.rowPicker.invalidRowTitle', {
                  defaultMessage: 'Unable to read selected row',
                }),
                text: i18n.translate('customizableForm.embeddable.rowPicker.invalidRowBody', {
                  defaultMessage: 'No row data was found for the selected table entry.',
                }),
              });
              return;
            }

            const targetColumns =
              context.data?.columns && context.data.columns.length > 0
                ? new Set(context.data.columns)
                : null;

            const selectedRow = table.rows[rowIndex];
            const columnValueByName = new Map<string, unknown>();
            table.columns.forEach((column) => {
              if (targetColumns && !targetColumns.has(column.id)) {
                return;
              }
              const name = (column.name ?? column.id ?? '').trim();
              if (!name) {
                return;
              }
              columnValueByName.set(name, selectedRow[column.id]);
            });

            const { updatedCount, missingRequiredLabels } = applyFieldValuesFromMap(columnValueByName);
            applyPrefillToasts(updatedCount, missingRequiredLabels);
          },
          [applyFieldValuesFromMap, applyPrefillToasts, toasts]
        );

        const fetchSavedSearchRecord = useCallback(
          async (context: CellActionExecutionContext) => {
            if (!data) {
              toasts.addWarning({
                title: i18n.translate(
                  'customizableForm.embeddable.rowPicker.savedSearch.noDataTitle',
                  {
                    defaultMessage: 'Row picker is not available',
                  }
                ),
                text: i18n.translate(
                  'customizableForm.embeddable.rowPicker.savedSearch.noDataBody',
                  {
                    defaultMessage: 'The data plugin is not available for this panel.',
                  }
                ),
              });
              return null;
            }

            const metadata = (context.metadata ?? {}) as SavedSearchRowPickerMetadata;
            const dataView = metadata.dataView;
            const rawId = context.data?.[0]?.value;
            if (!dataView || rawId == null) {
              toasts.addWarning({
                title: i18n.translate(
                  'customizableForm.embeddable.rowPicker.savedSearch.invalidSelectionTitle',
                  {
                    defaultMessage: 'Unable to read selected document',
                  }
                ),
                text: i18n.translate(
                  'customizableForm.embeddable.rowPicker.savedSearch.invalidSelectionBody',
                  {
                    defaultMessage: 'The selected cell does not include a valid document id.',
                  }
                ),
              });
              return null;
            }

            const id = typeof rawId === 'string' ? rawId : String(rawId);
            const filters: Filter[] = [...(metadata.filters ?? [])];
            if (metadata.timeRange) {
              const timeFilter = data.query.timefilter.timefilter.createFilter(
                dataView,
                metadata.timeRange
              );
              if (timeFilter) {
                filters.push(timeFilter);
              }
            }
            filters.push(
              buildCustomFilter(
                dataView.id ?? dataView.getIndexPattern(),
                { ids: { values: [id] } },
                false,
                false,
                null,
                FilterStateStore.APP_STATE
              )
            );

            try {
              const computedFields = dataView.getComputedFields();
              const runtimeFields = computedFields.runtimeFields as estypes.MappingRuntimeFields;
              const query = buildEsQuery(
                dataView,
                metadata.query ?? { query: '', language: 'kuery' },
                filters,
                getEsQueryConfig(coreStart.uiSettings)
              );
              const response = await lastValueFrom(
                data.search.search({
                  params: {
                    index: dataView.getIndexPattern(),
                    body: {
                      size: 2,
                      query,
                      stored_fields: ['*'],
                      script_fields: computedFields.scriptFields,
                      version: true,
                      _source: true,
                      runtime_mappings: runtimeFields ? runtimeFields : {},
                      fields: [
                        { field: '*', include_unmapped: true },
                        ...(computedFields.docvalueFields || []),
                      ],
                    },
                  },
                })
              );
              const hits = response.rawResponse?.hits?.hits ?? [];
              if (hits.length === 0) {
                toasts.addWarning({
                  title: i18n.translate(
                    'customizableForm.embeddable.rowPicker.savedSearch.noHitsTitle',
                    {
                      defaultMessage: 'Document not found',
                    }
                  ),
                  text: i18n.translate(
                    'customizableForm.embeddable.rowPicker.savedSearch.noHitsBody',
                    {
                      defaultMessage: 'No document could be loaded for the selected _id.',
                    }
                  ),
                });
                return null;
              }

              return {
                record: buildDataTableRecord(hits[0], dataView),
                hasMultipleHits: hits.length > 1,
              };
            } catch (err) {
              toasts.addWarning({
                title: i18n.translate(
                  'customizableForm.embeddable.rowPicker.savedSearch.fetchErrorTitle',
                  {
                    defaultMessage: 'Unable to load document',
                  }
                ),
                text: i18n.translate(
                  'customizableForm.embeddable.rowPicker.savedSearch.fetchErrorBody',
                  {
                    defaultMessage: 'The selected _id could not be retrieved from the saved search.',
                  }
                ),
              });
              return null;
            }
          },
          [coreStart.uiSettings, data, toasts]
        );

        const applySavedSearchRowPick = useCallback(
          async (context: CellActionExecutionContext) => {
            const result = await fetchSavedSearchRecord(context);
            if (!result) {
              return;
            }

            const columnValueByName = new Map<string, unknown>();
            Object.entries(result.record.flattened ?? {}).forEach(([key, value]) => {
              const name = key.trim();
              if (!name) {
                return;
              }
              columnValueByName.set(name, value);
            });

            const { updatedCount, missingRequiredLabels } = applyFieldValuesFromMap(columnValueByName);
            applyPrefillToasts(updatedCount, missingRequiredLabels);

            if (result.hasMultipleHits) {
              toasts.addWarning({
                title: i18n.translate(
                  'customizableForm.embeddable.rowPicker.savedSearch.multipleHitsTitle',
                  {
                    defaultMessage: 'Multiple documents found',
                  }
                ),
                text: i18n.translate(
                  'customizableForm.embeddable.rowPicker.savedSearch.multipleHitsBody',
                  {
                    defaultMessage:
                      'More than one document matched this _id. The first result was used.',
                  }
                ),
              });
            }
          },
          [applyFieldValuesFromMap, applyPrefillToasts, fetchSavedSearchRecord, toasts]
        );

        const applyRowPick = useCallback(
          async (context: RowPickerContext) => {
            if (isCellActionContext(context)) {
              await applySavedSearchRowPick(context);
              return;
            }
            applyLensRowPick(context);
          },
          [applyLensRowPick, applySavedSearchRowPick]
        );

        const connectorLabelsById = useMemo(() => {
          if (!document) {
            return {} as Record<string, string>;
          }
          const map: Record<string, string> = {};
          document.formConfig.connectors.forEach((connector, index) => {
            map[connector.id] =
              (connector.label || '').trim() || i18n.translate('customizableForm.embeddable.connectorFallbackLabel', {
                defaultMessage: 'Connector {number}',
                values: { number: index + 1 },
              });
          });
          return map;
        }, [document]);

        const connectorSummaryItems = useMemo<ConnectorSummaryItem[]>(() => {
          if (!document) {
            return [];
          }

          return document.formConfig.connectors.map((connector, index) => {
            const label =
              (connector.label || '').trim() ||
              i18n.translate('customizableForm.embeddable.connectorFallbackLabel', {
                defaultMessage: 'Connector {number}',
                values: { number: index + 1 },
              });

            const connectorName =
              connector.connectorId && connector.connectorId.trim().length > 0
                ? connector.connectorId
                : i18n.translate('customizableForm.embeddable.connectorSummary.noConnectorSelected', {
                    defaultMessage: 'Not selected',
                  });

            const connectorTypeLabel =
              connector.connectorTypeId && connector.connectorTypeId.trim().length > 0
                ? connector.connectorTypeId
                : i18n.translate('customizableForm.embeddable.connectorSummary.typeUnknown', {
                    defaultMessage: 'Not specified',
                  });

            const hasError =
              !(connector.label || '').trim() ||
              !connector.connectorTypeId ||
              connector.connectorTypeId.trim().length === 0 ||
              !connector.connectorId ||
              connector.connectorId.trim().length === 0;

            const status: ConnectorSummaryStatus = hasError
              ? {
                  ...DEFAULT_CONNECTOR_SUMMARY_STATUS,
                  hasError: true,
                }
              : DEFAULT_CONNECTOR_SUMMARY_STATUS;

            return {
              id: connector.id,
              label,
              connectorName,
              connectorTypeLabel,
              status,
            };
          });
        }, [document]);

        const connectorExecution = useConnectorExecution({
          http,
          toasts,
          formConfig: document ? document.formConfig : null,
          buildRenderedPayloads,
          fieldValues,
          connectorLabelsById,
        });

        const handleRowPickerClick = useCallback(async () => {
          if (!document || document.formConfig.allowRowPicker !== true) {
            toasts.addWarning({
              title: i18n.translate('customizableForm.embeddable.rowPicker.notEnabledTitle', {
                defaultMessage: 'Row picker not enabled',
              }),
              text: i18n.translate('customizableForm.embeddable.rowPicker.notEnabledBody', {
                defaultMessage: 'Enable row picker in the form configuration to use this feature.',
              }),
            });
            return;
          }

          if (isRowPickerActive) {
            cancelRowPickerSession();
            setIsRowPickerActive(false);
            return;
          }

          setIsRowPickerActive(true);
          try {
            const context = await startRowPickerSession(rowPickerScopeRef.current);
            await applyRowPick(context);
          } catch (err) {
            // session cancelled or replaced: ignore
          } finally {
            setIsRowPickerActive(false);
          }
        }, [applyRowPick, document, isRowPickerActive, toasts]);

        const isSubmitDisabled = useMemo(() => {
          if (!document) {
            return true;
          }

          const hasEmptyRequired = document.formConfig.fields.some((field) => {
            if (!field.required) {
              return false;
            }
            const value = fieldValues[field.id] ?? '';
            return value.trim().length === 0;
          });

          return (
            hasEmptyRequired ||
            hasFieldValidationWarnings ||
            hasInvalidVariableNames ||
            connectorExecution.isExecuting
          );
        }, [
          document,
          fieldValues,
          hasFieldValidationWarnings,
          hasInvalidVariableNames,
          connectorExecution.isExecuting,
        ]);

        const handleSubmit = useCallback(() => {
          if (!document || connectorExecution.isExecuting) {
            return;
          }

          if (document.formConfig.connectors.length === 0) {
            toasts.addWarning({
              title: i18n.translate('customizableForm.embeddable.executeConnectors.noConnectorsTitle', {
                defaultMessage: 'No connectors configured',
              }),
              text: i18n.translate('customizableForm.embeddable.executeConnectors.noConnectorsBody', {
                defaultMessage: 'Add at least one connector in the form configuration to submit.',
              }),
            });
            return;
          }

          if (document.formConfig.requireConfirmationOnSubmit) {
            setIsSubmitConfirmationVisible(true);
            return;
          }

          connectorExecution.executeNow();
        }, [
          document,
          connectorExecution,
          toasts,
        ]);

        const handleConfirmConnectorExecution = useCallback(() => {
          setIsSubmitConfirmationVisible(false);
          connectorExecution.executeNow();
        }, [connectorExecution]);

        const handleCancelConnectorExecution = useCallback(() => {
          setIsSubmitConfirmationVisible(false);
        }, []);

        if (isLoading) {
          return (
            <div
              style={{
                minHeight: '160px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <EuiLoadingSpinner size="l" />
            </div>
          );
        }

        if (error) {
          return (
            <EuiCallOut
              color="danger"
              iconType="alert"
              title={i18n.translate('customizableForm.embeddable.loadErrorCalloutTitle', {
                defaultMessage: 'Unable to load form',
              })}
            >
              <EuiText>{error}</EuiText>
            </EuiCallOut>
          );
        }

        if (!document) {
          return (
            <EuiCallOut
              color="warning"
              iconType="questionInCircle"
              title={i18n.translate('customizableForm.embeddable.missingConfigurationTitle', {
                defaultMessage: 'Form not configured',
              })}
            >
              <EuiText>
                {hasSavedObjectReference
                  ? i18n.translate('customizableForm.embeddable.missingSavedObjectDescription', {
                      defaultMessage:
                        'The saved form could not be loaded. Please check that it still exists.',
                    })
                  : i18n.translate('customizableForm.embeddable.missingStateDescription', {
                      defaultMessage:
                        'This panel is not linked to a saved form yet. Save a form to the library and add it again.',
                    })}
              </EuiText>
            </EuiCallOut>
          );
        }

        return (
          <>
            {isSubmitConfirmationVisible ? (
              <EuiOverlayMask>
              <EuiConfirmModal
                title={i18n.translate('customizableForm.embeddable.executeConfirmModalTitle', {
                  defaultMessage: 'Execute connectors?',
                })}
                onCancel={handleCancelConnectorExecution}
                onConfirm={handleConfirmConnectorExecution}
                cancelButtonText={i18n.translate('customizableForm.embeddable.executeConfirmModalCancel', {
                  defaultMessage: 'Cancel',
                })}
                confirmButtonText={i18n.translate('customizableForm.embeddable.executeConfirmModalConfirm', {
                  defaultMessage: 'Execute connectors',
                })}
                defaultFocusedButton="confirm"
                maxWidth={640}
                style={{ width: '640px' }}
              >
                <EuiText size="s">
                  <p>
                    {i18n.translate('customizableForm.embeddable.executeConfirmModalBody', {
                      defaultMessage: 'You are about to trigger the following connectors.',
                      })}
                    </p>
                  </EuiText>
                  <EuiSpacer size="m" />
                  <ConnectorSummaryTable items={connectorSummaryItems} />
                </EuiConfirmModal>
              </EuiOverlayMask>
            ) : null}

            <div style={{ width: '100%' }} ref={rowPickerScopeRef}>
              <CustomizableFormPreview
                config={document.formConfig}
                fieldValues={fieldValues}
                onFieldValueChange={handleFieldValueChange}
                isSubmitDisabled={isSubmitDisabled}
                onSubmit={handleSubmit}
                validationByFieldId={fieldValidationById}
                isSubmitting={connectorExecution.isExecuting}
                enableRowPicker={document.formConfig.allowRowPicker === true}
                onRowPickerClick={handleRowPickerClick}
                isRowPickerActive={isRowPickerActive}
              />
              <EuiSpacer size="s" />
            </div>
          </>
        );
      };

      return {
        api,
        Component,
      };
    },
  };
};

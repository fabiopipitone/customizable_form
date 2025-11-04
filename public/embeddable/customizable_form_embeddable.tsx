import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { EuiCallOut, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';
import { initializeUnsavedChanges } from '@kbn/presentation-containers';
import { initializeTitleManager, titleComparators } from '@kbn/presentation-publishing';

import { CUSTOMIZABLE_FORM_EMBEDDABLE_TYPE, PLUGIN_ID, PLUGIN_NAME } from '../../common';
import type { FormConfig } from '../components/form_builder/types';
import {
  CustomizableFormPreview,
  getFieldValidationResult,
  type FieldValidationResult,
} from '../components/form_builder/preview';
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
import { executeFormConnectors } from '../services/execute_connectors';
import { validateVariableName } from '../components/form_builder/validation';

const buildInitialFieldValues = (config: FormConfig): Record<string, string> =>
  config.fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.id] = '';
    return acc;
  }, {});

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
};

const documentFromAttributes = (
  attributes: CustomizableFormSavedObjectAttributes<SerializedFormConfig>
): CustomizableFormDocument => ({
  formConfig: deserializeFormConfig(attributes.formConfig),
  attributes: {
    title: typeof attributes.title === 'string' ? attributes.title : '',
    description: typeof attributes.description === 'string' ? attributes.description : '',
  },
});

export const getCustomizableFormEmbeddableFactory = ({
  coreStart,
}: {
  coreStart: CoreStart;
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
          initialDocument ? buildInitialFieldValues(initialDocument.formConfig) : {}
        );
        const [isSubmitting, setIsSubmitting] = useState(false);
        const [isLoading, setIsLoading] = useState<boolean>(
          hasSavedObjectReference && !initialDocument
        );
        const [error, setError] = useState<string | null>(null);

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
              setFieldValues(buildInitialFieldValues(loadedDocument.formConfig));

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

        const renderedPayloads = useMemo(() => {
          if (!document) {
            return {} as Record<string, string>;
          }

          const valueMap = document.formConfig.fields.reduce<Record<string, string>>((acc, field) => {
            acc[field.key.trim()] = fieldValues[field.id] ?? '';
            return acc;
          }, {});

          return document.formConfig.connectors.reduce<Record<string, string>>((acc, connectorConfig) => {
            const rendered = connectorConfig.documentTemplate.replace(
              /{{\s*([^{}\s]+)\s*}}/g,
              (_, variable: string) => {
                const trimmed = variable.trim();
                return valueMap[trimmed] ?? '';
              }
            );
            acc[connectorConfig.id] = rendered;
            return acc;
          }, {});
        }, [document, fieldValues]);

        const fieldValidationById = useMemo(() => {
          if (!document) {
            return {} as Record<string, FieldValidationResult>;
          }
          const map: Record<string, FieldValidationResult> = {};
          document.formConfig.fields.forEach((field) => {
            map[field.id] = getFieldValidationResult(field, fieldValues[field.id] ?? '');
          });
          return map;
        }, [document, fieldValues]);

        const hasFieldValidationWarnings = useMemo(
          () => Object.values(fieldValidationById).some((result) => result.isOutOfRange),
          [fieldValidationById]
        );

        const variableNameValidationById = useMemo(() => {
          if (!document) {
            return {} as Record<string, ReturnType<typeof validateVariableName>>;
          }
          const trimmedNames = document.formConfig.fields.map((field) => field.key.trim());
          return document.formConfig.fields.reduce<Record<string, ReturnType<typeof validateVariableName>>>(
            (acc, field) => {
              acc[field.id] = validateVariableName({ value: field.key, existingNames: trimmedNames });
              return acc;
            },
            {}
          );
        }, [document]);

        const hasInvalidVariableNames = useMemo(
          () =>
            Object.values(variableNameValidationById).some((result) => !result.isValid),
          [variableNameValidationById]
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
            isSubmitting
          );
        }, [
          document,
          fieldValues,
          hasFieldValidationWarnings,
          hasInvalidVariableNames,
          isSubmitting,
        ]);

        const handleSubmit = useCallback(async () => {
          if (!document || isSubmitting) {
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

          setIsSubmitting(true);

          try {
            const results = await executeFormConnectors({
              http,
              connectors: document.formConfig.connectors,
              renderedPayloads,
            });

            const successes = results.filter((result) => result.status === 'success');
            const errors = results.filter((result) => result.status === 'error');

            successes.forEach((result) => {
              const label = connectorLabelsById[result.connector.id] ?? result.connector.label ?? result.connector.id;
              toasts.addSuccess({
                title: i18n.translate('customizableForm.embeddable.executeConnectors.successTitle', {
                  defaultMessage: 'Connector executed',
                }),
                text: i18n.translate('customizableForm.embeddable.executeConnectors.successBody', {
                  defaultMessage: '{label} executed successfully.',
                  values: { label },
                }),
              });
            });

            errors.forEach((result) => {
              const label = connectorLabelsById[result.connector.id] ?? result.connector.label ?? result.connector.id;
              toasts.addDanger({
                title: i18n.translate('customizableForm.embeddable.executeConnectors.errorTitle', {
                  defaultMessage: 'Connector execution failed',
                }),
                text:
                  result.message ??
                  i18n.translate('customizableForm.embeddable.executeConnectors.errorBody', {
                    defaultMessage: 'Unable to execute {label}.',
                    values: { label },
                  }),
              });
            });
          } catch (error) {
            toasts.addDanger({
              title: i18n.translate('customizableForm.embeddable.executeConnectors.unexpectedErrorTitle', {
                defaultMessage: 'Submit failed',
              }),
              text: getErrorMessage(error),
            });
          } finally {
            setIsSubmitting(false);
          }
        }, [
          document,
          isSubmitting,
          http,
          renderedPayloads,
          connectorLabelsById,
          toasts,
        ]);

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
          <div style={{ width: '100%' }}>
            <CustomizableFormPreview
              config={document.formConfig}
              fieldValues={fieldValues}
              onFieldValueChange={handleFieldValueChange}
              isSubmitDisabled={isSubmitDisabled}
              onSubmit={handleSubmit}
              validationByFieldId={fieldValidationById}
              isSubmitting={isSubmitting}
            />
            <EuiSpacer size="s" />
            <EuiText color="subdued" size="s">
              {i18n.translate('customizableForm.embeddable.connectorPlaceholder', {
                defaultMessage: 'Submitting executes the configured connectors.',
              })}
            </EuiText>
          </div>
        );
      };

      return {
        api,
        Component,
      };
    },
  };
};

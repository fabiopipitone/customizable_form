import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BehaviorSubject } from 'rxjs';
import { EuiCallOut, EuiLoadingSpinner, EuiSpacer, EuiText } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import type { EmbeddableFactory } from '@kbn/embeddable-plugin/public';

import { CUSTOMIZABLE_FORM_EMBEDDABLE_TYPE } from '../../common';
import type { FormConfig } from '../components/form_builder/types';
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
    buildEmbeddable: async ({ initialState, finalizeApi }) => {
      let latestState: CustomizableFormEmbeddableSerializedState = initialState.rawState ?? {};
      let latestReferences = initialState.references ?? [];

      const defaultTitle$ = new BehaviorSubject<string | undefined>(undefined);
      const defaultDescription$ = new BehaviorSubject<string | undefined>(undefined);

      const setLatestState = (
        nextState: CustomizableFormEmbeddableSerializedState,
        references = latestReferences
      ) => {
        latestState = nextState;
        latestReferences = references;
      };

      const api = finalizeApi({
        defaultTitle$,
        defaultDescription$,
        serializeState: () => ({
          rawState: latestState,
          references: latestReferences,
        }),
      });

      const http = coreStart.http;
      const { toasts } = coreStart.notifications;

      const Component: React.FC = () => {
        const [currentSavedObjectId, setCurrentSavedObjectId] = useState<string | null>(
          latestState.savedObjectId ?? null
        );
        const hasSavedObjectReference = Boolean(currentSavedObjectId);

        const initialDocument = useMemo(() => {
          if (latestState.attributes) {
            return documentFromAttributes(latestState.attributes);
          }
          return null;
        }, [latestState.attributes]);

        const [document, setDocument] = useState<CustomizableFormDocument | null>(initialDocument);
        const [fieldValues, setFieldValues] = useState<Record<string, string>>(
          initialDocument ? buildInitialFieldValues(initialDocument.formConfig) : {}
        );
        const [isLoading, setIsLoading] = useState<boolean>(
          hasSavedObjectReference && !initialDocument
        );
        const [error, setError] = useState<string | null>(null);

        useEffect(() => {
          if (!document) {
            defaultTitle$.next(undefined);
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

              setLatestState(
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

        const isSubmitDisabled = useMemo(() => {
          if (!document) {
            return true;
          }
          return document.formConfig.fields.some((field) => {
            if (!field.required) {
              return false;
            }
            const value = fieldValues[field.id] ?? '';
            return value.trim().length === 0;
          });
        }, [document, fieldValues]);

        const handleSubmit = useCallback(() => {
          if (!document) {
            return;
          }
          // TODO: implement connector execution
          console.log('Customizable form submitted', {
            savedObjectId: currentSavedObjectId,
            fieldValues,
          });
        }, [currentSavedObjectId, document, fieldValues]);

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
          <div>
            <CustomizableFormPreview
              config={document.formConfig}
              fieldValues={fieldValues}
              onFieldValueChange={handleFieldValueChange}
              isSubmitDisabled={isSubmitDisabled}
              onSubmit={handleSubmit}
            />
            <EuiSpacer size="s" />
            <EuiText color="subdued" size="s">
              {i18n.translate('customizableForm.embeddable.connectorPlaceholder', {
                defaultMessage: 'Form submissions are logged to the console in this preview.',
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

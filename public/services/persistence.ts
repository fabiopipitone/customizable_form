import type {
  HttpStart,
  SavedObject,
  SavedObjectsResolveResponse,
} from '@kbn/core/public';
import {
  CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE,
  type CustomizableFormSavedObjectAttributes,
} from '../../common';
import type { FormConfig } from '../components/form_builder/types';
import {
  deserializeFormConfig,
  serializeFormConfig,
  type SerializedFormConfig,
} from '../components/form_builder/serialization';

export type CustomizableFormSavedObject = SavedObject<
  CustomizableFormSavedObjectAttributes<SerializedFormConfig>
>;

export type CustomizableFormResolveResponse =
  SavedObjectsResolveResponse<CustomizableFormSavedObjectAttributes<SerializedFormConfig>>;

const API_BASE_PATH = '/api/customizable_form/forms';

const buildBody = (formConfig: FormConfig) => {
  const serialized = serializeFormConfig(formConfig);
  return JSON.stringify({ formConfig: serialized });
};

export const createCustomizableForm = async (
  http: HttpStart,
  formConfig: FormConfig
): Promise<CustomizableFormSavedObject> => {
  const response = await http.post<{ savedObject: CustomizableFormSavedObject }>(
    API_BASE_PATH,
    {
      body: buildBody(formConfig),
    }
  );

  return response.savedObject;
};

export const updateCustomizableForm = async (
  http: HttpStart,
  id: string,
  formConfig: FormConfig
): Promise<CustomizableFormSavedObject> => {
  const response = await http.put<{ savedObject: CustomizableFormSavedObject }>(
    `${API_BASE_PATH}/${encodeURIComponent(id)}`,
    {
      body: buildBody(formConfig),
    }
  );

  return response.savedObject;
};

export const loadCustomizableForm = async (
  http: HttpStart,
  id: string
): Promise<CustomizableFormSavedObject> => {
  const response = await http.get<{ savedObject: CustomizableFormSavedObject }>(
    `${API_BASE_PATH}/${encodeURIComponent(id)}`
  );
  return response.savedObject;
};

export const resolveCustomizableForm = async (
  http: HttpStart,
  id: string
): Promise<CustomizableFormResolveResponse> => {
  return http.get<CustomizableFormResolveResponse>(
    `${API_BASE_PATH}/${encodeURIComponent(id)}/resolve`
  );
};

export const deleteCustomizableForm = async (http: HttpStart, id: string): Promise<void> => {
  await http.delete(`${API_BASE_PATH}/${encodeURIComponent(id)}`);
};

export interface CustomizableFormSearchResult {
  savedObjects: CustomizableFormSavedObject[];
  total: number;
  perPage: number;
  page: number;
}

export const searchCustomizableForms = async (
  http: HttpStart,
  params: { search?: string; page?: number; perPage?: number } = {}
): Promise<CustomizableFormSearchResult> => {
  const query = new URLSearchParams();
  if (params.search) {
    query.set('search', params.search);
  }
  if (params.page) {
    query.set('page', String(params.page));
  }
  if (params.perPage) {
    query.set('perPage', String(params.perPage));
  }

  const path = query.toString() ? `${API_BASE_PATH}?${query.toString()}` : API_BASE_PATH;

  return http.get<CustomizableFormSearchResult>(path);
};

export const getFormConfigFromSavedObject = (savedObject: CustomizableFormSavedObject): FormConfig =>
  deserializeFormConfig(savedObject.attributes.formConfig);

export const getFormConfigFromResolveResponse = (
  resolveResponse: CustomizableFormResolveResponse
): FormConfig => deserializeFormConfig(resolveResponse.saved_object.attributes.formConfig);

export const createEmptySavedObject = (formConfig: FormConfig): CustomizableFormSavedObject => ({
  id: '',
  type: CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE,
  attributes: {
    title: formConfig.title,
    description: formConfig.description,
    showTitle: formConfig.showTitle,
    showDescription: formConfig.showDescription,
    formConfig: serializeFormConfig(formConfig),
  },
  references: [],
});

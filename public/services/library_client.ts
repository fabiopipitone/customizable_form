import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { VisualizationClient } from '@kbn/visualizations-plugin/public';
import { CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE } from '../../common';
import {
  deleteCustomizableForm,
  searchCustomizableForms,
  loadCustomizableForm,
  type CustomizableFormSavedObject,
} from './persistence';
import { getHttpService } from './core_services';

export interface CustomizableFormVisualizationAttributes {
  title: string;
  description: string;
  showTitle: boolean;
  showDescription: boolean;
  formConfig: unknown;
}

const toVisualizationSavedObject = (
  savedObject: CustomizableFormSavedObject
) => ({
  id: savedObject.id,
  type: CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE,
  attributes: savedObject.attributes,
  references: savedObject.references,
  updatedAt: savedObject.updated_at,
  createdAt: savedObject.created_at,
}) as unknown;

export const getCustomizableFormClient = (
  _contentManagement: ContentManagementPublicStart
) => {
  const http = getHttpService();

  const client: VisualizationClient<string, CustomizableFormVisualizationAttributes> = {
    get: async (id: string) => {
      const savedObject = await loadCustomizableForm(http, id);
      return {
        item: toVisualizationSavedObject(savedObject),
      } as any;
    },
    create: async () => {
      throw new Error('Creating customizable forms via visualize library is not supported.');
    },
    update: async () => {
      throw new Error('Updating customizable forms via visualize library is not supported.');
    },
    delete: async (id: string) => {
      await deleteCustomizableForm(http, id);
      return { success: true } as any;
    },
    search: async (query: SearchQuery = {}) => {
      const response = await searchCustomizableForms(http, {
        search: typeof query.text === 'string' ? query.text : undefined,
        page: query.page,
        perPage: query.perPage,
      });

      return {
        hits: response.savedObjects.map((item) => toVisualizationSavedObject(item)),
        pagination: {
          total: response.total,
          perPage: response.perPage,
          page: response.page,
        },
      } as any;
    },
  };

  return client;
};

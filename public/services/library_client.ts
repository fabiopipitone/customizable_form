import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SOWithMetadata } from '@kbn/content-management-utils';
import type { SerializableAttributes, VisualizationClient } from '@kbn/visualizations-plugin/public';
import { CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE } from '../../common';
import {
  deleteCustomizableForm,
  searchCustomizableForms,
  loadCustomizableForm,
  type CustomizableFormSavedObject,
} from './persistence';
import { getHttpService } from './core_services';

export interface CustomizableFormVisualizationAttributes extends Record<string, unknown> {
  title: string;
  description: string;
  showTitle: boolean;
  showDescription: boolean;
  formConfig: unknown;
}

const toVisualizationSavedObject = (
  savedObject: CustomizableFormSavedObject
): SOWithMetadata<SerializableAttributes> => ({
  id: savedObject.id,
  type: CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE,
  attributes: savedObject.attributes as SerializableAttributes,
  references: savedObject.references,
  updatedAt: savedObject.updated_at,
  createdAt: savedObject.created_at,
  version: savedObject.version,
  namespaces: savedObject.namespaces,
  originId: savedObject.originId,
  managed: (savedObject as unknown as { managed?: boolean }).managed,
});

export const getCustomizableFormClient = (
  _contentManagement: ContentManagementPublicStart
) => {
  const http = getHttpService();

  const client: VisualizationClient<string, SerializableAttributes> = {
    get: async (id: string) => {
      const savedObject = await loadCustomizableForm(http, id);
      return {
        item: toVisualizationSavedObject(savedObject),
        meta: {
          outcome: 'exactMatch',
          aliasTargetId: undefined,
          aliasPurpose: undefined,
        },
      };
    },
    create: async () => {
      throw new Error('Creating customizable forms via visualize library is not supported.');
    },
    update: async () => {
      throw new Error('Updating customizable forms via visualize library is not supported.');
    },
    delete: async (id: string) => {
      await deleteCustomizableForm(http, id);
      return { success: true };
    },
    search: async (query: SearchQuery = {}, _options?: object) => {
      const response = await searchCustomizableForms(http, {
        search: typeof query.text === 'string' ? query.text : undefined,
        page: query.cursor ? Number(query.cursor) : undefined,
        perPage: query.limit,
      });

      return {
        hits: response.savedObjects.map((item) => toVisualizationSavedObject(item)),
        pagination: {
          total: response.total,
          cursor: response.page ? String(response.page) : undefined,
        },
      };
    },
  };

  return client;
};

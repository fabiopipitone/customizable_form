import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { SerializableAttributes, VisualizationClient } from '@kbn/visualizations-plugin/public';

import {
  CUSTOMIZABLE_FORM_CONTENT_ID,
  type CustomizableFormCrudTypes,
} from '../../common/content_management';

export const getCustomizableFormClient = (
  contentManagement: ContentManagementPublicStart
): VisualizationClient<string, SerializableAttributes> => {
  const { client } = contentManagement;

  const visualizationClient = {
    get: async (id: string) =>
      client.get<CustomizableFormCrudTypes['GetIn'], CustomizableFormCrudTypes['GetOut']>({
        contentTypeId: CUSTOMIZABLE_FORM_CONTENT_ID,
        id,
      }),
    create: async () => {
      throw new Error('Creating customizable forms via visualize library is not supported.');
    },
    update: async () => {
      throw new Error('Updating customizable forms via visualize library is not supported.');
    },
    delete: async (id: string) =>
      client.delete<CustomizableFormCrudTypes['DeleteIn'], CustomizableFormCrudTypes['DeleteOut']>({
        contentTypeId: CUSTOMIZABLE_FORM_CONTENT_ID,
        id,
      }),
    search: async (query: SearchQuery = {}, _options?: object) =>
      client.search<CustomizableFormCrudTypes['SearchIn'], CustomizableFormCrudTypes['SearchOut']>({
        contentTypeId: CUSTOMIZABLE_FORM_CONTENT_ID,
        query,
      }),
  };

  return visualizationClient as unknown as VisualizationClient<string, SerializableAttributes>;
};


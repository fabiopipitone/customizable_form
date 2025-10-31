import { i18n } from '@kbn/i18n';
import type { VisTypeAlias } from '@kbn/visualizations-plugin/public';
import {
  CUSTOMIZABLE_FORM_EMBEDDABLE_TYPE,
  CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE,
  PLUGIN_ID,
  PLUGIN_NAME,
  PLUGIN_ROUTE,
} from '../common';
import {
  CUSTOMIZABLE_FORM_CONTENT_ID,
  type CustomizableFormItem,
} from '../common/content_management';
import { getCustomizableFormClient } from './services/library_client';

export const customizableFormVisTypeAlias: VisTypeAlias = {
  alias: {
    app: PLUGIN_ID,
    path: PLUGIN_ROUTE,
  },
  name: 'customizableFormAlias',
  title: PLUGIN_NAME,
  description: i18n.translate('customizableForm.visTypeAlias.description', {
    defaultMessage: 'Create a custom form to make your dashboard interactive.',
  }),
  icon: 'controlsHorizontal',
  stage: 'experimental',
  order: 70,
  appExtensions: {
    visualizations: {
      docTypes: [CUSTOMIZABLE_FORM_CONTENT_ID],
      searchFields: ['title^3', 'description'],
      client: getCustomizableFormClient,
      toListItem(savedObject: CustomizableFormItem) {
        const { id, type, updatedAt, attributes, managed } = savedObject;
        const { title, description } = attributes;

        return {
          id,
          title,
          description,
          updatedAt,
          managed,
          icon: 'controlsHorizontal',
          stage: 'experimental' as const,
          savedObjectType: type ?? CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE,
          type: CUSTOMIZABLE_FORM_EMBEDDABLE_TYPE,
          typeTitle: i18n.translate('customizableForm.visTypeAlias.listItem.typeTitle', {
            defaultMessage: 'Customizable form',
          }),
          editor: {
            editApp: PLUGIN_ID,
            editUrl: `/edit/${encodeURIComponent(id)}`,
          },
        };
      },
    },
  },
};

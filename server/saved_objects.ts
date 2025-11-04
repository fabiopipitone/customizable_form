import type { SavedObject, SavedObjectsServiceSetup } from '@kbn/core/server';
import {
  CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE,
  PLUGIN_NAME,
  PLUGIN_ROUTE,
  type CustomizableFormSavedObjectAttributes,
} from '../common';

export const registerCustomizableFormSavedObjectType = (
  savedObjects: SavedObjectsServiceSetup
) => {
  savedObjects.registerType({
    name: CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE,
    hidden: false,
    namespaceType: 'multiple-isolated',
    management: {
      displayName: PLUGIN_NAME,
      importableAndExportable: true,
      getTitle: (savedObject: SavedObject<CustomizableFormSavedObjectAttributes>) =>
        savedObject.attributes.title,
      getInAppUrl: ({ id }) => ({
        path: `${PLUGIN_ROUTE}#/edit/${encodeURIComponent(id)}`,
        uiCapabilitiesPath: 'customizableForm.show',
      }),
      defaultSearchField: 'title',
      icon: 'tableOfContents',
    },
    mappings: {
      dynamic: false,
      properties: {
        title: { type: 'text' },
        description: { type: 'text' },
        showTitle: { type: 'boolean' },
        showDescription: { type: 'boolean' },
        formConfig: { type: 'flattened' },
      },
    },
  });
};

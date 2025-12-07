import {
  DEFAULT_APP_CATEGORIES,
  type PluginInitializerContext,
  type CoreSetup,
  type CoreStart,
  type Plugin,
  type Logger,
} from '@kbn/core/server';

import type {
  CustomizableFormPluginSetup,
  CustomizableFormPluginStart,
  CustomizableFormPluginSetupDependencies,
  CustomizableFormPluginStartDependencies,
} from './types';
import { defineRoutes } from './routes';
import { registerCustomizableFormSavedObjectType } from './saved_objects';
import {
  CUSTOMIZABLE_FORM_CONTENT_REGISTRATION,
  CustomizableFormStorage,
} from './content_management/storage';
import {
  CUSTOMIZABLE_FORM_EMBEDDABLE_TYPE,
  CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE,
  PLUGIN_ID,
  PLUGIN_NAME,
} from '../common';

export class CustomizableFormPlugin
  implements
    Plugin<
      CustomizableFormPluginSetup,
      CustomizableFormPluginStart,
      CustomizableFormPluginSetupDependencies,
      CustomizableFormPluginStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly isDev: boolean;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
    this.isDev = initializerContext.env.mode.dev;
  }

  public setup(
    core: CoreSetup,
    { contentManagement, embeddable, features }: CustomizableFormPluginSetupDependencies
  ) {
    this.logger.debug('customizableForm: Setup');

    core.capabilities.registerProvider(() => ({
      customizableForm: {
        show: true,
        save: true,
      },
    }));

    features.registerKibanaFeature({
      id: PLUGIN_ID,
      name: PLUGIN_NAME,
      category: DEFAULT_APP_CATEGORIES.kibana,
      app: [PLUGIN_ID, 'dashboard'],
      privileges: {
        all: {
          app: [PLUGIN_ID, 'dashboard'],
          savedObject: { all: [CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE], read: [] },
          ui: ['read', 'write'],
        },
        read: {
          app: [PLUGIN_ID, 'dashboard'],
          savedObject: { all: [], read: [CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE] },
          ui: ['read'],
        },
      },
    });

    registerCustomizableFormSavedObjectType(core.savedObjects);

    contentManagement.register({
      ...CUSTOMIZABLE_FORM_CONTENT_REGISTRATION,
      storage: new CustomizableFormStorage({
        logger: this.logger.get('contentManagement'),
        throwOnResultValidationError: this.isDev,
      }),
    });

    embeddable.registerEmbeddableFactory({
      id: CUSTOMIZABLE_FORM_EMBEDDABLE_TYPE,
    });

    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart, _deps: CustomizableFormPluginStartDependencies) {
    this.logger.debug('customizableForm: Started');
    return {};
  }

  public stop() {}
}

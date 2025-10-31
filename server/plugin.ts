import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
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
    { contentManagement }: CustomizableFormPluginSetupDependencies
  ) {
    this.logger.debug('customizableForm: Setup');

    core.capabilities.registerProvider(() => ({
      customizableForm: {
        show: true,
        save: true,
      },
    }));

    registerCustomizableFormSavedObjectType(core.savedObjects);

    contentManagement.register({
      ...CUSTOMIZABLE_FORM_CONTENT_REGISTRATION,
      storage: new CustomizableFormStorage({
        logger: this.logger.get('contentManagement'),
        throwOnResultValidationError: this.isDev,
      }),
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

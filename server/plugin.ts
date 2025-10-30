import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type { CustomizableFormPluginSetup, CustomizableFormPluginStart } from './types';
import { defineRoutes } from './routes';
import { registerCustomizableFormSavedObjectType } from './saved_objects';

export class CustomizableFormPlugin
  implements Plugin<CustomizableFormPluginSetup, CustomizableFormPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('customizableForm: Setup');

    registerCustomizableFormSavedObjectType(core.savedObjects);

    const router = core.http.createRouter();

    // Register server side APIs
    defineRoutes(router);

    return {};
  }

  public start(core: CoreStart) {
    this.logger.debug('customizableForm: Started');
    return {};
  }

  public stop() {}
}

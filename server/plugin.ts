import type {
  PluginInitializerContext,
  CoreSetup,
  CoreStart,
  Plugin,
  Logger,
} from '@kbn/core/server';

import type { CustomizableFormPluginSetup, CustomizableFormPluginStart } from './types';
import { defineRoutes } from './routes';

export class CustomizableFormPlugin
  implements Plugin<CustomizableFormPluginSetup, CustomizableFormPluginStart>
{
  private readonly logger: Logger;

  constructor(initializerContext: PluginInitializerContext) {
    this.logger = initializerContext.logger.get();
  }

  public setup(core: CoreSetup) {
    this.logger.debug('customizableForm: Setup');
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

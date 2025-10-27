import type { PluginInitializerContext } from '@kbn/core/server';

//  This exports static code and TypeScript types,
//  as well as, Kibana Platform `plugin()` initializer.

export async function plugin(initializerContext: PluginInitializerContext) {
  const { CustomizableFormPlugin } = await import('./plugin');
  return new CustomizableFormPlugin(initializerContext);
}

export type { CustomizableFormPluginSetup, CustomizableFormPluginStart } from './types';

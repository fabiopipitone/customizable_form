import { i18n } from '@kbn/i18n';
import {
  type AppMountParameters,
  type CoreSetup,
  type CoreStart,
  type Plugin,
} from '@kbn/core/public';
import type {
  CustomizableFormPluginSetup,
  CustomizableFormPluginStart,
  AppPluginStartDependencies,
  CustomizableFormPluginSetupDependencies,
} from './types';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_ROUTE } from '../common';
import { customizableFormVisTypeAlias } from './vis_type_alias';

export class CustomizableFormPlugin
  implements Plugin<CustomizableFormPluginSetup, CustomizableFormPluginStart>
{
  public setup(
    core: CoreSetup<AppPluginStartDependencies>,
    { visualizations }: CustomizableFormPluginSetupDependencies
  ): CustomizableFormPluginSetup {
    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      appRoute: PLUGIN_ROUTE,
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        return renderApp(coreStart, depsStart, params);
      },
    });

    visualizations.registerAlias(customizableFormVisTypeAlias);

    return {
      getGreeting() {
        return i18n.translate('customizableForm.greetingText', {
          defaultMessage: 'Hello from {name}!',
          values: {
            name: PLUGIN_NAME,
          },
        });
      },
    };
  }

  public start(core: CoreStart): CustomizableFormPluginStart {
    return {};
  }

  public stop() {}
}

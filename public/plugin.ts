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
import {
  PLUGIN_ID,
  PLUGIN_NAME,
  PLUGIN_ROUTE,
  CUSTOMIZABLE_FORM_EMBEDDABLE_TYPE,
  CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE,
} from '../common';
import {
  CUSTOMIZABLE_FORM_CONTENT_ID,
  CUSTOMIZABLE_FORM_CONTENT_VERSION,
} from '../common/content_management';
import { customizableFormVisTypeAlias } from './vis_type_alias';

export class CustomizableFormPlugin
  implements Plugin<CustomizableFormPluginSetup, CustomizableFormPluginStart>
{
  public setup(
    core: CoreSetup<AppPluginStartDependencies>,
    { visualizations, contentManagement, embeddable }: CustomizableFormPluginSetupDependencies
  ): CustomizableFormPluginSetup {
    const startServicesPromise = core.getStartServices();

    core.application.register({
      id: PLUGIN_ID,
      title: PLUGIN_NAME,
      appRoute: PLUGIN_ROUTE,
      visibleIn: [],
      async mount(params: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await startServicesPromise;
        return renderApp(coreStart, depsStart, params);
      },
    });

    contentManagement.registry.register({
      id: CUSTOMIZABLE_FORM_CONTENT_ID,
      version: {
        latest: CUSTOMIZABLE_FORM_CONTENT_VERSION,
      },
    });

    visualizations.registerAlias(customizableFormVisTypeAlias);

    embeddable.registerReactEmbeddableFactory(
      CUSTOMIZABLE_FORM_EMBEDDABLE_TYPE,
      async () => {
        const { getCustomizableFormEmbeddableFactory } = await import('./embeddable');
        const [coreStart] = await startServicesPromise;
        return getCustomizableFormEmbeddableFactory({ coreStart });
      }
    );

    embeddable.registerAddFromLibraryType({
      savedObjectType: CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE,
      savedObjectName: PLUGIN_NAME,
      getIconForSavedObject: () => 'controlsHorizontal',
      onAdd: (container, savedObject) => {
        container.addNewPanel(
          {
            panelType: CUSTOMIZABLE_FORM_EMBEDDABLE_TYPE,
            serializedState: {
              rawState: {
                savedObjectId: savedObject.id,
              },
              references: savedObject.references ?? [],
            },
          },
          true
        );
      },
    });

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

import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';

export interface CustomizableFormPluginSetup {
  getGreeting: () => string;
}

export interface CustomizableFormPluginStart {}

export interface CustomizableFormPluginSetupDependencies {
  visualizations: VisualizationsSetup;
}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}

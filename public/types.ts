import type { ContentManagementPublicSetup } from '@kbn/content-management-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';

export interface CustomizableFormPluginSetup {
  getGreeting: () => string;
}

export interface CustomizableFormPluginStart {}

export interface CustomizableFormPluginSetupDependencies {
  visualizations: VisualizationsSetup;
  contentManagement: ContentManagementPublicSetup;
}

export interface AppPluginStartDependencies {}

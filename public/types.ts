import type { ContentManagementPublicSetup } from '@kbn/content-management-plugin/public';
import type { EmbeddableSetup, EmbeddableStart } from '@kbn/embeddable-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { VisualizationsSetup } from '@kbn/visualizations-plugin/public';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';

export interface CustomizableFormPluginSetup {
  getGreeting: () => string;
}

export interface CustomizableFormPluginStart {}

export interface CustomizableFormPluginSetupDependencies {
  visualizations: VisualizationsSetup;
  contentManagement: ContentManagementPublicSetup;
  embeddable: EmbeddableSetup;
}

export interface AppPluginStartDependencies {
  embeddable: EmbeddableStart;
  uiActions: UiActionsStart;
  data: DataPublicPluginStart;
}

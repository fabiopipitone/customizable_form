import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

export interface CustomizableFormPluginSetup {
  getGreeting: () => string;
}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CustomizableFormPluginStart {}

export interface AppPluginStartDependencies {
  navigation: NavigationPublicPluginStart;
}

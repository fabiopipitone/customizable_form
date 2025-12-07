// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CustomizableFormPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CustomizableFormPluginStart {}

export interface CustomizableFormPluginSetupDependencies {
  features: import('@kbn/features-plugin/server').FeaturesPluginSetup;
  embeddable: import('@kbn/embeddable-plugin/server').EmbeddableSetup;
  contentManagement: import('@kbn/content-management-plugin/server').ContentManagementServerSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CustomizableFormPluginStartDependencies {}

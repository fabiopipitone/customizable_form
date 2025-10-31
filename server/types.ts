// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CustomizableFormPluginSetup {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CustomizableFormPluginStart {}

export interface CustomizableFormPluginSetupDependencies {
  contentManagement: import('@kbn/content-management-plugin/server').ContentManagementServerSetup;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface CustomizableFormPluginStartDependencies {}


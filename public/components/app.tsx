import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { BrowserRouter as Router } from '@kbn/shared-ux-router';
import type { CoreStart } from '@kbn/core/public';
import type { NavigationPublicPluginStart } from '@kbn/navigation-plugin/public';

import { PLUGIN_ID } from '../../common';
import CustomizableFormBuilder from './form_builder/form_builder';

interface CustomizableFormAppDeps {
  basename: string;
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  navigation: NavigationPublicPluginStart;
}

export const CustomizableFormApp = ({ basename, notifications, http, navigation }: CustomizableFormAppDeps) => {
  return (
    <Router basename={basename}>
      <I18nProvider>
        <>
          <navigation.ui.TopNavMenu appName={PLUGIN_ID} showSearchBar={false} useDefaultBehaviors={true} />
          <CustomizableFormBuilder notifications={notifications} http={http} />
        </>
      </I18nProvider>
    </Router>
  );
};

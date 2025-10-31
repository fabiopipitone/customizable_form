import React from 'react';
import ReactDOM from 'react-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import type { AppPluginStartDependencies } from './types';
import { CustomizableFormApp } from './components/app';

export const renderApp = (
  { notifications, http, application }: CoreStart,
  _deps: AppPluginStartDependencies,
  { element, history }: AppMountParameters
) => {
  ReactDOM.render(
    <CustomizableFormApp
      notifications={notifications}
      http={http}
      application={application}
      history={history}
    />,
    element
  );

  return () => ReactDOM.unmountComponentAtNode(element);
};

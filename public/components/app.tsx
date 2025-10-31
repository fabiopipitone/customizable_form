import React from 'react';
import { I18nProvider } from '@kbn/i18n-react';
import { Router, Routes, Route } from '@kbn/shared-ux-router';
import { Redirect } from 'react-router-dom';
import type { AppMountParameters, CoreStart } from '@kbn/core/public';
import CustomizableFormBuilder from './form_builder/form_builder';

interface CustomizableFormAppDeps {
  notifications: CoreStart['notifications'];
  http: CoreStart['http'];
  application: CoreStart['application'];
  history: AppMountParameters['history'];
}

export const CustomizableFormApp = ({
  notifications,
  http,
  application,
  history,
}: CustomizableFormAppDeps) => (
  <Router history={history}>
    <I18nProvider>
      <Routes>
        <Route exact path="/create">
          <CustomizableFormBuilder
            mode="create"
            notifications={notifications}
            http={http}
            application={application}
            history={history}
          />
        </Route>
        <Route
          path="/edit/:id"
          render={({ match }) => (
            <CustomizableFormBuilder
              mode="edit"
              savedObjectId={match.params.id}
              notifications={notifications}
              http={http}
              application={application}
              history={history}
            />
          )}
        />
        <Route path="*">
          <Redirect to="/create" />
        </Route>
      </Routes>
    </I18nProvider>
  </Router>
);

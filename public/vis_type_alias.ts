import { i18n } from '@kbn/i18n';
import type { VisTypeAlias } from '@kbn/visualizations-plugin/public';
import { PLUGIN_ID, PLUGIN_NAME, PLUGIN_ROUTE } from '../common';

export const customizableFormVisTypeAlias: VisTypeAlias = {
  alias: {
    app: PLUGIN_ID,
    path: PLUGIN_ROUTE,
  },
  name: 'customizableFormAlias',
  title: PLUGIN_NAME,
  description: i18n.translate('customizableForm.visTypeAlias.description', {
    defaultMessage: 'Create a custom form to make your dashboard interactive.',
  }),
  icon: 'controlsHorizontal',
  stage: 'experimental',
  order: 70,
};

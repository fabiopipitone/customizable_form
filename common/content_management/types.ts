import type {
  ContentManagementCrudTypes,
  SavedObjectCreateOptions,
  SavedObjectUpdateOptions,
} from '@kbn/content-management-utils';

import type { CustomizableFormSavedObjectAttributes } from '../types';
import { CUSTOMIZABLE_FORM_CONTENT_ID } from './constants';

export type CustomizableFormCrudTypes = ContentManagementCrudTypes<
  typeof CUSTOMIZABLE_FORM_CONTENT_ID,
  CustomizableFormSavedObjectAttributes,
  Pick<SavedObjectCreateOptions, 'references'>,
  Pick<SavedObjectUpdateOptions, 'references'>,
  object
>;

export type CustomizableFormItem = CustomizableFormCrudTypes['Item'];
export type CustomizableFormSearchOut = CustomizableFormCrudTypes['SearchOut'];


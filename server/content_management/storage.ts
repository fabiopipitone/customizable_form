import type { Logger } from '@kbn/logging';
import { SOContentStorage } from '@kbn/content-management-utils';

import { CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE } from '../../common';
import {
  CUSTOMIZABLE_FORM_CONTENT_ID,
  CUSTOMIZABLE_FORM_CONTENT_VERSION,
  type CustomizableFormCrudTypes,
} from '../../common/content_management';
import { cmServicesDefinition } from './cm_services';

const ALLOWED_ATTRIBUTES = ['title', 'description', 'showTitle', 'showDescription', 'formConfig'];

export class CustomizableFormStorage extends SOContentStorage<CustomizableFormCrudTypes> {
  constructor({ logger, throwOnResultValidationError }: { logger: Logger; throwOnResultValidationError: boolean }) {
    super({
      savedObjectType: CUSTOMIZABLE_FORM_SAVED_OBJECT_TYPE,
      cmServicesDefinition,
      allowedSavedObjectAttributes: ALLOWED_ATTRIBUTES,
      enableMSearch: true,
      logger,
      throwOnResultValidationError,
    });
  }
}

export const CUSTOMIZABLE_FORM_CONTENT_REGISTRATION = {
  id: CUSTOMIZABLE_FORM_CONTENT_ID,
  version: {
    latest: CUSTOMIZABLE_FORM_CONTENT_VERSION,
  },
};

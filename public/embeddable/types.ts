import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';

import type { CustomizableFormSavedObjectAttributes } from '../../common';
import type { SerializedFormConfig } from '../components/form_builder/serialization';

export interface CustomizableFormEmbeddableSerializedState {
  savedObjectId?: string;
  attributes?: CustomizableFormSavedObjectAttributes<SerializedFormConfig>;
}

export type CustomizableFormEmbeddableApi =
  DefaultEmbeddableApi<CustomizableFormEmbeddableSerializedState>;

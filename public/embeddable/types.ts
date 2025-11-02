import type { DefaultEmbeddableApi } from '@kbn/embeddable-plugin/public';
import type { SerializedTitles } from '@kbn/presentation-publishing';

import type { CustomizableFormSavedObjectAttributes } from '../../common';
import type { SerializedFormConfig } from '../components/form_builder/serialization';

export interface CustomizableFormEmbeddableSerializedState extends SerializedTitles {
  savedObjectId?: string;
  attributes?: CustomizableFormSavedObjectAttributes<SerializedFormConfig>;
}

export type CustomizableFormEmbeddableApi =
  DefaultEmbeddableApi<CustomizableFormEmbeddableSerializedState>;

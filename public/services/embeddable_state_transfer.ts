import type { EmbeddableStateTransfer } from '@kbn/embeddable-plugin/public';

let embeddableStateTransfer: EmbeddableStateTransfer | null = null;

export const setEmbeddableStateTransfer = (service: EmbeddableStateTransfer) => {
  embeddableStateTransfer = service;
};

export const getEmbeddableStateTransfer = () => {
  if (!embeddableStateTransfer) {
    throw new Error('Embeddable state transfer service has not been initialized');
  }
  return embeddableStateTransfer;
};

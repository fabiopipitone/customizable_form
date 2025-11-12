import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { BehaviorSubject } from 'rxjs';
import { CustomizableFormPreview } from '../../components/form_builder/preview';
import { getCustomizableFormEmbeddableFactory } from '../customizable_form_embeddable';
import type { SerializedFormConfig } from '../../components/form_builder/serialization';

jest.mock('../../services/persistence', () => ({
  resolveCustomizableForm: jest.fn().mockResolvedValue({
    saved_object: {
      id: 'form-1',
      attributes: {},
      references: [],
    },
    outcome: 'exactMatch',
  }),
  getDocumentFromResolveResponse: jest.fn(() => ({
    formConfig: {
      title: 'Loaded form',
      description: '',
      showTitle: true,
      showDescription: true,
      layoutColumns: 2,
      requireConfirmationOnSubmit: false,
      connectors: [],
      fields: [],
    },
    attributes: { title: 'Loaded form', description: '' },
  })),
}));

jest.mock('../../components/form_builder/preview', () => ({
  CustomizableFormPreview: jest.fn(() => <div data-test-subj="preview">Preview</div>),
}));

const SERIALIZED_FORM: SerializedFormConfig = {
  title: 'Inline form',
  description: '',
  showTitle: true,
  showDescription: true,
  layoutColumns: 2,
  requireConfirmationOnSubmit: false,
  connectors: [
    {
      id: 'connector-1',
      connectorTypeId: '.index',
      connectorId: 'test',
      label: 'Connector',
      isLabelAuto: true,
      documentTemplate: '{}',
    },
  ],
  fields: [],
};

const createEmbeddable = async (overrides?: Partial<SerializedFormConfig>) => {
  const factory = getCustomizableFormEmbeddableFactory({
    coreStart: {
      http: {} as any,
      notifications: { toasts: { addDanger: jest.fn(), addWarning: jest.fn(), addSuccess: jest.fn() } } as any,
    } as any,
  });

  const phase$ = new BehaviorSubject('bootstrap');
  const { Component } = await factory.buildEmbeddable({
    initialState: {
      rawState: {
        attributes: {
          formConfig: { ...SERIALIZED_FORM, ...overrides },
          title: 'Inline form',
          description: '',
          showTitle: true,
          showDescription: true,
        },
      },
    },
    finalizeApi: (api) =>
      ({
        ...api,
        uuid: 'test-embeddable',
        type: 'customizableForm',
        phase$,
      } as any),
    parentApi: undefined,
    uuid: 'test-embeddable',
  });

  return { Component, phase$ };
};

describe('customizable form embeddable', () => {
  it('renders preview after loading state', async () => {
    const { Component, phase$ } = await createEmbeddable();
    const { unmount } = render(<Component />);
    expect(await screen.findByTestId('preview')).toBeInTheDocument();
    unmount();
    phase$.complete();
  });

  it('shows confirmation modal when requireConfirmationOnSubmit is true', async () => {
    (CustomizableFormPreview as jest.Mock).mockImplementation(({ onSubmit }) => (
      <button onClick={onSubmit}>Submit</button>
    ));

    const { Component, phase$ } = await createEmbeddable({ requireConfirmationOnSubmit: true });
    const { unmount } = render(<Component />);

    fireEvent.click(await screen.findByText('Submit'));
    expect(screen.getByText('Execute connectors?')).toBeInTheDocument();
    unmount();
    phase$.complete();
  });
});

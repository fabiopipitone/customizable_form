import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { BehaviorSubject } from 'rxjs';
import { CustomizableFormPreview } from '../../components/form_builder/preview';
import { getCustomizableFormEmbeddableFactory } from '../customizable_form_embeddable';
import type { SerializedFormConfig } from '../../components/form_builder/serialization';
import {
  registerRowPickerScope,
  startRowPickerSession,
  unregisterRowPickerScope,
} from '../../services/row_picker';

let latestPreviewProps: any;

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

jest.mock('../../components/form_builder/preview', () => {
  const actual = jest.requireActual('../../components/form_builder/preview');
  return {
    ...actual,
    CustomizableFormPreview: jest.fn((props) => {
      latestPreviewProps = props;
      return <div data-test-subj="preview">Preview</div>;
    }),
  };
});

jest.mock('../../services/row_picker', () => ({
  registerRowPickerScope: jest.fn(),
  unregisterRowPickerScope: jest.fn(),
  startRowPickerSession: jest.fn().mockResolvedValue({
    data: { rowIndex: 0, table: { rows: [], columns: [] } },
  }),
  cancelRowPickerSession: jest.fn(),
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
  const toasts = {
    addDanger: jest.fn(),
    addWarning: jest.fn(),
    addSuccess: jest.fn(),
  };
  const factory = getCustomizableFormEmbeddableFactory({
    coreStart: {
      http: {} as any,
      notifications: { toasts } as any,
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

  return { Component, phase$, toasts };
};

describe('customizable form embeddable', () => {
  beforeEach(() => {
    latestPreviewProps = undefined;
    jest.clearAllMocks();
    (CustomizableFormPreview as jest.Mock).mockImplementation((props) => {
      latestPreviewProps = props;
      return <div data-test-subj="preview">Preview</div>;
    });
    (startRowPickerSession as jest.Mock).mockResolvedValue({
      data: { rowIndex: 0, table: { rows: [], columns: [] } },
    });
  });

  it('renders preview after loading state', async () => {
    const { Component, phase$ } = await createEmbeddable();
    const { unmount } = render(<Component />);
    expect(await screen.findByTestId('preview')).toBeInTheDocument();
    unmount();
    phase$.complete();
  });

  it('shows confirmation modal when requireConfirmationOnSubmit is true', async () => {
    (CustomizableFormPreview as jest.Mock).mockImplementation((props) => {
      latestPreviewProps = props;
      return <button onClick={props.onSubmit}>Submit</button>;
    });

    const { Component, phase$ } = await createEmbeddable({ requireConfirmationOnSubmit: true });
    const { unmount } = render(<Component />);

    fireEvent.click(await screen.findByText('Submit'));
    expect(screen.getByText('Execute connectors?')).toBeInTheDocument();
    unmount();
    phase$.complete();
  });

  it('registers and unregisters row picker scope when enabled', async () => {
    const { Component, phase$ } = await createEmbeddable({ allowRowPicker: true });
    const { unmount } = render(
      <div className="dshDashboardViewport">
        <Component />
      </div>
    );

    expect(registerRowPickerScope).toHaveBeenCalledTimes(1);
    expect(registerRowPickerScope).toHaveBeenCalledWith(expect.any(HTMLElement));

    unmount();
    expect(unregisterRowPickerScope).toHaveBeenCalledTimes(1);
    phase$.complete();
  });

  it('starts row picker session with the scoped element', async () => {
    (CustomizableFormPreview as jest.Mock).mockImplementation((props) => {
      latestPreviewProps = props;
      return (
        <button onClick={props.onRowPickerClick} disabled={!props.enableRowPicker}>
          Pin
        </button>
      );
    });

    const { Component, phase$ } = await createEmbeddable({ allowRowPicker: true });
    const { unmount } = render(
      <div className="dshDashboardViewport">
        <Component />
      </div>
    );

    fireEvent.click(await screen.findByText('Pin'));

    expect(startRowPickerSession).toHaveBeenCalledTimes(1);
    expect(startRowPickerSession).toHaveBeenCalledWith(expect.any(HTMLElement));

    unmount();
    phase$.complete();
  });

});

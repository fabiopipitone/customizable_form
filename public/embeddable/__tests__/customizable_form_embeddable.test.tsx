import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { BehaviorSubject, of } from 'rxjs';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { CustomizableFormPreview } from '../../components/form_builder/preview';
import { getCustomizableFormEmbeddableFactory } from '../customizable_form_embeddable';
import type { SerializedFormConfig } from '../../components/form_builder/serialization';
import {
  registerRowPickerScope,
  startRowPickerSession,
  unregisterRowPickerScope,
} from '../../services/row_picker';

let latestPreviewProps: any;

jest.mock('@kbn/discover-utils', () => {
  return {
    buildDataTableRecord: jest.fn(),
  };
});

jest.mock('@kbn/es-query', () => {
  return {
    buildEsQuery: jest.fn(() => ({ bool: { filter: [] } })),
    buildCustomFilter: jest.fn(() => ({})),
    FilterStateStore: { APP_STATE: 'appState' },
    COMPARE_ALL_OPTIONS: {},
    onlyDisabledFiltersChanged: jest.fn(() => true),
  };
});

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
  isCellActionContext: (context: { data?: unknown }) => Array.isArray(context.data),
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

const createEmbeddable = async (
  overrides?: Partial<SerializedFormConfig>,
  options?: { data?: any }
) => {
  const toasts = {
    addDanger: jest.fn(),
    addWarning: jest.fn(),
    addSuccess: jest.fn(),
  };
  const factory = getCustomizableFormEmbeddableFactory({
    coreStart: {
      http: {} as any,
      notifications: { toasts } as any,
      uiSettings: { get: jest.fn() } as any,
    } as any,
    pluginsStart: {
      data: options?.data,
    },
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
    (buildDataTableRecord as jest.Mock).mockReturnValue({
      id: 'doc-1',
      raw: {},
      flattened: {},
    });
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

  it('prefills fields from saved search _id cell action', async () => {
    (CustomizableFormPreview as jest.Mock).mockImplementation((props) => {
      latestPreviewProps = props;
      return (
        <button onClick={props.onRowPickerClick} disabled={!props.enableRowPicker}>
          Pin
        </button>
      );
    });

    const dataView = {
      id: 'data-view-1',
      getIndexPattern: () => 'logs-*',
      getComputedFields: () => ({ scriptFields: {}, runtimeFields: {}, docvalueFields: [] }),
    };

    const data = {
      search: {
        search: jest.fn(() =>
          of({
            rawResponse: {
              hits: {
                hits: [{ _id: 'abc', _index: 'logs-1' }, { _id: 'abc', _index: 'logs-2' }],
              },
            },
          })
        ),
      },
      query: {
        timefilter: {
          timefilter: {
            createFilter: jest.fn(() => null),
          },
        },
      },
    };

    (buildDataTableRecord as jest.Mock).mockReturnValue({
      id: 'doc-1',
      raw: {},
      flattened: {
        Carrier: ['JetBeats'],
      },
    });

    (startRowPickerSession as jest.Mock).mockResolvedValue({
      data: [{ field: { name: '_id' }, value: 'abc' }],
      metadata: { dataView },
    });

    const { Component, phase$, toasts } = await createEmbeddable(
      {
        allowRowPicker: true,
        fields: [
          {
            id: 'field-1',
            key: 'carrier',
            label: 'Carrier',
            type: 'text',
            required: true,
            dataType: 'string',
          },
          {
            id: 'field-2',
            key: 'dest',
            label: 'DestAirportID',
            type: 'text',
            required: true,
            dataType: 'string',
          },
        ],
      },
      { data }
    );
    const { unmount } = render(<Component />);

    fireEvent.click(await screen.findByText('Pin'));

    await waitFor(() => {
      expect(latestPreviewProps.fieldValues).toEqual({
        'field-1': 'JetBeats',
        'field-2': '',
      });
    });

    const warningTitles = toasts.addWarning.mock.calls.map(([call]) => call?.title);
    expect(warningTitles).toContain('Some required fields are missing');
    expect(warningTitles).toContain('Multiple documents found');

    unmount();
    phase$.complete();
  });

});

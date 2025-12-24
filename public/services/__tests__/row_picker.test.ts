const createDashboardScope = () => {
  document.body.innerHTML = `
    <div class="dshDashboardViewportWrapper">
      <div class="dshDashboardViewport">
        <div id="scope-target"></div>
      </div>
    </div>
  `;
  return {
    target: document.getElementById('scope-target') as HTMLElement,
    viewport: document.querySelector('.dshDashboardViewport') as HTMLElement,
  };
};

describe('row picker scope helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.resetModules();
  });

  it('tracks scope ref counts and classes', async () => {
    const { registerRowPickerScope, unregisterRowPickerScope } = await import('../row_picker');
    const { target, viewport } = createDashboardScope();

    registerRowPickerScope(target);
    expect(viewport.classList.contains('customizableFormRowPickerScope')).toBe(true);
    expect(viewport.getAttribute('data-customizable-form-picker-scope-count')).toBe('1');

    registerRowPickerScope(target);
    expect(viewport.getAttribute('data-customizable-form-picker-scope-count')).toBe('2');

    unregisterRowPickerScope(target);
    expect(viewport.getAttribute('data-customizable-form-picker-scope-count')).toBe('1');
    expect(viewport.classList.contains('customizableFormRowPickerScope')).toBe(true);

    unregisterRowPickerScope(target);
    expect(viewport.getAttribute('data-customizable-form-picker-scope-count')).toBe(null);
    expect(viewport.classList.contains('customizableFormRowPickerScope')).toBe(false);
  });

  it('toggles active class during a picker session', async () => {
    const { initializeRowPicker, startRowPickerSession, cancelRowPickerSession } =
      await import('../row_picker');
    const { target, viewport } = createDashboardScope();

    const uiActions = {
      hasTrigger: jest.fn(() => true),
      registerAction: jest.fn(),
      attachAction: jest.fn(),
    };

    initializeRowPicker(uiActions as any);

    const sessionPromise = startRowPickerSession(target);
    expect(viewport.classList.contains('customizableFormRowPickerActive')).toBe(true);

    cancelRowPickerSession();
    await expect(sessionPromise).rejects.toThrow('Row picker session cancelled.');
    expect(viewport.classList.contains('customizableFormRowPickerActive')).toBe(false);
  });

  it('registers cell action for saved search _id cells', async () => {
    const { initializeRowPicker } = await import('../row_picker');

    const registerAction = jest.fn();
    const attachAction = jest.fn();
    const hasTrigger = jest.fn((id: string) =>
      ['ROW_CLICK_TRIGGER', 'DISCOVER_CELL_ACTIONS_TRIGGER_ID'].includes(id)
    );

    initializeRowPicker({ hasTrigger, registerAction, attachAction } as any);

    const registeredIds = registerAction.mock.calls.map(([definition]) => definition.id);
    expect(registeredIds).toEqual(
      expect.arrayContaining([
        'customizableFormRowPickerAction',
        'customizableFormRowPickerCellAction',
      ])
    );
    expect(attachAction).toHaveBeenCalledWith(
      'DISCOVER_CELL_ACTIONS_TRIGGER_ID',
      'customizableFormRowPickerCellAction'
    );

    const cellAction = registerAction.mock.calls
      .map(([definition]) => definition)
      .find((definition) => definition.id === 'customizableFormRowPickerCellAction');

    expect(
      await cellAction.isCompatible({ data: [{ field: { name: '_id' } }] } as any)
    ).toBe(true);
    expect(
      await cellAction.isCompatible({ data: [{ field: { name: 'carrier' } }] } as any)
    ).toBe(false);
  });
});

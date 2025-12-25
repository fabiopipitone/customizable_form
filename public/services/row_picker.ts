import type {
  UiActionsActionDefinition,
  RowClickContext,
  UiActionsStart,
} from '@kbn/ui-actions-plugin/public';
import { ROW_CLICK_TRIGGER } from '@kbn/ui-actions-plugin/public';
import type { CellActionExecutionContext } from '@kbn/cell-actions';

export type RowPickerContext = RowClickContext | CellActionExecutionContext;

type PendingPicker = {
  resolve: (context: RowPickerContext) => void;
  reject: (error: Error) => void;
};

let uiActions: UiActionsStart | null = null;
let isRowClickRegistered = false;
let isCellActionRegistered = false;
let isRowClickAttached = false;
let isDiscoverCellAttached = false;
let isSearchEmbeddableCellAttached = false;
let pendingPicker: PendingPicker | null = null;

const ROW_PICKER_ACTION_ID = 'customizableFormRowPickerAction';
const ROW_PICKER_CELL_ACTION_ID = 'customizableFormRowPickerCellAction';
const DISCOVER_CELL_ACTIONS_TRIGGER_ID = 'DISCOVER_CELL_ACTIONS_TRIGGER_ID';
const SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID = 'SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID';
const ROW_PICKER_SCOPE_CLASS = 'customizableFormRowPickerScope';
const ROW_PICKER_ACTIVE_CLASS = 'customizableFormRowPickerActive';
const ROW_PICKER_SCOPE_COUNT_ATTR = 'data-customizable-form-picker-scope-count';

let activeScope: HTMLElement | null = null;

const resolveScopeElement = (source?: HTMLElement | null): HTMLElement | null => {
  if (!source) {
    return null;
  }
  const viewport = source.closest<HTMLElement>('.dshDashboardViewport');
  if (viewport) {
    return viewport;
  }
  const wrapper = source.closest<HTMLElement>('.dshDashboardViewportWrapper');
  if (wrapper) {
    return wrapper;
  }
  return source;
};

const updateScopeCount = (scope: HTMLElement, delta: number) => {
  const current = Number(scope.getAttribute(ROW_PICKER_SCOPE_COUNT_ATTR)) || 0;
  const next = Math.max(0, current + delta);
  if (next === 0) {
    scope.removeAttribute(ROW_PICKER_SCOPE_COUNT_ATTR);
    scope.classList.remove(ROW_PICKER_SCOPE_CLASS);
    scope.classList.remove(ROW_PICKER_ACTIVE_CLASS);
    if (activeScope === scope) {
      activeScope = null;
    }
    return;
  }
  scope.setAttribute(ROW_PICKER_SCOPE_COUNT_ATTR, String(next));
  scope.classList.add(ROW_PICKER_SCOPE_CLASS);
};

export const registerRowPickerScope = (scopeElement?: HTMLElement | null) => {
  const scope = resolveScopeElement(scopeElement);
  if (!scope) {
    return;
  }
  updateScopeCount(scope, 1);
};

export const unregisterRowPickerScope = (scopeElement?: HTMLElement | null) => {
  const scope = resolveScopeElement(scopeElement);
  if (!scope) {
    return;
  }
  updateScopeCount(scope, -1);
};

const setRowPickerActiveClass = (active: boolean, scopeElement?: HTMLElement | null) => {
  const scope = resolveScopeElement(scopeElement) ?? activeScope;
  if (!scope) {
    return;
  }
  if (active) {
    if (activeScope && activeScope !== scope) {
      activeScope.classList.remove(ROW_PICKER_ACTIVE_CLASS);
    }
    scope.classList.add(ROW_PICKER_SCOPE_CLASS);
    scope.classList.add(ROW_PICKER_ACTIVE_CLASS);
    activeScope = scope;
  } else {
    scope.classList.remove(ROW_PICKER_ACTIVE_CLASS);
    if (activeScope === scope) {
      activeScope = null;
    }
  }
};

const ensureRowClickAction = () => {
  if (!uiActions) {
    return;
  }
  if (!isRowClickRegistered) {
    const action: UiActionsActionDefinition<RowClickContext> = {
      id: ROW_PICKER_ACTION_ID,
      type: ROW_PICKER_ACTION_ID,
      getDisplayName: () => 'Customizable form row picker',
      getIconType: () => undefined,
      order: 0,
      // Keep compatible so Lens adds the row actions column; execution will be a no-op
      // if no picker session is active.
      isCompatible: async () => true,
      execute: async (context: RowClickContext) => {
        if (!pendingPicker) {
          return;
        }

        const { resolve } = pendingPicker;
        pendingPicker = null;
        resolve(context);
        setRowPickerActiveClass(false);
      },
      shouldAutoExecute: async () => true,
    };

    uiActions.registerAction(action);
    isRowClickRegistered = true;
  }

  if (!isRowClickAttached && uiActions.hasTrigger(ROW_CLICK_TRIGGER)) {
    uiActions.attachAction(ROW_CLICK_TRIGGER, ROW_PICKER_ACTION_ID);
    isRowClickAttached = true;
  }
};

const ensureCellAction = () => {
  if (!uiActions) {
    return;
  }
  if (!isCellActionRegistered) {
    const cellAction: UiActionsActionDefinition<CellActionExecutionContext> = {
      id: ROW_PICKER_CELL_ACTION_ID,
      type: ROW_PICKER_CELL_ACTION_ID,
      getDisplayName: () => 'Use row values',
      getIconType: () => 'pin',
      order: 0,
      isCompatible: async (context) => {
        const fieldName = context.data?.[0]?.field?.name;
        return fieldName === '_id';
      },
      execute: async (context: CellActionExecutionContext) => {
        if (!pendingPicker) {
          return;
        }

        const { resolve } = pendingPicker;
        pendingPicker = null;
        resolve(context);
        setRowPickerActiveClass(false);
      },
    };

    uiActions.registerAction(cellAction);
    isCellActionRegistered = true;
  }

  if (!isDiscoverCellAttached && uiActions.hasTrigger(DISCOVER_CELL_ACTIONS_TRIGGER_ID)) {
    uiActions.attachAction(DISCOVER_CELL_ACTIONS_TRIGGER_ID, ROW_PICKER_CELL_ACTION_ID);
    isDiscoverCellAttached = true;
  }
  if (!isSearchEmbeddableCellAttached && uiActions.hasTrigger(SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID)) {
    uiActions.attachAction(SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID, ROW_PICKER_CELL_ACTION_ID);
    isSearchEmbeddableCellAttached = true;
  }
};

const ensureRowPickerActions = () => {
  ensureRowClickAction();
  ensureCellAction();
};

const hasRowPickerTriggers = () =>
  Boolean(
    uiActions &&
      (uiActions.hasTrigger(ROW_CLICK_TRIGGER) ||
        uiActions.hasTrigger(DISCOVER_CELL_ACTIONS_TRIGGER_ID) ||
        uiActions.hasTrigger(SEARCH_EMBEDDABLE_CELL_ACTIONS_TRIGGER_ID))
  );

export const isCellActionContext = (
  context: RowPickerContext
): context is CellActionExecutionContext => Array.isArray((context as CellActionExecutionContext).data);

export const initializeRowPicker = (uiActionsStart: UiActionsStart) => {
  uiActions = uiActionsStart;
  ensureRowPickerActions();
};

export const startRowPickerSession = (
  scopeElement?: HTMLElement | null
): Promise<RowPickerContext> => {
  ensureRowPickerActions();
  if (!uiActions || !hasRowPickerTriggers()) {
    return Promise.reject(new Error('Row picker is not available.'));
  }

  if (pendingPicker) {
    pendingPicker.reject(new Error('Row picker session replaced.'));
    pendingPicker = null;
    setRowPickerActiveClass(false);
  }

  return new Promise<RowPickerContext>((resolve, reject) => {
    pendingPicker = { resolve, reject };
    setRowPickerActiveClass(true, scopeElement);
  });
};

export const cancelRowPickerSession = () => {
  if (pendingPicker) {
    pendingPicker.reject(new Error('Row picker session cancelled.'));
    pendingPicker = null;
    setRowPickerActiveClass(false);
  }
};

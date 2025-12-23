import type {
  UiActionsActionDefinition,
  RowClickContext,
  UiActionsStart,
} from '@kbn/ui-actions-plugin/public';
import { ROW_CLICK_TRIGGER } from '@kbn/ui-actions-plugin/public';

type PendingPicker = {
  resolve: (context: RowClickContext) => void;
  reject: (error: Error) => void;
};

let uiActions: UiActionsStart | null = null;
let isRegistered = false;
let pendingPicker: PendingPicker | null = null;

const ROW_PICKER_ACTION_ID = 'customizableFormRowPickerAction';
const ROW_PICKER_ACTIVE_CLASS = 'customizableFormRowPickerActive';
const ROW_PICKER_STYLE_ID = 'customizableFormRowPickerStyles';

const ensureRowPickerStyles = () => {
  if (typeof document === 'undefined') {
    return;
  }
  if (document.getElementById(ROW_PICKER_STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = ROW_PICKER_STYLE_ID;
  style.textContent = `
body:not(.${ROW_PICKER_ACTIVE_CLASS}) .euiDataGridHeaderCell--controlColumn#trailingControlColumn,
body:not(.${ROW_PICKER_ACTIVE_CLASS}) .euiDataGridRowCell--controlColumn[data-gridcell-column-id="trailingControlColumn"] {
  display: none !important;
  width: 0 !important;
  min-width: 0 !important;
  padding: 0 !important;
}
`;
  document.head.appendChild(style);
};

const setRowPickerActiveClass = (active: boolean) => {
  if (typeof document === 'undefined') {
    return;
  }
  ensureRowPickerStyles();
  document.body.classList.toggle(ROW_PICKER_ACTIVE_CLASS, active);
};

export const initializeRowPicker = (uiActionsStart: UiActionsStart) => {
  uiActions = uiActionsStart;
  if (isRegistered || !uiActions?.hasTrigger(ROW_CLICK_TRIGGER)) {
    return;
  }

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

  ensureRowPickerStyles();
  uiActions.registerAction(action);
  uiActions.attachAction(ROW_CLICK_TRIGGER, ROW_PICKER_ACTION_ID);
  isRegistered = true;
};

export const startRowPickerSession = (): Promise<RowClickContext> => {
  if (!uiActions || !uiActions.hasTrigger(ROW_CLICK_TRIGGER)) {
    return Promise.reject(new Error('Row picker is not available.'));
  }

  if (pendingPicker) {
    pendingPicker.reject(new Error('Row picker session replaced.'));
    pendingPicker = null;
    setRowPickerActiveClass(false);
  }

  return new Promise<RowClickContext>((resolve, reject) => {
    pendingPicker = { resolve, reject };
    setRowPickerActiveClass(true);
  });
};

export const cancelRowPickerSession = () => {
  if (pendingPicker) {
    pendingPicker.reject(new Error('Row picker session cancelled.'));
    pendingPicker = null;
    setRowPickerActiveClass(false);
  }
};

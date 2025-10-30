export interface CustomizableFormSavedObjectAttributes<TFormConfig = unknown>
  extends Record<string, unknown> {
  title: string;
  description: string;
  showTitle: boolean;
  showDescription: boolean;
  formConfig: TFormConfig;
}

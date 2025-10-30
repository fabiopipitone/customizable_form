export interface CustomizableFormSavedObjectAttributes<TFormConfig = unknown> {
  title: string;
  description: string;
  showTitle: boolean;
  showDescription: boolean;
  formConfig: TFormConfig;
}

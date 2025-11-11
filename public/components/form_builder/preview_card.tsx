import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import PanelHeader from './panel_header';
import { CustomizableFormPreview } from './preview';
import { useFormBuilderContext } from './form_builder_context';

export interface PreviewCardProps {
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export const PreviewCard = ({ isSubmitDisabled, isSubmitting, onSubmit }: PreviewCardProps) => {
  const { formConfig, fieldValues, handleFieldValueChange, derivedState } = useFormBuilderContext();
  const { fieldValidationById } = derivedState;

  return (
  <EuiPanel paddingSize="m" hasShadow hasBorder={false}>
    <PanelHeader
      title={i18n.translate('customizableForm.builder.previewPanelTitle', {
        defaultMessage: 'Preview',
      })}
    />
    <CustomizableFormPreview
      config={formConfig}
      fieldValues={fieldValues}
      onFieldValueChange={handleFieldValueChange}
      isSubmitDisabled={isSubmitDisabled}
      onSubmit={onSubmit}
      validationByFieldId={fieldValidationById}
      isSubmitting={isSubmitting}
    />
  </EuiPanel>
  );
};

export default PreviewCard;

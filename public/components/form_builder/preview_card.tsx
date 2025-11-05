import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import PanelHeader from './panel_header';
import {
  CustomizableFormPreview,
  type CustomizableFormPreviewProps,
} from './preview';

export interface PreviewCardProps extends CustomizableFormPreviewProps {}

export const PreviewCard = ({
  config,
  fieldValues,
  onFieldValueChange,
  isSubmitDisabled,
  onSubmit,
  validationByFieldId,
  isSubmitting,
}: PreviewCardProps) => (
  <EuiPanel paddingSize="m" hasShadow hasBorder={false}>
    <PanelHeader
      title={i18n.translate('customizableForm.builder.previewPanelTitle', {
        defaultMessage: 'Preview',
      })}
    />
    <CustomizableFormPreview
      config={config}
      fieldValues={fieldValues}
      onFieldValueChange={onFieldValueChange}
      isSubmitDisabled={isSubmitDisabled}
      onSubmit={onSubmit}
      validationByFieldId={validationByFieldId}
      isSubmitting={isSubmitting}
    />
  </EuiPanel>
);

export default PreviewCard;

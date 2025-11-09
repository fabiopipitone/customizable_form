import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFieldNumber, EuiFieldText, EuiForm, EuiFormRow, EuiSwitch, EuiTextArea } from '@elastic/eui';

import { MAX_LAYOUT_COLUMNS, MIN_LAYOUT_COLUMNS } from '../constants';
import { useFormBuilderContext } from '../form_builder_context';

export const GeneralTab = () => {
  const { formConfig, updateConfig } = useFormBuilderContext();

  return (
    <EuiForm component="div">
      <EuiFormRow
        label={i18n.translate('customizableForm.builder.showTitleToggleLabel', {
          defaultMessage: 'Show form title',
        })}
        display="columnCompressed"
        hasChildLabel={false}
      >
        <EuiSwitch
          label={i18n.translate('customizableForm.builder.showTitleToggleSwitch', {
            defaultMessage: 'Display title in preview',
          })}
          checked={formConfig.showTitle}
          onChange={(event) => updateConfig({ showTitle: event.target.checked })}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('customizableForm.builder.formTitleLabel', {
          defaultMessage: 'Form title',
        })}
      >
        <EuiFieldText
          aria-label={i18n.translate('customizableForm.builder.formTitleAria', {
            defaultMessage: 'Form title',
          })}
          value={formConfig.title}
          disabled={!formConfig.showTitle}
          onChange={(e) => updateConfig({ title: e.target.value })}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('customizableForm.builder.showDescriptionToggleLabel', {
          defaultMessage: 'Show description',
        })}
        display="columnCompressed"
        hasChildLabel={false}
      >
        <EuiSwitch
          label={i18n.translate('customizableForm.builder.showDescriptionToggleSwitch', {
            defaultMessage: 'Display description in preview',
          })}
          checked={formConfig.showDescription}
          onChange={(event) => updateConfig({ showDescription: event.target.checked })}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('customizableForm.builder.formDescriptionLabel', {
          defaultMessage: 'Description',
        })}
      >
        <EuiTextArea
          resize="vertical"
          value={formConfig.description}
          disabled={!formConfig.showDescription}
          onChange={(e) => updateConfig({ description: e.target.value })}
          aria-label={i18n.translate('customizableForm.builder.formDescriptionAria', {
            defaultMessage: 'Form description',
          })}
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('customizableForm.builder.layoutColumnsLabel', {
          defaultMessage: 'Preview columns',
        })}
        helpText={i18n.translate('customizableForm.builder.layoutColumnsHelpText', {
          defaultMessage:
            'Select between {min} and {max} columns. Extra fields wrap onto the next row.',
          values: {
            min: MIN_LAYOUT_COLUMNS,
            max: MAX_LAYOUT_COLUMNS,
          },
        })}
      >
        <EuiFieldNumber
          min={MIN_LAYOUT_COLUMNS}
          max={MAX_LAYOUT_COLUMNS}
          step={1}
          value={formConfig.layoutColumns}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value)) {
              const normalized = Math.min(
                MAX_LAYOUT_COLUMNS,
                Math.max(MIN_LAYOUT_COLUMNS, Math.trunc(value))
              );
              updateConfig({ layoutColumns: normalized });
            }
          }}
          fullWidth
        />
      </EuiFormRow>

      <EuiFormRow
        label={i18n.translate('customizableForm.builder.requireConfirmationLabel', {
          defaultMessage: 'Submission confirmation',
        })}
        display="columnCompressed"
        hasChildLabel={false}
      >
        <EuiSwitch
          label={i18n.translate('customizableForm.builder.requireConfirmationSwitch', {
            defaultMessage: 'Ask for confirmation before executing connectors',
          })}
          checked={formConfig.requireConfirmationOnSubmit}
          onChange={(event) => updateConfig({ requireConfirmationOnSubmit: event.target.checked })}
        />
      </EuiFormRow>
    </EuiForm>
  );
};


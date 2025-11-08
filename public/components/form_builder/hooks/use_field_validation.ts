import { useMemo } from 'react';

import type { FormConfig } from '../types';
import type { FieldValidationResult } from '../preview';
import { getFieldValidationResult } from '../preview';
import { validateVariableName, type VariableNameValidationResult } from '../validation';

interface UseFieldValidationParams {
  formConfig: FormConfig | null;
  fieldValues: Record<string, string>;
}

export const useFieldValidation = ({
  formConfig,
  fieldValues,
}: UseFieldValidationParams) => {
  const fields = formConfig?.fields ?? [];

  const fieldValidationById = useMemo(() => {
    const map: Record<string, FieldValidationResult> = {};
    fields.forEach((field) => {
      map[field.id] = getFieldValidationResult(field, fieldValues[field.id] ?? '');
    });
    return map;
  }, [fields, fieldValues]);

  const variableNameValidationById = useMemo(() => {
    const trimmedNames = fields.map((field) => field.key.trim());
    return fields.reduce<Record<string, VariableNameValidationResult>>(
      (acc, field) => {
        acc[field.id] = validateVariableName({ value: field.key, existingNames: trimmedNames });
        return acc;
      },
      {}
    );
  }, [fields]);

  const hasFieldValidationWarnings = useMemo(
    () =>
      Object.values(fieldValidationById).some((result) => result.isOutOfRange) ||
      Object.values(variableNameValidationById).some((result) => !result.isValid),
    [fieldValidationById, variableNameValidationById]
  );

  const hasInvalidVariableNames = useMemo(
    () => Object.values(variableNameValidationById).some((result) => !result.isValid),
    [variableNameValidationById]
  );

  return {
    fieldValidationById,
    variableNameValidationById,
    hasFieldValidationWarnings,
    hasInvalidVariableNames,
  };
};

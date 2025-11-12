const VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_-]*$/;
const VARIABLE_NAME_MIN_LENGTH = 2;
const VARIABLE_NAME_MAX_LENGTH = 25;

export interface VariableNameValidationResult {
  isValid: boolean;
  message?: string;
}

export interface ValidateVariableNameOptions {
  value: string;
  existingNames?: string[];
}

export const validateVariableName = ({
  value,
  existingNames = [],
}: ValidateVariableNameOptions): VariableNameValidationResult => {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      message: 'Variable name is required.',
    };
  }

  if (trimmed.length < VARIABLE_NAME_MIN_LENGTH || trimmed.length > VARIABLE_NAME_MAX_LENGTH) {
    return {
      isValid: false,
      message: `Variable name must be between ${VARIABLE_NAME_MIN_LENGTH} and ${VARIABLE_NAME_MAX_LENGTH} characters long.`,
    };
  }

  if (!VARIABLE_NAME_PATTERN.test(trimmed)) {
    return {
      isValid: false,
      message:
        'Variable name must start with a letter or underscore and can only contain letters, digits, underscores, or hyphens.',
    };
  }

  const duplicateCount = existingNames.reduce((count, name) => (name === trimmed ? count + 1 : count), 0);
  if (duplicateCount > 1) {
    return {
      isValid: false,
      message: 'Variable name must be unique.',
    };
  }

  return { isValid: true };
};

export const VARIABLE_NAME_RULES = {
  MIN_LENGTH: VARIABLE_NAME_MIN_LENGTH,
  MAX_LENGTH: VARIABLE_NAME_MAX_LENGTH,
};

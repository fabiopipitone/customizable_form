import { validateVariableName } from '../validation';

describe('validateVariableName', () => {
  it('rejects empty or whitespace-only names', () => {
    expect(validateVariableName({ value: '   ' })).toEqual({
      isValid: false,
      message: 'Variable name is required.',
    });
  });

  it('enforces minimum and maximum length', () => {
    expect(validateVariableName({ value: 'a' })).toEqual({
      isValid: false,
      message: 'Variable name must be between 2 and 25 characters long.',
    });

    expect(
      validateVariableName({
        value: 'a'.repeat(26),
      })
    ).toEqual({
      isValid: false,
      message: 'Variable name must be between 2 and 25 characters long.',
    });
  });

  it('rejects names with invalid characters or starting digits', () => {
    expect(validateVariableName({ value: '1invalid-name' })).toEqual({
      isValid: false,
      message:
        'Variable name must start with a letter or underscore and can only contain letters, digits, underscores, or hyphens.',
    });
  });

  it('rejects duplicate names when provided in existingNames', () => {
    expect(
      validateVariableName({ value: 'host', existingNames: ['host', 'host', 'other'] })
    ).toEqual({
      isValid: false,
      message: 'Variable name must be unique.',
    });
  });

  it('accepts valid names', () => {
    expect(validateVariableName({ value: 'alert_name', existingNames: ['host'] })).toEqual({
      isValid: true,
    });
  });
});

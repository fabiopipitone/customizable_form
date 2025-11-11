import { buildInitialFieldValues } from '../form_helpers';

const makeField = (id: string) => ({
  id,
  key: id,
  label: id,
  placeholder: '',
  type: 'text' as const,
  required: false,
  dataType: 'string' as const,
  size: { min: 0, max: 10 },
});

describe('buildInitialFieldValues', () => {
  it('returns an object with empty strings for each field id', () => {
    const fields = [makeField('field-1'), makeField('field-2'), makeField('field-3')];

    expect(buildInitialFieldValues(fields)).toEqual({
      'field-1': '',
      'field-2': '',
      'field-3': '',
    });
  });

  it('returns an empty object when no fields exist', () => {
    expect(buildInitialFieldValues([])).toEqual({});
  });
});

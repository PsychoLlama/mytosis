import Primitive from '../Primitive';

describe('Primitive', () => {
  it('is a constructor', () => {
    expect(Primitive).toEqual(expect.any(Function));
  });

  it('throws if the name is omitted', () => {
    const fail = () => new Primitive();

    expect(fail).toThrow(/name/i);
  });

  it('throws if the name contains non-word characters', () => {
    const def = { isValid() {} };

    expect(() => new Primitive('', def)).toThrow(/name/i);
    expect(() => new Primitive(' ', def)).toThrow(/name/i);
    expect(() => new Primitive(' name', def)).toThrow(/name/i);
    expect(() => new Primitive('name-hyphen', def)).toThrow(/name/i);
    expect(() => new Primitive('Uppercased', def)).toThrow(/name/i);
    expect(() => new Primitive('numb3r5', def)).toThrow(/name/i);
    expect(() => new Primitive('sym&ols', def)).toThrow(/name/i);

    expect(() => new Primitive('time', def)).not.toThrow();
    expect(() => new Primitive('camelCased', def)).not.toThrow();
  });

  it('throws if the definition is omitted', () => {
    const fail = () => new Primitive('string');

    expect(fail).toThrow(/definition/i);
  });

  it('throws if the validator is omitted', () => {
    const fail = () => new Primitive('string', {});

    expect(fail).toThrow(/valid/i);
  });

  it('consults the validator', () => {
    const isValid = jest.fn(() => false);
    const type = new Primitive('string', { isValid });
    const result = type.isValid(5);

    expect(isValid).toHaveBeenCalledWith(5);
    expect(result).toBe(false);
  });

  it('coerces validation results to booleans', () => {
    const isValid = jest.fn(() => 'wat');
    const type = new Primitive('number', { isValid });

    expect(type.isValid(20)).toBe(true);
  });

  it('only passes the first arg through the validator', () => {
    const isValid = jest.fn();
    const type = new Primitive('number', { isValid });
    type.isValid(1, 2, 3);

    expect(isValid).toHaveBeenCalledWith(1);
  });

  it('always returns false when given `undefined`', () => {
    const isValid = jest.fn(() => true);
    const type = new Primitive('any', { isValid });

    expect(type.isValid(undefined)).toBe(false);
    expect(isValid).not.toHaveBeenCalled();
  });
});

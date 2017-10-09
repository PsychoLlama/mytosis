// @flow
import Primitive from '../Primitive';

describe('Primitive', () => {
  it('is a constructor', () => {
    expect(Primitive).toEqual(expect.any(Function));
  });

  it('throws if the name contains non-word characters', () => {
    const def = { isValid: () => false };

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

  it('consults the validator', () => {
    const isValid = jest.fn(() => false);
    const type = new Primitive('string', { isValid });
    const result = type.isValid(5);

    expect(isValid).toHaveBeenCalledWith(5);
    expect(result).toBe(false);
  });

  it('always returns false when given `undefined`', () => {
    const isValid = jest.fn(() => true);
    const type = new Primitive('any', { isValid });

    expect(type.isValid(undefined)).toBe(false);
    expect(isValid).not.toHaveBeenCalled();
  });

  it('throws if a hydrator was omitted with a serializer', () => {
    const isValid = value => value instanceof Date;
    const def = { isValid, serialize() {} };
    const fail = () => new Primitive('time', def);

    expect(fail).toThrow(/hydr/i);
    expect(() => new Primitive('time', { ...def, hydrate() {} })).not.toThrow();
  });

  it('throws if a serializer was omitted with a hydrator', () => {
    const isValid = value => value instanceof Date;
    const def = { isValid, hydrate() {} };
    const fail = () => new Primitive('time', def);

    expect(fail).toThrow(/serialize/i);
    expect(
      () => new Primitive('time', { ...def, serialize() {} }),
    ).not.toThrow();
  });

  it('returns the value when no serializer is omitted', () => {
    const type = new Primitive('string', {
      isValid: value => typeof value === 'string',
    });

    expect(type.serialize('stuff')).toBe('stuff');
  });

  it('throws if the serialized type is invalid', () => {
    const isValid = value => typeof value === 'number';
    const type = new Primitive('number', { isValid });
    const fail = () => type.serialize('not a number');

    expect(fail).toThrow(/invalid/i);
  });

  it('uses the serializer if specified', () => {
    const isValid = value => value instanceof Date;
    const serialize = jest.fn(() => 30);
    const hydrate = () => {};
    const type = new Primitive('time', { isValid, serialize, hydrate });
    const date = new Date();
    const result = type.serialize(date);

    expect(serialize).toHaveBeenCalledWith(date);
    expect(result).toEqual(30);
  });

  it('uses the hydrator when given', () => {
    const isValid = value => typeof value === 'string';
    const serialize = jest.fn();
    const hydrate = jest.fn(() => 'hydrated');
    const type = new Primitive('string', { isValid, serialize, hydrate });
    const result = type.hydrate('value');

    expect(hydrate).toHaveBeenCalledWith('value');
    expect(result).toBe('hydrated');
  });

  it('returns the value if no hydrator is given', () => {
    const isValid = value => !!value === value;
    const type = new Primitive('boolean', { isValid });
    const result = type.hydrate(false);

    expect(result).toBe(false);
  });

  it('throws if the value failed to hydrate', () => {
    const isValid = value => value instanceof Date;
    const serialize = jest.fn(date => date.getTime());
    const hydrate = value => value;
    const type = new Primitive('time', { isValid, serialize, hydrate });
    const fail = () => type.hydrate(type.serialize(new Date()));

    expect(fail).toThrow(/type/i);
  });
});

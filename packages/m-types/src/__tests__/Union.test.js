// @flow
import Derivation from '../Derivation';
import Primitive from '../Primitive';
import Composite from '../Composite';
import Union from '../Union';

const CRDT = { import: data => data };
const string = new Primitive('string', {
  isValid: value => typeof value === 'string',
  coerce: String,
});

const number = new Primitive('number', {
  isValid: value => typeof value === 'number',
  coerce: Number,
});

describe('Union', () => {
  it('is a function', () => {
    expect(Union).toEqual(expect.any(Function));
  });

  it('throws if the value list is empty', () => {
    const fail = () => new Union(number, []);

    expect(fail).toThrow(/empty/i);
  });

  it('passes if the value satisfies the first type', () => {
    const set = new Union(string, [string]);

    expect(set.isValid('instance')).toBe(true);
    expect(set.isValid(5)).toBe(false);
  });

  it('passes if the value can satisfy any of the types', () => {
    const set = new Union(number, [string, number]);

    expect(set.isValid(-5)).toBe(true);
    expect(set.isValid('bacon')).toBe(true);
    expect(set.isValid(false)).toBe(false);
    expect(set.isValid(true)).toBe(false);
  });

  it('fails if the list contains a composite', () => {
    const Product = new Composite('Product', {
      initialFieldSet: { name: string },
      CRDT,
    });

    const fail = () => new Union(Product, [Product]);

    expect(fail).toThrow(/composite/i);
  });

  it('fails if the list contains a Union', () => {
    const validUnion = new Union(string, [string]);
    const fail = () => new Union(string, [validUnion]);

    expect(fail).toThrow(/union/i);
  });

  it('throws if the set contains ambiguous types', () => {
    const time = new Derivation('time', string, {
      isValid: value => value instanceof Date,
      dehydrate: date => date.toUTCString(),
      hydrate: utc => new Date(utc),
    });

    const fail = () => new Union(string, [time, string]);

    expect(fail).toThrow(/ambiguous/i);
  });

  it('uses the first param as the coercion type', () => {
    const values = new Union(number, [string, number]);

    expect(values.coerce('5')).toBe(5);
    expect(values.coerce('6.8')).toBe(6.8);
  });

  it('coerces using derivation subtypes', () => {
    const time = new Derivation('time', string, {
      isValid: value => value instanceof Date,
      dehydrate: date => date.toUTCString(),
      hydrate: utc => new Date(utc),
    });

    const values = new Union(time, [time, number]);

    expect(values.coerce(10)).toBe('10');
  });
});

// @flow
import Composite from '../Composite';
import Primitive from '../Primitive';
import Pointer from '../Pointer';

const string = new Primitive('string', {
  isValid: value => typeof value === 'string',
  coerce: String,
});

const CRDT = { import: data => data };
const Product = new Composite('Product', { CRDT });
const Player = new Composite('Player', { CRDT });

describe('Pointer', () => {
  it('works', () => {
    const pointer = new Pointer(string, Product);

    expect(pointer.name).toBe('pointer');
    expect(pointer.subtype).toBe(string);
    expect(pointer.to).toBe(Product);
  });

  it('dehydrates using string coercion', () => {
    const object = { toString: () => 'string-coerced' };
    const pointer = new Pointer(string, Product);

    expect(pointer.dehydrate(object)).toBe(object.toString());
  });

  it('validates using the subtype', () => {
    const pointer = new Pointer(string, Product);

    expect(pointer.isValid('abc123')).toBe(true);
    expect(pointer.isValid(5)).toBe(false);
    expect(pointer.isValid(null)).toBe(false);
    expect(pointer.isValid([])).toBe(false);
  });

  it('dehydrates to the same value', () => {
    const pointer = new Pointer(string, Product);

    expect(pointer.dehydrate('value')).toBe('value');
    expect(pointer.dehydrate('1234')).toBe('1234');
  });

  it('hydrates using the derivation subtype', () => {
    const pointer = new Pointer(string, Product);
    const wat = '%^&*(){GuINcN}';

    expect(pointer.hydrate('string')).toBe('string');
    expect(pointer.hydrate('12345')).toBe('12345');
    expect(pointer.hydrate(wat)).toBe(wat);
  });
});

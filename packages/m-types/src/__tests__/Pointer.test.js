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

  it('validates using the composite CRDT binding', () => {
    const invalid = { type: Player };
    const valid = { type: Product };
    const pointer = new Pointer(string, Product);

    expect(pointer.isValid(valid)).toBe(true);
    expect(pointer.isValid(invalid)).toBe(false);
  });

  // Requires CRDT-composite bindings.
  it('hydrates using composite type instantiation');
});

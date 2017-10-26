// @flow
import Composite from '../Composite';
import Primitive from '../Primitive';
import Pointer from '../Pointer';

const string = new Primitive('string', {
  isValid: value => typeof value === 'string',
  coerce: String,
});

const Product = new Composite('Product', {});

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

  // Requires CRDT-composite bindings.
  it('hydrates using composite type instantiation');
  it('validates using the composite CRDT binding');
});

// @flow
import * as type from '../types';
import Schema from '../schema';

describe('Schema', () => {
  it('exists', () => {
    expect(Schema).toEqual(expect.any(Function));
  });

  describe('findType()', () => {
    it('returns null if the type does not exist', () => {
      const schema = new Schema({});
      const type = schema.findType('no-such-type@1');

      expect(type).toBe(null);
    });

    it('returns the type when it exists', () => {
      const Product = type.atom('Product', {});
      const schema = new Schema({ product: Product });
      const result = schema.findType(String(Product));

      expect(result).toBe(Product);
    });

    it('finds types down other defaultType fields', () => {
      const C1 = type.atom('C1', {});
      const C2 = type.atom('C2', { defaultType: C1 });
      const schema = new Schema({
        root: type.atom('C3', { defaultType: C2 }),
      });

      const id = String(C1);
      const result = schema.findType(id);

      expect(result).toBe(C1);
    });

    it('survives if the default type is a primitive', () => {
      const pass = () =>
        new Schema({
          root: type.atom('Scoreboard', { defaultType: type.number }),
        });

      expect(pass).not.toThrow();
    });
  });
});

//
import Literal from '../Literal';

describe('Literal', () => {
  it('is a function', () => {
    expect(Literal).toEqual(expect.any(Function));
  });

  it('uses the correct primitive name', () => {
    expect(new Literal(5).name).toBe('literal');
  });

  it('is invalid unless the value matches exactly', () => {
    expect(new Literal(5).isValid(5)).toBe(true);
    expect(new Literal(5).isValid(-5)).toBe(false);

    expect(new Literal('string').isValid('different')).toBe(false);
    expect(new Literal('string').isValid('string')).toBe(true);

    expect(new Literal(null).isValid(null)).toBe(true);
    expect(new Literal(null).isValid(Infinity)).toBe(false);
  });

  it('throws on invalid primitives', () => {
    expect(() => new Literal(Infinity)).toThrow(/invalid/);
    expect(() => new Literal(-Infinity)).toThrow(/invalid/);
    expect(() => new Literal(NaN)).toThrow(/invalid/);
  });

  it('coerces to the literal value', () => {
    expect(new Literal(5).coerce(10)).toBe(5);
    expect(new Literal('things').coerce(null)).toBe('things');
    expect(new Literal(null).coerce(-13)).toBe(null);
  });
});

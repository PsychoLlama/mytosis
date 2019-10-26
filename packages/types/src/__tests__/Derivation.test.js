import Derivation from '../Derivation';
import Primitive from '../Primitive';

const number = new Primitive('number', {
  isValid: value => typeof value === 'number',
  coerce: Number,
});

const string = new Primitive('string', {
  isValid: value => typeof value === 'string',
  coerce: String,
});

describe('Derivation', () => {
  it('is a function', () => {
    expect(Derivation).toEqual(expect.any(Function));
  });

  it('can dehydrate types', () => {
    const time = new Derivation('time', number, {
      dehydrate: date => date.getTime(),
      hydrate: ms => new Date(ms),
      isValid: () => true,
    });

    const date = new Date();
    const dehydrated = time.dehydrate(date);

    expect(dehydrated).toBe(date.getTime());
  });

  it('throws if the name is invalid', () => {
    const id = value => value;
    const def = { dehydrate: id, hydrate: id, isValid: () => true };

    expect(() => new Derivation('Capital', number, def)).toThrow(/name/i);
    expect(() => new Derivation('8-leading-number', number, def)).toThrow(
      /name/i
    );
    expect(() => new Derivation('-leading-hyphen', number, def)).toThrow(
      /name/i
    );
    expect(() => new Derivation('sym&ols', number, def)).toThrow(/name/i);
    expect(() => new Derivation('camelCased', number, def)).toThrow(/name/i);
    expect(() => new Derivation('spaced words', number, def)).toThrow(/name/i);
    expect(() => new Derivation('', number, def)).toThrow(/name/i);

    expect(() => new Derivation('lowercase', number, def)).not.toThrow();
    expect(() => new Derivation('hyphen-ated', number, def)).not.toThrow();
    expect(() => new Derivation('with-numb3r5', number, def)).not.toThrow();
  });

  it('can hydrate types', () => {
    const coords = new Derivation('coords', string, {
      dehydrate: coords => `${coords.lat},${coords.long}`,
      isValid: () => true,
      hydrate: map => {
        const [lat, long] = map.split(',').map(Number);
        return { lat, long };
      },
    });

    expect(coords.hydrate('2,3')).toEqual({ lat: 2, long: 3 });
  });

  it('can indicate validity', () => {
    const time = new Derivation('time', number, {
      isValid: value => value instanceof Date,
      dehydrate: date => date.getTime(),
      hydrate: value => new Date(value),
    });

    expect(time.isValid(new Date())).toBe(true);
    expect(time.isValid(5)).toBe(false);
    expect(time.isValid('nope')).toBe(false);
  });

  it('throws if the dehydrator returns an incorrect type', () => {
    const time = new Derivation('time', number, {
      dehydrate: () => 'not a number',
      hydrate: () => new Date(),
      isValid: () => true,
    });

    const fail = () => time.dehydrate(new Date());

    expect(fail).toThrow(/serializ(e|or)/i);
  });
});

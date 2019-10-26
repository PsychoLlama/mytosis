import Derivation from './Derivation';

/** Represents a foreign key to a composite instance. */
export default class Pointer extends Derivation {
  /**
   * @param  {Primitive} subtype - The primitive subtype. This should
   * always be `string`, but there's no such singleton in this package.
   * @param  {Composite} type - An object to point to.
   */
  constructor(subtype, type) {
    super('pointer', subtype, {
      dehydrate: value => subtype.coerce(value),
      isValid: value => subtype.isValid(value),
      hydrate: value => value,
    });

    this.to = type;
  }
}

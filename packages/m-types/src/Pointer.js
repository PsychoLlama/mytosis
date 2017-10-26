// @flow
import type Composite from './Composite';
import type Primitive from './Primitive';
import Derivation from './Derivation';

type StringCoercible = {
  toString: () => string,
};

/** Represents a foreign key to a composite instance. */
export default class Pointer extends Derivation {
  to: Composite;

  /**
   * @param  {Primitive} subtype - The primitive subtype. This should
   * always be `string`, but there's no such singleton in this package.
   * @param  {Composite} type - An object to point to.
   */
  constructor(subtype: Primitive, type: Composite) {
    super('pointer', subtype, {
      dehydrate: (value: StringCoercible) => value.toString(),
      isValid: value => {
        if (!(value instanceof Object)) {
          return false;
        }

        return value.type === type;
      },
      hydrate: () => {
        throw new Error('Not implemented.');
      },
    });

    this.to = type;
  }
}

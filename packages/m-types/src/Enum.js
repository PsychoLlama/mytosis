// @flow
import assert from 'minimalistic-assert';

import type Literal from './Literal';
import Composite from './Composite';
import Primitive from './Primitive';

/**
 * Represents a list of possible primitives or
 * literal values. Incompatible with composites and other enums.
 */
export default class Enum extends Primitive {
  /**
   * @param  {Primitive[]} types - Primitive or literal values.
   */
  constructor(types: Array<Primitive | Literal>) {
    assert(types.length, 'List of enum values is empty.');

    // Flow doesn't catch these. I'm probably making a n00b mistake.
    types.forEach(type => {
      const notComposite = !(type instanceof Composite);
      const notEnum = !(type instanceof Enum);

      assert(notEnum, `Enums cannot contain other enums.`);
      assert(
        notComposite,
        `Enums cannot contain composite types (given ${type.name}).`,
      );
    });

    super('enum', {
      isValid: value => types.some(type => type.isValid(value)),
    });
  }
}

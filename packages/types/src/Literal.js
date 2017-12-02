//
import assert from 'minimalistic-assert';

import Primitive from './Primitive';

/**
 * Represents literal values in the type system.
 */
export default class Literal extends Primitive {
  /**
   * @param  {Mixed} value - Any primitive value.
   */
  constructor(value) {
    if (typeof value === 'number') {
      assert(isFinite(value), `Literal(..) given invalid number (${value}).`);
    }

    super('literal', {
      isValid: data => data === value,
      coerce: () => value,
    });
  }
}

//
import assert from 'minimalistic-assert';

const invalidNameMsg = name =>
  `Invalid primitive name "${name}".` +
  '\nNames must begin lowercase and contain no special characters.';

export const nameRegex = /^[a-z][0-9a-z-]*$/;

/** Creates primitive types. */
export default class Primitive {
  /**
   * @param  {String} name - A unique title for the primitive.
   * @param  {Object} def - Primitive definition.
   * @param  {Function} def.isValid - Whether an arbitrary value qualifies.
   */
  constructor(name, def) {
    assert(nameRegex.test(name), invalidNameMsg(name));

    this.name = name;
    Object.defineProperties(this, {
      _isValid: { value: def.isValid },
      _coerce: { value: def.coerce },
    });
  }

  /**
   * Whether the value is valid.
   * @param  {mixed} value - Anything but `undefined`.
   * @return {Boolean} - Whether the value is valid.
   */
  isValid(value) {
    if (value === undefined) {
      return false;
    }

    return this._isValid(value);
  }

  /**
   * Coerces a JSON value to the given type.
   * @param  {mixed} value - Any JSON-expressable value.
   * @return {mixed} - The type this primitive represents.
   */
  coerce(value) {
    return this._coerce(value);
  }
}

// @flow
import assert from 'minimalistic-assert';

const invalidNameMsg = name =>
  `Invalid primitive name "${name}".` +
  '\nNames must begin lowercase and contain no special characters.';

type TypeDefinition = {
  isValid(data: mixed): boolean,
};

export const nameRegex = /^[a-z][0-9a-z-]*$/;

/** Creates primitive types. */
export default class Primitive {
  _isValid: mixed => boolean;
  name: string;

  /**
   * @param  {String} name - A unique title for the primitive.
   * @param  {Object} def - Primitive definition.
   * @param  {Function} def.isValid - Whether an arbitrary value qualifies.
   */
  constructor(name: string, def: TypeDefinition) {
    assert(typeof name === 'string', 'Primitive(..) expects a name.');
    assert(nameRegex.test(name), invalidNameMsg(name));
    assert(def instanceof Object, `Missing primitive definition (${name}).`);

    this._isValid = def.isValid;
    this.name = name;
  }

  /**
   * Whether the value is valid.
   * @param  {mixed} value - Anything but `undefined`.
   * @return {Boolean} - Whether the value is valid.
   */
  isValid(value: mixed): boolean {
    if (value === undefined) {
      return false;
    }

    return this._isValid(value);
  }
}

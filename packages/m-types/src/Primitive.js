import assert from 'minimalistic-assert';

const invalidNameMsg = name =>
  `Invalid primitive name "${name}".` +
  '\nNames must begin lowercase and contain no special characters.';

/** Creates primitive types. */
export default class Primitive {
  /**
   * @param  {String} name - A unique title for the primitive.
   * @param  {Object} def - Primitive definition.
   * @param  {Function} def.isValid - Whether an arbitrary value qualifies.
   */
  constructor(name, def) {
    assert(typeof name === 'string', 'Primitive(..) expects a name.');
    assert(/^[a-z][a-zA-Z]*$/.test(name), invalidNameMsg(name));
    assert(def instanceof Object, `Missing primitive definition (${name}).`);
    assert(
      typeof def.isValid === 'function',
      `Type "${name}" needs a validator.`,
    );

    this._isValid = def.isValid;
  }

  /**
   * Whether the value is valid.
   * @param  {Any} value - Anything but `undefined`.
   * @return {Boolean} - Whether the value is valid.
   */
  isValid(value) {
    if (value === undefined) {
      return false;
    }

    return Boolean(this._isValid(value));
  }
}

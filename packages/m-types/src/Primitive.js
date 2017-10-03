import assert from 'minimalistic-assert';

const invalidNameMsg = name =>
  `Invalid primitive name "${name}".` +
  '\nNames must begin lowercase and contain no special characters.';

const isFn = value => typeof value === 'function';

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

    const { isValid, serialize, hydrate } = def;
    assert(isFn(isValid), `Type "${name}" needs a validator.`);
    assert(
      !serialize || isFn(serialize),
      `Type "${name}" an invalid serializer.`,
    );
    assert(
      !serialize || isFn(hydrate),
      `Type "${name}" has an invalid hydrator.`,
    );

    this._isValid = def.isValid;
    this._serialize = def.serialize || null;
    this._hydrate = def.hydrate || null;
    this.name = name;
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

  /**
   * Serializes a value into a JSON friendly data structure.
   * @param  {Any} value - A value belonging to the called type.
   * @return {Any} - The JSON-ready value.
   * @throws {Error} - If the value is invalid.
   */
  serialize(value) {
    assert(
      this.isValid(value),
      `Cannot serialize invalid ${this.name} (${value}).`,
    );

    if (this._serialize) {
      return this._serialize(value);
    }

    return value;
  }

  /**
   * Rehydrates a previously hydrated value. Non-idempotent.
   * @param  {Any} value - Something to rehydrate.
   * @return {Any} - A validated type.
   * @throws {Error} - If the type failed to hydrate properly.
   */
  hydrate(value) {
    const result = this._hydrate ? this._hydrate(value) : value;
    assert(
      this.isValid(result),
      `Rehydration failed: unexpected type (${value}).`,
    );

    return result;
  }
}

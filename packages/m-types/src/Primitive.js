// @flow
import assert from 'minimalistic-assert';

const invalidNameMsg = name =>
  `Invalid primitive name "${name}".` +
  '\nNames must begin lowercase and contain no special characters.';

type TypeDefinition = {
  isValid(data: any): boolean,
  serialize?: Function,
  hydrate?: Function,
};

/** Creates primitive types. */
export default class Primitive {
  _isValid: Function;
  _serialize: ?Function;
  _hydrate: ?Function;
  name: string;

  /**
   * @param  {String} name - A unique title for the primitive.
   * @param  {Object} def - Primitive definition.
   * @param  {Function} def.isValid - Whether an arbitrary value qualifies.
   */
  constructor(name: string, def: TypeDefinition) {
    assert(typeof name === 'string', 'Primitive(..) expects a name.');
    assert(/^[a-z][a-zA-Z]*$/.test(name), invalidNameMsg(name));
    assert(def instanceof Object, `Missing primitive definition (${name}).`);

    const { serialize = null, hydrate = null } = def;

    // Both serialize and hydrate must be defined together or not at all.
    const validHydrator = serialize ? hydrate : true;
    const validSerializer = hydrate ? serialize : true;
    assert(validHydrator, 'Serializer defined without a hydrator.');
    assert(validSerializer, 'Hydrator defined without a serializer.');

    this._isValid = def.isValid;
    this._serialize = serialize;
    this._hydrate = hydrate;
    this.name = name;
  }

  /**
   * Whether the value is valid.
   * @param  {Any} value - Anything but `undefined`.
   * @return {Boolean} - Whether the value is valid.
   */
  isValid(value: any): boolean {
    if (value === undefined) {
      return false;
    }

    return this._isValid(value);
  }

  /**
   * Serializes a value into a JSON friendly data structure.
   * @param  {Any} value - A value belonging to the called type.
   * @return {Any} - The JSON-ready value.
   * @throws {Error} - If the value is invalid.
   */
  serialize(value: any) {
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
  hydrate(value: any) {
    const result = this._hydrate ? this._hydrate(value) : value;

    assert(
      this.isValid(result),
      `Rehydration failed: unexpected type (${value}).`,
    );

    return result;
  }
}

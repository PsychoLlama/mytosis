// @flow
import assert from 'minimalistic-assert';

const invalidNameMsg = name =>
  `Invalid primitive name "${name}".` +
  '\nNames must begin lowercase and contain no special characters.';

type Binary =
  | ArrayBuffer
  | Uint8Array
  | Uint8ClampedArray
  | Uint16Array
  | Uint32Array
  | Int8Array
  | Int16Array
  | Int32Array
  | Float32Array
  | Float64Array;

type JsonPrimitive = ?(number | string | boolean | Binary);
type TypeDefinition = {
  coerce(value: JsonPrimitive): JsonPrimitive,
  isValid(data: mixed): boolean,
};

export const nameRegex = /^[a-z][0-9a-z-]*$/;

/** Creates primitive types. */
export default class Primitive {
  _isValid: mixed => boolean;
  _coerce: Function;
  name: string;

  /**
   * @param  {String} name - A unique title for the primitive.
   * @param  {Object} def - Primitive definition.
   * @param  {Function} def.isValid - Whether an arbitrary value qualifies.
   */
  constructor(name: string, def: TypeDefinition) {
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
  isValid(value: mixed): boolean {
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
  coerce(value: JsonPrimitive) {
    return this._coerce(value);
  }
}

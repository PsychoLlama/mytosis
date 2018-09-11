import assert from 'minimalistic-assert';

import { nameRegex } from './Primitive';

/**
 * Constructs a new primitive from a serialized value.
 */
export default class Derivation {
  /**
   * @param  {String} name - A title for the new type.
   * @param  {Primitive} primitive - Something to derive from.
   * @param  {Object} def - The derivation rule set.
   */
  constructor(name, primitive, def) {
    assert(nameRegex.test(name), `Invalid derivation name "${name}".`);

    this.name = name;
    this.subtype = primitive;
    Object.defineProperty(this, '_definition', {
      value: def,
    });
  }

  /**
   * Takes a derived type and turns it into a primitive.
   * Ensure the type is a valid derivation before attempting dehyrdation.
   * @throws {Error} - If the dehydrator returns an invalid value.
   * @param  {mixed} hydrated - Anything which makes it past the validator.
   * @return {mixed} - Something belonging to the derived type.
   */
  dehydrate(hydrated) {
    const value = this._definition.dehydrate(hydrated);

    assert(
      this.subtype.isValid(value),
      `Serializer for type "${this.name}" returned an invalid value.`,
    );

    return value;
  }

  /**
   * Takes a primitive value and turns it into the derived type.
   * @param  {mixed} dehydrated - Something of the derived type.
   * @return {mixed} - The hydrated value.
   */
  hydrate(dehydrated) {
    return this._definition.hydrate(dehydrated);
  }

  /**
   * Test whether the given value is a valid derivation instance.
   * @param  {mixed} value - Anything but undefined.
   * @return {Boolean} - Whether the value is valid.
   */
  isValid(value) {
    return this._definition.isValid(value);
  }
}

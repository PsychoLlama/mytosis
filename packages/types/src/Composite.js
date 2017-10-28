// @flow
import assert from 'minimalistic-assert';

import Derivation from './Derivation';
import Primitive from './Primitive';

/**
 * Creates object-style types.
 */
export default class Composite {
  definition: FieldSet;
  defaultType: ?Field;
  name: string;

  /**
   * @param  {String} name - A name for the type.
   * @param  {Definition} def - A description of the type.
   */
  constructor(name: string, def: Definition) {
    assert(
      /^[A-Z][_a-zA-Z:]*$/.test(name),
      `Invalid composite name "${name}".`,
    );

    this.name = name;
    Object.defineProperties(this, {
      definition: {
        value: def.initialFieldSet || {},
      },
      defaultType: {
        value: def.defaultType || null,
      },
    });
  }

  /**
   * Ensures the type is valid.
   * @param  {Object} data - Any object.
   * @throws {Error} - If the data is invalid.
   * @return {void}
   */
  validate(data: ValidationTarget): void {
    for (const field in data) {
      if (!data.hasOwnProperty(field)) {
        continue;
      }

      const exists = this.defaultType || this.definition.hasOwnProperty(field);
      assert(exists, `There's no "${field}" field in the "${this.name}" type.`);

      const type = this.definition[field] || this.defaultType;
      const value = data[field];

      if (type instanceof Primitive || type instanceof Derivation) {
        assert(
          type.isValid(value),
          `Invalid type at ${this.name}.${field} (expected ${type.name}).`,
        );
      }
    }
  }
}

type Field = Primitive | Derivation;
type FieldSet = { [field: string]: Field };
type CRDT = { import(data: Object): Object };
type ValidationTarget = { [string]: string | number | boolean };
type Definition = {
  initialFieldSet?: FieldSet,
  defaultType?: Field,
  CRDT: CRDT,
};

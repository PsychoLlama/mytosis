// @flow
import assert from 'minimalistic-assert';

import Primitive from './Primitive';

/**
 * Creates object-style types.
 */
export default class Composite {
  definition: { [field: string]: Primitive | Composite };
  defaultType: ?(Primitive | Composite);
  name: string;

  /**
   * @param  {String} name - A name for the type.
   * @param  {Definition} def - A description of the type.
   */
  constructor(
    name: string,
    def: {
      defaultType?: Primitive | Composite,
      initialFieldSet?: {
        [field: string]: Primitive | Composite,
      },
    },
  ) {
    assert(/^[A-Z][a-zA-Z]*$/.test(name), 'Invalid name.');

    this.definition = def.initialFieldSet || {};
    this.defaultType = def.defaultType;
    this.name = name;
  }

  /**
   * Ensures the type is valid.
   * @param  {Object} data - Any object.
   * @return {void}
   */
  validate(data: Object): void {
    for (const field in data) {
      if (!data.hasOwnProperty(field)) {
        continue;
      }

      const exists = this.defaultType || this.definition.hasOwnProperty(field);
      assert(exists, `There's no "${field}" field in the "${this.name}" type.`);

      const type = this.definition[field] || this.defaultType;
      const value = data[field];

      if (type instanceof Primitive) {
        assert(
          type.isValid(value),
          `Invalid type at ${this.name}.${field} (expected ${type.name}).`,
        );
      }

      if (type instanceof Composite) {
        type.validate(value);
      }
    }
  }
}

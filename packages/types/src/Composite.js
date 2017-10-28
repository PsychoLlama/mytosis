// @flow
import assert from 'minimalistic-assert';

import Derivation from './Derivation';
import Primitive from './Primitive';
import type {
  DefaultTypeChange,
  TypeChange,
  Remove,
  Move,
  Add,
} from './migrations';

const initialProps = {
  lastComposite: {
    writable: true,
    value: null,
  },
  nextComposite: {
    writable: true,
    value: null,
  },
  lastVersion: {
    writable: true,
    value: null,
  },
  nextVersion: {
    writable: true,
    value: null,
  },
};

/**
 * Creates object-style types.
 */
export default class Composite {
  definition: FieldSet;
  defaultType: ?Field;

  name: string;
  CRDT: CRDT;

  lastVersion: ?Composite;
  nextVersion: ?Composite;

  lastComposite: ?Composite;
  nextComposite: ?Composite;

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
      ...initialProps,
      definition: {
        value: def.initialFieldSet || {},
      },
      defaultType: {
        value: def.defaultType || null,
      },
      CRDT: {
        value: def.CRDT,
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

  /**
   * Creates a new migration set.
   * @param  {Migration[]} operations - A list of type changes.
   * @return {Composite} - A new composite with the changes applied.
   */
  migrate(operations: Migration[]): Composite {
    assert(operations.length, 'Migration list is empty.');

    // Apply all migrations into a new composite.
    const migrated = operations.reduce((composite, migration) => {
      const { defaultType, definition } = migration.migrateType(composite);

      const result = new Composite(composite.name, {
        initialFieldSet: definition,
        CRDT: composite.CRDT,
        defaultType,
      });

      return Object.assign(result, { lastComposite: composite });
    }, this);

    // Go back and add a successor reference to each composite.
    operations.reverse().reduce(composite => {
      if (!composite || !composite.lastComposite) {
        return composite;
      }

      composite.lastComposite.nextComposite = composite;

      return composite.lastComposite;
    }, migrated);

    return Object.assign(migrated, { lastVersion: this });
  }
}

type Migration = Add | Remove | Move | TypeChange | DefaultTypeChange;
type Field = Primitive | Derivation;
type FieldSet = { [field: string]: Field };
type CRDT = { import(data: Object): Object };
type ValidationTarget = { [string]: string | number | boolean };
type Definition = {
  initialFieldSet?: FieldSet,
  defaultType?: ?Field,
  CRDT: CRDT,
};

import assert from 'minimalistic-assert';

import Derivation from './Derivation';
import Primitive from './Primitive';

/**
 * Creates object-style types.
 */
export default class Composite {
  /**
   * Iterates over every migration, both past and future.
   * @param  {Composite} composite - Something to iterate over.
   * @return {Generator} - Yields every migration.
   */
  static *toMigrationIterable(composite) {
    let ctx = composite.firstComposite;

    while (ctx) {
      yield ctx;
      ctx = ctx.nextComposite;
    }
  }

  /**
   * @param  {String} name - A name for the type.
   * @param  {Definition} def - A description of the type.
   */
  constructor(name, def) {
    assert(
      /^[A-Z][_a-zA-Z:0-9]*$/.test(name),
      `Invalid composite name "${name}".`
    );

    this.name = name;
    this.version = 1;
    Object.defineProperties(this, {
      definition: {
        value: def.initialFieldSet || {},
      },
      defaultType: {
        value: def.defaultType || null,
      },
      context: {
        value: def.context,
      },
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
      migrationInterceptor: {
        value: def.migrationInterceptor || null,
      },
      migration: {
        writable: true,
        value: null,
      },
      firstComposite: {
        writable: true,
        value: this,
      },
    });
  }

  /**
   * Ensures the type is valid.
   * @param  {Object} data - Any object.
   * @throws {Error} - If the data is invalid.
   * @return {void}
   */
  validate(data) {
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
          `Invalid type at ${this.name}.${field} (expected ${type.name}).`
        );
      }
    }
  }

  /**
   * Creates a new migration set.
   * @param  {Migration[]} operations - A list of type changes.
   * @return {Composite} - A new composite with the changes applied.
   */
  migrate(operations) {
    if (this.migrationInterceptor) {
      operations = this.migrationInterceptor(operations);
    }

    assert(!this.migration, `Can't migrate the same ${this.name} type twice.`);
    assert(operations.length, 'Migration list is empty.');

    // Apply all migrations into a new composite.
    const migrated = operations.reduce((composite, migration) => {
      const { defaultType, definition } = migration.migrateType(composite);
      composite.migration = migration;

      const result = new Composite(composite.name, {
        migrationInterceptor: composite.migrationInterceptor,
        initialFieldSet: definition,
        context: composite.context,
        defaultType,
      });

      return Object.assign(result, {
        firstComposite: this.firstComposite,
        lastComposite: composite,
        lastVersion: this,
      });
    }, this);

    // Go back and add a successor reference to each composite.
    operations.reverse().reduce(composite => {
      if (!composite || !composite.lastComposite) {
        return composite;
      }

      composite.lastComposite.nextComposite = composite;

      return composite.lastComposite;
    }, migrated);

    this.nextVersion = migrated;

    return Object.assign(migrated, {
      firstComposite: this.firstComposite,
      version: this.version + 1,
      lastVersion: this,
    });
  }

  /**
   * Creates a type ID using the name and version number.
   * @return {String} - Type ID.
   */
  toString() {
    return `${this.name}@${this.version}`;
  }
}

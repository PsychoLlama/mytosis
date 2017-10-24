// @flow
import type Composite from './Composite';
import type Primitive from './Primitive';
import type Enum from './Enum';

type AnyType = Primitive | Enum | Composite;

type CompositeTypeMap = {
  definition: { [string]: AnyType },
  defaultType: ?AnyType,
};

/** Represents a simple type/data migration. */
export class Migration {
  operation: Function;
  name: string;

  /**
   * @param  {String} name - Identifier for the migration type.
   * @param  {Function} operation - Constructing function.
   */
  constructor(name: string) {
    this.operation = this.constructor;
    this.name = name;
  }
}

/** Represents an ADD migration. */
class AddMigration extends Migration {
  field: string;
  type: AnyType;

  /**
   * @param  {String} field - The name of the field to create.
   * @param  {Type} type - The type to use.
   */
  constructor(field: string, type: AnyType) {
    super('ADD');

    this.field = field;
    this.type = type;
  }

  /**
   * Applies the migration to a composite type.
   * @param  {Composite} type - Any composite.
   * @return {Object} - What the type should look like.
   */
  migrateType(type: Composite): CompositeTypeMap {
    return {
      defaultType: type.defaultType,
      definition: {
        ...type.definition,
        [this.field]: this.type,
      },
    };
  }

  /**
   * Applies the migration to an instance of the type.
   * @param  {Object} data - An instance of the composite type.
   * @return {Object} - The data slightly modified.
   */
  migrateData(data: Object) {
    return {
      ...data,
      [this.field]: undefined,
    };
  }
}

export const add = (field: string, type: AnyType) =>
  new AddMigration(field, type);

/** Represents a DROP operation. */
class RemoveMigration extends Migration {
  field: string;

  /**
   * @param  {string} field - The field to drop.
   */
  constructor(field: string) {
    super('REMOVE');

    this.field = field;
  }

  /**
   * Migrates the type object.
   * @param  {Composite} type - Any composite type.
   * @return {Object} - What the type should look like.
   */
  migrateType(type: Composite): CompositeTypeMap {
    const definition = { ...type.definition };
    delete definition[this.field];

    return {
      defaultType: type.defaultType,
      definition,
    };
  }

  /**
   * Drops the field from a given object.
   * @param  {Object} data - Any object.
   * @return {Object} - The data without the given field.
   */
  migrateData(data: Object) {
    const dropped = { ...data };
    delete dropped[this.field];

    return dropped;
  }
}

export const remove = (field: string) => new RemoveMigration(field);

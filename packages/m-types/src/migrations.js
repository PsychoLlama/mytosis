// @flow
import assert from 'minimalistic-assert';

import type Composite from './Composite';
import Derivation from './Derivation';
import Primitive from './Primitive';
import type Union from './Union';

type AnyType = Primitive | Derivation | Union | Composite;

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
export class Add extends Migration {
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
    assert(
      !type.definition[this.field],
      `Field "${this.field}" already exists in type ${type.name}.`,
    );

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

/** Represents a DROP operation. */
export class Remove extends Migration {
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
    assert(
      this.field in type.definition,
      `Can't remove field "${this.field}" from type ${type.name}; ` +
        `No such field exists.`,
    );

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

/** Changes the type of a field. */
export class TypeChange extends Migration {
  field: string;
  type: AnyType;

  /**
   * @param  {String} field - The field to change.
   * @param  {Type} type - Any type.
   */
  constructor(field: string, type: AnyType) {
    super('CHANGE_TYPE');

    this.field = field;
    this.type = type;
  }

  /**
   * Changes the type of a field.
   * @param  {Composite} type - Any composite type.
   * @return {Object} - What the composite should look like.
   */
  migrateType(type: Composite): CompositeTypeMap {
    assert(
      type.definition.hasOwnProperty(this.field),
      `Field "${this.field}" doesn't exist in type ${type.name}.`,
    );

    return {
      defaultType: type.defaultType,
      definition: {
        ...type.definition,
        [this.field]: this.type,
      },
    };
  }

  /**
   * Coerces the given field to the new type.
   * @param  {Object} value - Any object.
   * @return {Object} - The coerced data.
   */
  migrateData(value: Object) {
    const { field, type } = this;

    if (!value.hasOwnProperty(field)) {
      return value;
    }

    const copy = { ...value };
    if (type instanceof Derivation) {
      copy[field] = type.subtype.coerce(copy[field]);
    } else if (type instanceof Primitive) {
      copy[field] = type.coerce(copy[field]);
    }

    return copy;
  }
}

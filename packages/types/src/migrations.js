//
import assert from 'minimalistic-assert';

import Derivation from './Derivation';
import Primitive from './Primitive';

/** Represents an ADD migration. */
export class Add {
  /**
   * @param  {String} field - The name of the field to create.
   * @param  {Type} type - The type to use.
   */
  constructor(field, type) {
    Object.defineProperties(this, {
      field: { value: field },
      type: { value: type },
    });
  }

  /**
   * Applies the migration to a composite type.
   * @param  {Composite} type - Any composite.
   * @return {Object} - What the type should look like.
   */
  migrateType(type) {
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
  migrateData(data) {
    return {
      ...data,
      [this.field]: undefined,
    };
  }
}

/** Represents a DROP operation. */
export class Remove {
  /**
   * @param  {string} field - The field to drop.
   */
  constructor(field) {
    Object.defineProperties(this, {
      field: { value: field },
    });
  }

  /**
   * Migrates the type object.
   * @param  {Composite} type - Any composite type.
   * @return {Object} - What the type should look like.
   */
  migrateType(type) {
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
  migrateData(data) {
    const dropped = { ...data };
    delete dropped[this.field];

    return dropped;
  }
}

/** Changes the type of a field. */
export class TypeChange {
  /**
   * @param  {String} field - The field to change.
   * @param  {Type} type - Any type.
   */
  constructor(field, type) {
    Object.defineProperties(this, {
      field: { value: field },
      type: { value: type },
    });
  }

  /**
   * Changes the type of a field.
   * @param  {Composite} type - Any composite type.
   * @return {Object} - What the composite should look like.
   */
  migrateType(type) {
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
  migrateData(value) {
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

/** Moves data from one field to another. */
export class Move {
  /**
   * @param  {String} from - The field to migrate from.
   * @param  {String} to - The field to migrate into (destructive).
   */
  constructor(from, to) {
    Object.defineProperties(this, {
      from: { value: from },
      to: { value: to },
    });
  }

  /**
   * Ensures migration preconditions are satisfied. The
   * same type is returned.
   * @param  {Composite} type - Any composite.
   * @return {Composite} - The same type.
   */
  migrateType(type) {
    const definition = { ...type.definition };
    const sourceExists = definition.hasOwnProperty(this.from);
    const targetExists = definition.hasOwnProperty(this.to);
    const fail = field =>
      `Field "${field}" isn't defined in type ${type.name}.`;
    assert(sourceExists, fail(this.from));
    assert(targetExists, fail(this.to));

    const target = definition[this.to];
    const source = definition[this.from];

    const targetComparison =
      target instanceof Derivation ? target.subtype : target;
    const sourceComparison =
      source instanceof Derivation ? source.subtype : source;

    const isSameType = targetComparison === sourceComparison;

    assert(
      isSameType,
      `Can't move ${source.name} into ${target.name} ` +
        `(${type.name} "${this.from}" -> "${this.to}").`,
    );

    return {
      defaultType: type.defaultType,
      definition,
    };
  }

  /**
   * Moves one field to another.
   * @param  {Object} data - Any object.
   * @return {Object} - Migrated data.
   */
  migrateData(data) {
    if (!data.hasOwnProperty(this.from)) {
      return data;
    }

    const { [this.from]: value, ...result } = data;
    result[this.to] = value;

    return result;
  }
}

/** Changes the implied type of a composite */
export class DefaultTypeChange {
  /**
   * @param  {Type} type - Any type.
   */
  constructor(type) {
    Object.defineProperty(this, 'type', { value: type });
  }

  /**
   * Updates the default type on a composite definition.
   * @param  {Composite} type - Any composite.
   * @return {Object} - The new type definition.
   */
  migrateType(type) {
    return {
      definition: { ...type.definition },
      defaultType: this.type,
    };
  }

  /**
   * Coerces every mapped type in the object.
   * @param  {Composite} type - The composite the data conforms to.
   * @param  {Object} data - Any object.
   * @return {Object} - The new data composite.
   */
  migrateData(type, data) {
    const copy = { ...data };

    const noStrictDefinition = key => !type.definition.hasOwnProperty(key);
    const fields = Object.keys(copy).filter(noStrictDefinition);

    fields.forEach(field => {
      if (this.type instanceof Derivation) {
        copy[field] = this.type.subtype.coerce(copy[field]);
      } else if (this.type instanceof Primitive) {
        copy[field] = this.type.coerce(copy[field]);
      } else if (this.type === null) {
        delete copy[field];
      }
    });

    return copy;
  }
}

/** Unsets the default type and drops unknown fields. */
export class RemoveDefaultType {
  /**
   * Drops the defaultType.
   * @throws {Error} - If there is no default type.
   * @param  {Composite} type - Any composite.
   * @return {Object} - The updated fields.
   */
  migrateType(type) {
    assert(
      type.defaultType,
      `Can't remove the default type from ${type.name}. It doesn't have one.`,
    );

    return {
      definition: type.definition,
      defaultType: null,
    };
  }

  /**
   * Drops any data not defined explicitly by the type.
   * @param  {Composite} type - The type representing the data.
   * @param  {Object} data - Key-value map.
   * @return {Object} - The same data, but less of it.
   */
  migrateData({ definition }, data) {
    const result = {};

    // Filter by keys with explicit composite definitions.
    for (const key in data) {
      if (data.hasOwnProperty(key) && definition.hasOwnProperty(key)) {
        result[key] = data[key];
      }
    }

    return result;
  }
}

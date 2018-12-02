// @flow
import * as primitives from './primitives';

// Flow doesn't like symbols as object keys.
export const SECRET_METADATA_KEY: string = (Symbol('metadata'): any);

type Migration = *;
type MType = *;
type CRDT = *;

type Initializers = {
  [typeName: string]: {
    initialMigration: ({ [typeName: string]: MType }) => mixed,
    createType: (typeName: string) => MType,
    constructors: {
      [constructorName: string]: <ArgType, Args: Array<ArgType>>(
        MType,
        ...args: Args
      ) => CRDT,
    },
    migrations: {
      [migrationName: string]: <ArgType, Args: Array<ArgType>>(
        ...args: Args
      ) => Array<Migration>,
    },
  },
};

type TypeGraph = {
  [typeName: string]: {
    [constructorName: string]:
      | (<ArgType, Args: Array<ArgType>>(...args: Args) => CRDT)
      | MType,
  },
};

/**
 * Decorates each constructor providing the type instance.
 */
const wrapConstructors = (type, constructors) => {
  return Object.keys(constructors).reduce((wrapped, constructorName) => {
    const constructor = constructors[constructorName];

    // Provide the type instance to each data constructor.
    wrapped[constructorName] = (...args) => constructor(type, ...args);

    return wrapped;
  }, {});
};

/**
 * Compute the full type graph, including some prebuilt primitives.
 */
const getTypeGraph = schema => {
  const compositeTypes = Object.keys(schema.types).reduce((types, typeName) => {
    const { type } = schema.types[typeName][SECRET_METADATA_KEY];
    types[typeName] = type;

    return types;
  }, {});

  return {
    ...compositeTypes,
    ...primitives,
  };
};

/**
 * Call the given migration function with a full type graph
 * and the migration context.
 */
const applyMigration = (schema, typeName, migration) => {
  const typeGraph = getTypeGraph(schema);
  const { [SECRET_METADATA_KEY]: metadata } = schema.types[typeName];

  migration.call(metadata.migrations, typeGraph);
};

class Schema {
  types: TypeGraph = (Object.create(null): any);
}

/**
 * Declare and migrate members of a type graph. Manages initialization
 * and versioned linking of disparate types.
 */
export default function createSchema(newTypes: Initializers) {
  const schema = new Schema();

  // Initialize all the types.
  Object.keys(newTypes).forEach(typeName => {
    const definition = newTypes[typeName];
    const type = definition.createType(typeName);

    schema.types[typeName] = {
      ...wrapConstructors(type, definition.constructors),
      [SECRET_METADATA_KEY]: {
        migrations: definition.migrations,
        type,
      },
    };
  });

  // Run the migrations.
  Object.keys(newTypes).forEach(typeName => {
    const definition = newTypes[typeName];
    applyMigration(schema, typeName, definition.initialMigration);
  });

  return schema;
}

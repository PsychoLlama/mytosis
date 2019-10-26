// @flow
import createSchema, { SECRET_METADATA_KEY } from '../Schema';
import Primitive from '../Primitive';

const createDefinition = () => ({
  initialMigration: jest.fn().mockName('initialMigration'),
  constructors: {},
  migrations: {},
  createType: jest.fn(() => ({
    fakeType: true,
  })),
});

describe('createSchema', () => {
  it('initializes with an empty type graph', () => {
    const { types } = createSchema({});

    expect(types).toEqual({});
  });

  it('creates the type immediately', () => {
    const type = createDefinition();
    const schema = createSchema({ Player: type });
    const { Player } = schema.types;

    expect(type.createType).toHaveBeenCalledWith('Player');
    expect(Player).toMatchObject({
      [SECRET_METADATA_KEY]: {
        type: { fakeType: true },
      },
    });
  });

  it('applies the initial migration with primitives', () => {
    const type = createDefinition();
    createSchema({ Player: type });

    expect(type.initialMigration).toHaveBeenCalledWith(
      expect.objectContaining({
        boolean: expect.any(Primitive),
        string: expect.any(Primitive),
        number: expect.any(Primitive),
        Player: { fakeType: true },
      })
    );
  });

  it('applies the initial migration with the migration context', () => {
    const type = createDefinition();
    type.migrations.renameField = jest.fn();
    type.migrations.addField = jest.fn();

    let self;
    type.initialMigration.mockImplementation(function() {
      self = this;
    });

    createSchema({ Player: type });

    expect(type.initialMigration).toHaveBeenCalled();
    expect(self).toEqual(type.migrations);
  });

  it('exposes all the type constructors', () => {
    const type = createDefinition();
    type.constructors.define = jest.fn(() => 'returned');

    const schema = createSchema({ Player: type });
    const { Player } = schema.types;
    const result = Player.define(1, 2, 3);

    expect(result).toBe('returned');
    expect(type.constructors.define).toHaveBeenCalledWith(
      { fakeType: true },
      1,
      2,
      3
    );
  });
});

//
import { migration } from '@mytosis/types';

import * as type from '../types';
import Schema from '../schema';

describe('Schema', () => {
  it('returns null if a type cannot be found', () => {
    const schema = new Schema({});
    const type = schema.findType('no-such-type@1');

    expect(type).toBe(null);
  });

  it('locates types if they exist', () => {
    const Product = type.atom('Product', {});
    const schema = new Schema({ product: Product });
    const result = schema.findType(String(Product));

    expect(result).toBe(Product);
  });

  it('follows types through defaultType fields', () => {
    const C1 = type.atom('C1', {});
    const C2 = type.atom('C2', { defaultType: C1 });
    const schema = new Schema({
      root: type.atom('C3', { defaultType: C2 }),
    });

    const id = String(C1);
    const result = schema.findType(id);

    expect(result).toBe(C1);
  });

  it('survives if the default type is a primitive', () => {
    const pass = () =>
      new Schema({
        root: type.atom('Scoreboard', { defaultType: type.number }),
      });

    expect(pass).not.toThrow();
  });

  it('follows field pointers', () => {
    const User = type.atom('User');
    const FriendSet = type.atom('FriendSet', {
      initialFieldSet: { friend: User },
    });

    const schema = new Schema({
      profile: FriendSet,
    });

    const id = String(User);
    const result = schema.findType(id);

    expect(result).toBe(User);
  });

  it('indexes every version of a type', () => {
    const User = type
      .atom('User')
      .migrate([new migration.Add('fullName', type.string)])
      .migrate([new migration.Add('isPremium', type.boolean)]);

    const schema = new Schema({ user: User });
    const v1 = schema.findType(String(User.lastVersion.lastVersion));
    const v2 = schema.findType(String(User.lastVersion));
    const v3 = schema.findType(String(User));

    expect(v1).toBe(User.lastVersion.lastVersion);
    expect(v2).toBe(User.lastVersion);
    expect(v3).toBe(User);
  });

  // Types removed in later versions.
  it('indexes obsolesced types', () => {
    const Friend = type.atom('Friend');
    const schema = new Schema({
      user: type
        .atom('User')
        .migrate([new migration.Add('friend', Friend)])
        .migrate([new migration.Remove('friend')]),
    });

    const id = String(Friend);
    const result = schema.findType(id);

    expect(result).toBe(Friend);
  });

  // Types which have always existed, not added through a migration.
  it('indexes types from the initial type definition', () => {
    const Team = type.atom('Team');
    const Employee = type.atom('Employee');
    const schema = new Schema({
      company: type
        .atom('Company', {
          defaultType: Employee,
          initialFieldSet: {
            team: Team,
          },
        })
        .migrate([
          new migration.Remove('team'),
          new migration.RemoveDefaultType(),
        ]),
    });

    const teamId = String(Team);
    const employeeId = String(Employee);

    expect(schema.findType(teamId)).toBe(Team);
    expect(schema.findType(employeeId)).toBe(Employee);
  });

  it('throws if different implementations of the same type exist', () => {
    const Employee1 = type.atom('Employee');
    const Employee2 = type.atom('Employee');

    const fail = () =>
      new Schema({
        employee: Employee1,
        concealed: type
          .atom('Concealer')
          .migrate([
            new migration.Add('employee', Employee2),
            new migration.Remove('employee'),
          ]),
      });

    expect(fail).toThrow(/Employee/);
  });

  // Ensures the schema doesn't infinitely traverse the same timeline.
  it('allows self-referential types', () => {
    const User = type.atom('User');
    User.migrate([new migration.Add('self', User)]);
    const pass = () => new Schema({ user: User });

    expect(pass).not.toThrow();
  });
});

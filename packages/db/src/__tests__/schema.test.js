// @flow
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
});

import database from '../../index';
import expect from 'expect';

describe('The database', () => {
  let db;

  beforeEach(() => {
    db = database();
  });

  it('allows document structures', async () => {
    // Build some nodes.
    const users = await db.write('users', {});
    const alice = await db.write('users/alice', {
      name: 'Alice',
    });
    const settings = await db.write('settings/alice', {
      background: 'blue',
    });

    // Create links between them.
    await users.write('alice', alice);
    await alice.write('settings', settings);

    // Navigate the links.
    const list = await db.read('users');
    const user = await list.read('alice');
    const prefs = await user.read('settings');

    // Assert the data wrote correctly.
    expect([...prefs]).toEqual([['background', 'blue']]);
  });

  it('allows circular references', async () => {
    // Write two users.
    const alice = await db.write('users/alice', {
      name: 'Alice',
    });
    const bob = await db.write('users/bob', {
      name: 'Bob',
    });

    // Link them.
    await alice.write('friend', bob);
    await bob.write('friend', alice);

    // Assert the links works.
    let friend = alice;

    friend = await friend.read('friend');
    friend = await friend.read('friend');
    friend = await friend.read('friend');

    expect(await friend.read('name')).toBe('Bob');
  });

  it('allows concurrent branching', async () => {
    await db.write('users/jenn', { firstname: 'Jennifer' });
    const branch = db.branch();

    await branch.write('users/jenn', { lastname: 'Smith' });
    await branch.write('settings/jenn', { notifications: 'ENABLED' });

    // No mutations until commit.
    expect(db.value('users/jenn').value('lastname')).toBe(undefined);
    expect(db.value('settings/jenn')).toBe(null);

    await db.commit(branch);

    expect(db.value('users/jenn').value('lastname')).toBe('Smith');
    expect(db.value('settings/jenn').value('notifications')).toBe('ENABLED');
  });

  it('allows bulk reads', async () => {
    await db.write('users/moss', {});
    await db.write('users/trenneman', {});

    const addNames = db.branch();
    const [moss, roy] = await addNames.nodes(['users/moss', 'users/trenneman']);

    await moss.write('name', 'Maurice');
    await roy.write('name', 'Roy');
    await db.commit(addNames);

    expect((await db.read('users/moss')).snapshot()).toEqual({
      name: 'Maurice',
    });

    expect((await db.read('users/trenneman')).snapshot()).toEqual({
      name: 'Roy',
    });
  });
});

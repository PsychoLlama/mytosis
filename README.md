# mytosis

*Distributed graph database*

[![Travis build](https://img.shields.io/travis/PsychoLlama/mytosis/master.svg?style=flat-square)](https://travis-ci.org/PsychoLlama/mytosis)
[![downloads](https://img.shields.io/npm/dt/mytosis.svg?style=flat-square)](https://www.npmjs.com/package/mytosis)
[![version](https://img.shields.io/npm/v/mytosis.svg?style=flat-square)](https://www.npmjs.com/package/mytosis)

`mytosis` is a work in progress, wrapping the work of the [`graph-crdt`](https://github.com/PsychoLlama/graph-crdt) data structure into a friendly, modular API.

## API

So, yeah, it's currently listed as `v1`, but that was an accident. Whoops!

The API should be considered **unstable until `v2`**, then semver kicks in. Promise.

Until more comprehensive documentation is written, here's a code snippet to get you started:

```js
import database from 'mytosis'
import plugin from './no/plugins/published/yet'

// Every database accepts a bunch
// of options, easily shared and
// publishable.
const config = {

  // Save data to these storage plugins.
  storage: [plugin],

  // Event hooks. More info below.
  hooks: {},

  // Extend the API with methods/properties.
  // Per-instance, not global. Great for
  // adding utility methods.
  extend: {

    // Methods/properties added to the
    // database root.
    root: {

      PROPERTY: 'hey world, wazzup',

      async addUser (object) {
        const db = this
        // Do stuff.
      },

    },

    // These methods/properties will be added
    // to every node.
    context: {

      async addFriend (friend) {
        const node = this
        // Do other stuff.
      },

    },

  },
}

// Async IIFE - makes Promises way easier.
(async () => {

  // Creates a new database instance.
  // All configuration is optional.
  const db = database(config)

  // Writing data:
  const alice = await db.write('alice', {
    name: 'Alice',
  })

  const bob = await db.write('bob', {
    name: 'Bob',
  })

  // Linking data:
  await alice.write('friend', bob)
  await bob.write('friend', alice)

  // Reading data:
  const name = await alice.read('name')

  // Prints "Alice"
  console.log(name)

  // Traversing links:
  let friend = alice

  // Circular reference, we could do this all day!
  friend = await friend.read('friend')
  friend = await friend.read('friend')
  friend = await friend.read('friend')
  friend = await friend.read('friend')
  friend = await friend.read('friend')

  // Prints "Bob"
  console.log(await friend.read('name'))

  // ---------- //
  // The `extend` methods/properties we added
  // will show up on our instances.

  // Root extensions:
  typeof db.addUser // 'function'
  db.PROPERTY // 'hey world, wazzup'

  // Context extensions:
  typeof alice.addFriend // 'function'

})()
```

#### Hooks

I mentioned `hooks` in the snippet above. I didn't expand there since it's a lot to cover.

Hooks are grouped into two categories:
- Things to do `before` an event happens.
- Things to do `after` an event happens.

A hook is a function that gets called when an event happens. That hook can change how the event is handled.

For example, you could register a hook that's fired before data is written.

```js
const config = {
  hooks: {
    before: {
      write (graph) {
        // Called before a write happens.
      },
    },
  },
}
```

Each event can have many hooks, and they're invoked sequentially. If one of them returns a `Promise`, Mytosis will wait until it resolves before continuing.

But hooks have a lot more power than just listening in, they're a core component of the plugin system.

In our `before.write` hook above, if it returns a different graph, the replacement is written instead. Hooks can change values being written, fields being read, or any options being passed. That's where the real power comes in!

Another example, a plugin that namespaces reads before they happen:

```js
const config = {
  before: {
    read: {

      // Prefixes node IDs
      // before they're read.
      node (uid) {
        return `prefix/${uid}`
      }

    }
  }
}

const db = database(config)

// The before.read.node hook will
// replace 'users' with 'prefix/users'
db.read('users')
```

Now that you've got a taste of what hooks can do, here's the list of what's (currently) available:

- `before`
  - `read`
    - `node`
    - `field`
  - `write`
- `after`
  - `read`
    - `node`
    - `field`
  - `write`

### Installing

#### Using npm
> If you're not familiar with node or npm, you can install them [here](https://docs.npmjs.com/getting-started/what-is-npm).

Using npm, run this:
```sh
$ npm install mytosis
```

Now from your project, you can import it:

```js
import database from 'mytosis'
```

#### Using git
If you enjoy living on the edge, you can install the latest version of `mytosis` from GitHub.

```sh
$ git clone https://github.com/PsychoLlama/mytosis.git mytosis
$ cd mytosis

# Install the dependencies.
$ npm install

# Start the compiler.
$ npm run dev
```

##### Running tests
Travis-CI is only happy if both mocha and eslint are happy.

Here's how you can try them locally:

**Mocha**
```js
$ npm run test
```

**ESLint**
```js
$ npm run lint
```

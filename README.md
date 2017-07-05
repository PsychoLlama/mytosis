# Mytosis

*A decentralized graph database*

[![Travis build](https://img.shields.io/travis/PsychoLlama/mytosis/master.svg?style=flat-square)](https://travis-ci.org/PsychoLlama/mytosis)
[![downloads](https://img.shields.io/npm/dt/mytosis.svg?style=flat-square)](https://www.npmjs.com/package/mytosis)
[![version](https://img.shields.io/npm/v/mytosis.svg?style=flat-square)](https://www.npmjs.com/package/mytosis)

> **Versioning note:** `v1` is unstable. `v2` will be the first stable release.

### Introduction
Mytosis organizes data as one massive object which contains other objects. The root is called the graph, and its children are called nodes.

```plain
Graph {
  node1
  node2
  node3
  ...
}
```

A key concept is that nodes cannot contain other nodes. To express relationships, Mytosis uses pointers, sometimes called "edges". Those edges are automatically resolved, allowing you to structure your data as a tree, as tables, as key-value pairs, or an interconnected mesh.

```plain
Graph {
  book {
    title: "Hitchhiker's Guide"
    author: Pointer(author)
  }

  author {
    name: "Douglas Adams"
    authored: Pointer(books)
  }

  books {
    book: Pointer(book)
  }
}
```

To mutate the graph, you declare all fields which changed along with their new values. Mytosis will generate a patch update and give it to your storage and network plugins.

## Installing
This package is available on npm.

```sh
# Install with npm
npm install mytosis --save

# Install with yarn
yarn add mytosis
```

Now you can import it into your project.
```js
// ES Modules
import database from 'mytosis'

// CommonJS
const database = require('mytosis').default
```

## API
The main API surface is intentionally small. It consists of only a few methods.

> If you need more fine-grained control, you might find [the `graph-crdt` documentation](https://psychollama.github.io/graph-crdt/) useful.<br />
  `Database` and `Context` inherit from `Graph` and `Node` (respectively).

### `database(...configs)`
Creates a new database. It can be used with or without the `new` keyword.

By default, the database operates as an in-memory cache, and can be extended by passing in plugins. There are tons of options, so we'll cover those [later](#config).

```js
const db = database()
```

#### Options

Most methods accept an `options` object as the last parameter, which supports the following:

- `options.storage` - Overrides the storage defaults. Can be a storage plugin or `null`.
- `options.network` - Overrides the network defaults. Can be a `ConnectionGroup` or `null`.

### `db.read(key[, options])`
Reads a `Node` from the database, resolved through a promise.

<dl>
  <dt><code>Node</code></dt>
  <dd>
    An object containing only primitives.
    Nested objects are represented as pointers.
  </dd>
</dl>

```js
const stats = await db.read('stats')

console.log('Stats:', stats)
```

If the node can't be found, `null` is returned.

#### Options
Same options as [`db.nodes()`](#dbwritekey-patch-options).

### `db.nodes([...keys][, options])`
Reads many keys simultaneously, resolving with an array of nodes.

> **Note:** This isn't just `Promise.all`. It's more performant than `db.read`, especially if you're querying the network.

```js
// Reads both `timeline` and `profile/<userid>`.
const [timeline, profile] = await db.nodes(['timeline', `profile/${userId}`])

console.log('Profile:', profile.snapshot())
```

If a node can't be found, it's value is `null`.

#### Options
All standard options are supported. In addition...

- `options.force` - Ignore the in-memory cache and force a read from the plugins. Expects a boolean value.

### `db.write(key, patch[, options])`
Updates properties on a node. If the node doesn't exist, it's created.

```js
db.write('preferences', {
  notificationsDisabled: true,
  theme: 'dark',
})
```

Everything in Mytosis is a patch update. You only need to declare the properties you're changing.

### <a name="branch"><code>db.branch()</code></a>
Clones the current database into a new in-memory store. Nothing you change will have an effect on the source database until you choose to [`commit()`](#commit) them.

Hooks and API extensions are shared with branches, but storage and network plugins are ignored.

Some use cases are:

- Describing a collection of changes which should be applied simultaneously
- Making edits which might be later cancelled

```js
const update = db.branch()

// These writes won't affect `db`.
await update.write('settings', {
  bio: 'It all started when...',
  theme: 'Monokai',
})

await update.write('contact', {
  email: 'Bob@bob.bob',
})

// Write all the changes at once.
await db.commit(update)
```

> **Note:** Changes to the source database will not affect branches.<br />
  You may want to [`rebase()`](https://psychollama.github.io/graph-crdt/graph-crdt.module_Graph.html#rebase) your changes before calling [`commit()`](#commit).

### <a name="commit"><code>db.commit(changes[, options])</code></a>
Applies a collection of changes all at once, represented as a graph. Useful for committing changes pushed from other replicas or branched databases.

It's used under the hood by `node.write` and `db.write`.

```js
import { Graph, Node } from 'mytosis'

const graph = new Graph()
const node = new Node({ uid: 'change' })

node.merge({ changes: 'eh, probably' })
graph.merge({ change: node })

await db.commit(graph)
```

### Events
Each mutation will emit an `"update"` event, passing a graph containing only the changes. There's also a `"history"` event when properties are overwritten. If you keep track of these deltas, you can roll time backwards and forwards.

### `node.read(key[, options])`
Reads a primitive value from the node. If the value is a pointer to another node, Mytosis will automatically resolve it.

```js
const weather = await db.write('weather', {
  temperature: 25,
})

const temperature = await weather.read('temperature')
```

### `node.write(key, value[, options])`
Writes a value to the node. The value can be any primitive.

```js
const company = await db.write('company', {})

await company.write('phone', '456-123-8970')
```

To create a pointer to another node, you can write the reference.

```js
// Create two nodes...
const dave = await db.write('user', { name: 'dave' })
const company = await db.write('company', { name: 'Enterprise Inc.' })

// Link one to the other.
await dave.write('workplace', company)

// Prints "Enterprise Inc."
dave.read('company')
  .then(company => company.read('name'))
  .then(name => console.log('Name:', name))
```

### Events
Each node inherits from an event emitter. Any mutation triggers `"update"`, passing the changes. This is useful for observing real-time data and reacting to changes.

```js
const usage = await db.read('usage-stats')

usage.on('update', (changes) => {
  console.log('Fields changed:', ...changes)
})
```

### <a name="config">Config</a>
Mytosis is designed to be highly extensible through plugins. You can use it with any storage backend, sync it over the network using any connection prototcol (such as websockets, http, webrtc, or a mix of all three), intercept and transform reads and writes, filter incoming reads or writes, and extend the core API.

These plugins are all contained in the config, and must be defined when the database is instantiated.

You can have more than one config though, as the `database` function accepts several and will merge them all together. This allows you to create presets, or groupings of plugins and share them as a single unit.

```js
const db = database(config1, config2, config3)
```

> **Note:** Currently, there are no published plugins.

#### Hooks
Used to intercept reads & writes. For example, you could use hooks to:

- Reject writes of the wrong data type
- Listen for write events and update a database visualization
- Keep track of how often a value is read for an LRU policy
- Transform values to a different format (like a `Date` object)

A hook is a function which takes a read or write action and returns the transformed action.

```js
const writeHook = (action) => action
```

When you write a value, mytosis generates an action object which represents the write. It contains details like what network & storage plugins should be called, what the update graph is, what the state will look like when the write has finished, and any merge deltas after completion.

Hooks can change every bit of it.

For example, here's a hook which adds a prefix to every read.

```js
const readHook = (readAction) => ({
  ...readAction,

  key: `my-prefix/${readAction.key}`,
})

const db = database({
  hooks: {
    before: {
      read: {
        node: readHook,
      },
    },
  },
})
```

Hooks can be asynchronous. If a promise is returned, the entire pipeline is put on pause until it resolves.

```js
// Delay all writes by one second.
const writeHook = async (writeAction) => {
  await Promise.delay(1000)

  return writeAction
}
```

As a best practice, never mutate the action. Return a new action instead.

These are all the hooks you can register:

```js
const hook = (action) => action

database({
  hooks: {
    before: {
      write: hook,
      read: {
        node: hook,
        field: hook,
      },
    },

    after: {
      write: hook,
      read: {
        node: hook,
        field: hook,
      },
    },
  }
})
```

> **Note:** You may be tempted to implement security using hooks. Don't. Do it in [the router](#router) instead.

#### Storage
Used to save data to a persistent cache and read it back later. If a plugin is provided, the first read will attempt to pull from storage, and its return value will be cached in memory.

```js
database({
  storage: new StoragePlugin(),
})
```

Writing a storage plugin will look a bit like this...

```js
class StoragePlugin {
  async read (action) {} // Read a value
  async write (action) {} // Write a set of values
  async remove (action) {} // Delete a value
}
```

> **Note:** Mytosis may require `.query()` and `.list()` methods in the future.

#### Network
Used to send updates and request data from remote sources.

```js
database({
  network: new NetworkPlugin(),
})
```

By default, Mytosis **will not** use your network plugins. Instead, it interfaces with another plugin type, called the [router](#router). The router is responsible for answering requests and sending out data.

Network plugins are objects with a `.send()` method and a message event stream. Each connection declares its connection type and its unique identifier.

Here's an example of a network plugin...

```js
import { Stream } from 'mytosis'

class NetworkPlugin {
  type = 'websocket'
  id = uuid()

  send (message) {}

  messages = new Stream(emit => {
    myNetworkInterface.on('message', emit)
  })
}
```

> Mytosis may specify `connection` and `disconnection` event streams in the future, as well as `offline` and `ephemeral` flags.

#### <a name="router">Router</a>
The router is responsible for sending read requests, pushing out updates, and handling requests from others.

At its core, a router looks like this:

```js
const router = (db, config) => {
  config.network.messages.forEach((message) => {
    console.log('Incoming message:', message)
  })

  return {
    async push ({ network, update }) {
      network.send({ /* your update */ })
    }

    async pull ({ network, key }) {
      network.send({ /* your request */ })
    }
  }
}

database({ router })
```

`push()` is invoked for writes, while `pull()` is called for reads. You're given a group of network connections and complete creative freedom. Whatever the `push`/`pull` resolve value is will be given to the user (after merging with whatever storage returns).

##### Security
Mytosis doesn't have a stance on read or write permissions. Your router is responsible for how you answer unauthorized requests. If a message comes in asking for data they're not authorized to read, `pull()` (or `push()`) should reject.

Ultimately, the security mechanism is completely up to you.

> **Note:** Mytosis may publish a routing framework in the near future designed to address permissions and security.

### Roadmap
- Better offline editing
- Query support (plugin integration)
- Ability to delete
- Low-level streaming API

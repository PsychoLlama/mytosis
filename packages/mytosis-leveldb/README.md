# Mytosis LevelDB
*Persistent cache for Mytosis*

## Purpose
`mytosis-leveldb` is a plugin for [Mytosis](https://github.com/PsychoLlama/mytosis) and serves as long-term storage. It's perfect for small-scale servers and electron apps looking for a persistent cache.

Its ease of use and large ecosystem allows for quick prototyping of [different backends](https://github.com/Level/levelup/wiki/Modules), like Mongo, Google Sheets, or Azure (to name a few).

> **Note:** This plugin doesn't depend on LevelDB directly. To keep compatibility with all the different platforms (specifically browsers), a level instance must be passed as an argument.

## Usage
This package is published on npm. You probably know what to do, but here's something you can copy & paste.

```sh
# With the yarn goodness
yarn add mytosis mytosis-leveldb

# Or with npm, that's cool too
npm install --save mytosis mytosis-leveldb
```

The most popular LevelDB interface is `levelup` with `leveldown`. Here's what it looks like for this plugin...

```js
import LevelDB from 'mytosis-leveldb'
import database from 'mytosis'

// You'll need to install `levelup` first.
import levelup from 'levelup'

// Create a new level instance.
const level = levelup('app-prefix/', {

  // Sets the encoding for every read & write.
  valueEncoding: 'json',
})

const db = database({
  storage: new LevelDB({ backend: level }),
})
```

It creates a new folder in the current working directory as `app-prefix/` (or whatever you passed to `levelup`) and uses it as a database. The `valueEncoding` option is important - if you begin to see `[object Object]` everywhere, make sure it's set to `json`.

That's it! Everything you need to get up and running with LevelDB is right there. Reads and writes will go through LevelDB.

## Taking it further
You can use level everywhere, from the server to the browser to React Native. It seems every database in existence has a LevelDB plugin for it. Seriously, [check the list](https://github.com/Level/levelup/wiki/Modules).

For example, here's how you'd use `mytosis-leveldb` in the browser with IndexedDB:

```js
import LevelDB from 'mytosis-leveldb'
import database from 'mytosis'

import levelup from 'levelup'
import leveljs from 'level-js'

const level = levelup('your-app-name/', {
  valueEncoding: 'json', // Encode as JSON
  db: leveljs, // Persist to IndexedDB
})

const db = database({
  storage: new LevelDB({ backend: level }),
})
```

The same general process applies using `sheet-down`, `redis-down`, `riak-down` or any other backend - change the `config.db` option.

There's an entire other class of plugins for level too, like hooks, advanced queries, and data visualizations, but I'll leave those for you to explore :rainbow:

## Support
> **Note:** The Mytosis storage plugin spec isn't finished yet. A `.query()` method and a way to read keys in bulk are on the spec roadmap.

If you encounter a problem or find yourself needing a feature, _please_ submit an issue. It's invaluable to know about these problems before going too far in the wrong direction.

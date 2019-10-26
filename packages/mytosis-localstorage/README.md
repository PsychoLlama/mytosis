# Mytosis LocalStorage
A simple Mytosis plugin for your browser's `localStorage`.

## Install
You can install `mytosis-localstorage` from npm.

```sh
# For the enlightened...
yarn add mytosis-localstorage

# Or if you're old school.
npm install --save mytosis-localstorage
```

Just add it to Mytosis as a storage plugin.

```js
import LocalStoragePlugin from 'mytosis-localstorage'
import database from 'mytosis'

const db = database({
  storage: new LocalStoragePlugin(),
})
```

Now your data will be synced with localStorage automatically.

## Configuration
There are two options available from the constructor:
- `options.prefix`
- `options.backend`

`prefix` sets a namespace for every read and write. If your prefix is `mytosis-cache/`, a read of `user-settings` will look for `mytosis-cache/user-settings`.

> **Note:** special characters are not escaped.

```js
const cache = new LocalStoragePlugin({
  prefix: 'mytosis-cache/',
})
```

`backend` allows you to override the localStorage backend. Useful if you'd rather use `sessionStorage` or if your test environment doesn't support a global `localStorage` object.

```js
const cache = new LocalStoragePlugin({
  backend: sessionStorage,
})
```

## Notes
- Default localStorage behavior can be overridden using the read/write `options.storage` setting in mytosis.
- Only the first read of a node will hit `window.localStorage`. The results are cached unless `options.force` is set.

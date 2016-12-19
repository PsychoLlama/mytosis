# mytosis

*Distributed graph database*

[![Travis build](https://img.shields.io/travis/PsychoLlama/mytosis/master.svg?style=flat-square)](https://travis-ci.org/PsychoLlama/mytosis)
[![downloads](https://img.shields.io/npm/dt/mytosis.svg?style=flat-square)](https://www.npmjs.com/package/mytosis)
[![version](https://img.shields.io/npm/v/mytosis.svg?style=flat-square)](https://www.npmjs.com/package/mytosis)

`mytosis` is a work in progress, wrapping the work of the [`graph-crdt`](https://github.com/PsychoLlama/graph-crdt) data structure into a friendly, modular API.

## API

> Meh, docs later.

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

# database

*Distributed graph database*

[![Travis branch](https://img.shields.io/travis/PsychoLlama/database/master.svg?style=flat-square)](https://travis-ci.org/PsychoLlama/database)

`database` is a work in progress, wrapping the work of the [`graph-crdt`](https://github.com/PsychoLlama/graph-crdt) data structure into a friendly, modular API.

## API

> Meh, docs later.

### Installing

#### Using npm
> If you're not familiar with node or npm, you can install them [here](https://docs.npmjs.com/getting-started/what-is-npm).

Using npm, run this:
```sh
$ npm install database
```

Now from your project, you can import it:

```js
// ES Modules
import * as database from 'database'

// CommonJS
const database = require('database')
```

#### Using git
If you enjoy living on the edge, you can install the latest version of `database` from GitHub.

```sh
$ git clone https://github.com/PsychoLlama/database.git database
$ cd https://GitLab/PsychoLlama database

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

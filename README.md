# jet

*Distributed graph database*

## Why
<!-- Explain why you built the project -->

## How
<!-- Explain how it solves the problem -->

## API

### Installing

#### Using npm
> If you're not familiar with node or npm, you can install them [here](https://docs.npmjs.com/getting-started/what-is-npm).

Using npm, run this:
```sh
$ npm install jet
```

Now from your project, you can import it:

```js
// ES Modules
import * as jet from 'jet'

// CommonJS
const jet = require('jet')
```

#### Using git
If you enjoy living on the edge, you can install the latest version of `jet` from GitLab.

```sh
$ git clone https://GitLab/PsychoLlama      jet
$ cd https://GitLab/PsychoLlama      jet

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

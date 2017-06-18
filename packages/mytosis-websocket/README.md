# Mytosis WebSocket
*Send real-time updates over websockets*

## What it's for
[Mytosis](https://github.com/PsychoLlama/mytosis) defines a standard interface for network plugins, but it doesn't ship with any out of the box. `mytosis-websocket` is one such adapter for websockets (I know, never would've guessed).

Here's what it does:
- Runs [`uWebSockets`](https://www.npmjs.com/package/uws) on the server because it's wicked fast
- Connects with [`reconnecting-websocket`](https://github.com/pladaria/reconnecting-websocket) on the front end because it's tiny and reconnects automatically
- Supports binary payloads (`Blob`, `File`, Node's `Buffer`, `ArrayBuffer`) so you can finally send those cat pictures in real time

Here's what it won't do:
- Fall back to http polling.<br />
  WebSockets have great support (IE10+ in web units). If you're going retro or just really love Flash, write your own plugin.
- Manage your data for you.<br />
  That's not how Mytosis works. You're in charge of your data. This plugin does nothing until you tell it to (in fact, these types of plugins don't even have a reference to your database). Take a look at the `Router` plugin type for more deets.

## Installing
It's on npm as `mytosis-websocket`. You probably know the drill, but here's something you can copy & paste.

```sh
# Yarn good
yarn add mytosis-websocket

# npm less good
npm install --save mytosis-websocket
```

## Using it
> **Note:** there's this great websocket server on the internet that just shouts back whatever you send it. I use that URL in the examples: `ws://html5rocks.websocket.org/echo`

There are two parts, the client and the server. They work best together, but it's not necessary.

By default, it'll use the global `WebSocket` instance. Good for browsers...

```js
import Socket from 'mytosis-websocket'
import database from 'mytosis'

const socket = new Socket('ws://html5rocks.websocket.org/echo')

const db = database({ network: socket })
```

### Configuring the client
Need it in Node? Since there's no global `WebSocket` constructor, you'll need to pass your own. Two good libraries are [`uws`](https://www.npmjs.com/package/uws) and [`ws`](https://www.npmjs.com/package/ws). This library depends on `uws` so if you don't really care, just pick that one.

```js
import Socket from 'mytosis-websocket'
import WebSocket from 'uws'

const socket = new Socket('ws://html5rocks.websocket.org/echo', {
  WebSocket: WebSocket,
})
```

When a websocket disconnects, it'll automatically try to reconnect. All of the reconnection stuff is configurable.

```js
const defaultOptions = {
  WebSocket: TheGlobalSocketConstructor,
  protocols: undefined, // It's the second param to `WebSocket`
  reconnectionDelayGrowFactor: 1.3,
  maxReconnectionDelay: 10000,
  minReconnectionDelay: 1500,
  connectionTimeout: 4000,
  maxRetries: Infinity,
  debug: false,
}
```

> **Note:** Most of the above snippet is taken from the [`reconnecting-websocket` readme](https://github.com/pladaria/reconnecting-websocket).

## Server
The server is mostly the same.

```js
// Mind the appended "/server"
import Server from 'mytosis-websocket/server'
import database from 'mytosis'

const server = new Server({
  port: 8080,
})

const db = database({
  network: server,
})
```

Boom! You've got a WebSocket server. High five, my friend! :raised_hand_with_fingers_splayed:

Using the client and server simultaneously is a bit weird with Mytosis, you've gotta put it in two configs:

```js
const db = database({
  network: new Server({ port: 8080 }),
}, {
  network: new Socket(url, config),
})
```

### Setting options for the server
This library uses `uws` is basically a drop-in replacement for `ws`, so everything you can pass `ws` you can pass to `mytosis-websocket/server`. That's where the `config.port` option comes from. [Here's a link to some docs](https://www.npmjs.com/package/ws).

Another common option is `config.server`, which allows you to pass your own `http.Server` instance. Rather handy for use with express.

```js
import SocketServer from 'mytosis-websocket/server'
import { Server } from 'http'

const server = new Server()
const socketServer = new SocketServer({ server })

server.listen(8080)
```

## Examples
Watching for new connections:

```js
import Server from 'mytosis-websocket/server'

const server = new Server({ port: 8080 })

server.messages.forEach((message) => {
  console.log('New message:', message)
})

server.on('add', (connection) => {
  connection.send({ hey: `how's it going, ${connection.id}?` })
})

server.on('remove', (connection) => {
  console.log(`Sad, ${connection.id} left.`)
})
```

All Mytosis servers will work like this. It's part of the spec.

Here's how you'd listen for updates and send changes:

```js
const server = new Server({ port: 8080 })

const db = database({
  network: server,
  router: (db, config) => {
    config.network.messages.forEach((message, sender) => {
      // If the other client is running the same router, you should see
      // something like `type: 'read', key: 'whatevs'`.
      // Everything you send is completely up to you.
      sender.send(someResponse)
    })

    return {
      pull (read) {
        read.network.send({ type: 'read', key: read.key })
      },

      push (write) {
        write.network.send({ type: 'write', update: write.update })
      },
    }
  }
})
```

There you go!

## Support
Real-time updates are still a new feature of Mytosis. If you find a problem, _please_ post an issue. It could influence the future of the plugin spec. Seriously, don't be shy.

Questions and comments are also good for GitHub issues.

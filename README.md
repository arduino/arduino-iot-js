[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![npm version](https://badge.fury.io/js/arduino-iot-js.svg)](https://badge.fury.io/js/arduino-iot-js)

# arduino-iot-js

## Introduction

This library provides interaction with the **Arduino IoT Cloud MQTT broker** and It can be used both from the browser and Node.js

It allows to connect in two different modes:

- via **[User credentials](examples/1.user-credentials/README.md)**, to send or listen every properties of a user
- via **[Device credentials](examples/2.device-credentials/README.md)**, to behave as a single device

The main features of this module are:

- Connection/disconnection to Arduino IoT Cloud Broker using WebSocket
- Behave as a device via MQTT
- Send IoT Cloud _property_ updates
- Listen for IoT Cloud _property_ updates made by other clients and/or devices

If you are looking for a way to create, read, update, delete resources (like Devices , Things, Properties, Data Timeseries, ecc...) please check the official [Javascript Rest API client](https://www.npmjs.com/package/@arduino/arduino-iot-client).

If you want to learn more about Arduino IoT Cloud architecture, check the official [getting started documentation](https://www.arduino.cc/en/IoT/HomePage).

## Installation

Via NPM

```bash
$ npm install arduino-iot-js
```

Via pnpm

```bash
$ pnpm add arduino-iot-js
```

On Node.js or the browser you'll also want the [`mqtt`](https://github.com/mqttjs/MQTT.js)
library, which is an optional peer dependency (see [Providing the MQTT client](#providing-the-mqtt-client)):

```bash
$ npm install mqtt
```

## How to use

The MQTT connection relies on Username / Password authentication.

Under the hood, this module could uses your user ID (plus a timestamp) as _Username_ and a valid JWT Token as _Password_ when needs to connect to every properties (You can use either a valid JWT token or just your API Credentials) or some device credentials.

`connect()` returns an **active connection** object that encapsulates the live
session. From it you obtain a `property(...)` handle, which you can `subscribe`
to and `publish` to. `subscribe` returns a subscription you can later
`unsubscribe`, and `connection.close()` tears down the whole session.

The connection reconnects on its own if the broker drops the socket: lifecycle
callbacks keep firing and retained subscriptions are restored automatically, and
(for the token path) credentials are refreshed on each reconnect — so an expiring
JWT no longer kills the session.

> **Migrating from `0.x`?** The old `client.sendProperty()` /
> `client.onPropertyValue()` / `client.disconnect()` API has been replaced by
> the connection-first API shown below.

### Providing the MQTT client

This library is **transport-agnostic**: it never imports `mqtt` itself, so nothing
pulls it into your bundle (important for `React Native`). You build an entry point
with `createArduinoCloud({ mqttConnect })`, injecting the MQTT client factory.

On Node or the browser, install [`mqtt`](https://github.com/mqttjs/MQTT.js) (it's an
optional peer dependency) and pass its `connect`:

```ts
import { connect } from 'mqtt';
import { createArduinoCloud, type MqttConnectFn } from 'arduino-iot-js';

const ArduinoIoTCloud = createArduinoCloud({
  mqttConnect: connect as unknown as MqttConnectFn,
});
```

On `React Native` (or anywhere the standard library doesn't work), provide your own
client implementing the `MqttClient` contract instead — without ever installing `mqtt`:

```ts
import { createArduinoCloud, MqttClient, MqttOptions } from 'arduino-iot-js';

const ArduinoIoTCloud = createArduinoCloud({
  mqttConnect: (url: string, options: MqttOptions): MqttClient => {
    // Put your library here (e.g. new Paho.MQTT.Client(options.host, Number(options.port)))
  },
});
```

The examples below assume an `ArduinoIoTCloud` instance created as shown above.

### How to connect via **User Credentials**

A user can address any thing they own, so `connection.property(thingId, name)`
takes an explicit thing id.

- via **API Credentials**

```typescript
(async () => {
  const connection = await ArduinoIoTCloud.connect({
    clientId: 'YOUR_CLIENT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET',
    onDisconnect: (message) => console.error(message),
  });

  const property = connection.property('YOUR_THING_ID', 'YOUR_VARIABLE_NAME');

  // Send a value to a thing property
  await property.publish('some value');

  // Listen to a thing property's changes
  const subscription = property.subscribe((value) => console.log(value));

  // Later, stop listening / tear down the connection
  subscription.unsubscribe();
  connection.close();
})();
```

- via **User JWT Token**

Pass `token` as a function (`() => Promise<string>`). It's called on connect and
again on every reconnect, so an expiring JWT is refreshed and the connection
re-authenticates automatically:

```typescript
async function retrieveUserToken(): Promise<string> {
  // Retrieve (a fresh) JWT Token here
}

(async () => {
  const connection = await ArduinoIoTCloud.connect({
    token: retrieveUserToken,
    onDisconnect: (message) => console.error(message),
  });

  const property = connection.property('YOUR_THING_ID', 'YOUR_VARIABLE_NAME');

  await property.publish('some value');
  property.subscribe((value) => console.log(value));
})();
```

> You can also pass a plain `token: 'YOUR_JWT'` string, but it won't be refreshed —
> the session ends when that token expires. The function form is recommended.

### How to connect via **Device Credentials**

A device is bound to a single thing (resolved automatically at connect time), so
`connection.property(name)` takes only the variable name.

```typescript
(async () => {
  const connection = await ArduinoIoTCloud.connect({
    deviceId: 'YOUR_DEVICE_ID',
    secretKey: 'YOUR_SECRET_KEY',
    onDisconnect: (message) => console.error(message),
  });

  const property = connection.property('YOUR_VARIABLE_NAME');

  // Send property's values as a device
  await property.publish('some value');

  // Listen property's updates
  property.subscribe((value) => console.log(value));
})();
```

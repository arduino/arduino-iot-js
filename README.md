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

## How to use

The MQTT connection relies on Username / Password authentication.

Under the hood, this module could uses your user ID (plus a timestamp) as _Username_ and a valid JWT Token as _Password_ when needs to connect to every properties (You can use either a valid JWT token or just your API Credentials) or some device credentials.

`connect()` returns an **active connection** object that encapsulates the live
session. From it you obtain a `property(...)` handle, which you can `subscribe`
to and `publish` to. `subscribe` returns a subscription you can later
`unsubscribe`, and `connection.close()` tears down the whole session.

> **Migrating from `0.x`?** The old `client.sendProperty()` /
> `client.onPropertyValue()` / `client.disconnect()` API has been replaced by
> the connection-first API shown below.

### How to connect via **User Credentials**

A user can address any thing they own, so `connection.property(thingId, name)`
takes an explicit thing id.

- via **API Credentials**

```typescript
import { ArduinoIoTCloud } from 'arduino-iot-js';

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

```typescript
import { ArduinoIoTCloud } from 'arduino-iot-js';

async function retrieveUserToken() {
  // Retrieve JWT Token here
}

(async () => {
  const token = await retrieveUserToken();

  const connection = await ArduinoIoTCloud.connect({
    token,
    onDisconnect: (message) => console.error(message),
  });

  const property = connection.property('YOUR_THING_ID', 'YOUR_VARIABLE_NAME');

  await property.publish('some value');
  property.subscribe((value) => console.log(value));
})();
```

### How to connect via **Device Credentials**

A device is bound to a single thing (resolved automatically at connect time), so
`connection.property(name)` takes only the variable name.

```typescript
import { ArduinoIoTCloud } from 'arduino-iot-js';

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

## Override MQTT Library

If for any reason (e.g., a `React Native` project) the standard [mqtt library](https://github.com/mqttjs/MQTT.js) causes issues, it's possible to override it using `createArduinoCloud`.

```ts
import { createArduinoCloud, MqttClient, MqttOptions } from 'arduino-iot-js';

const mqttConnect = (url: string, options: MqttOptions): MqttClient => {
  // Put your library here (e.g. new Paho.MQTT.Client(options.host, Number(options.port));)
};

const ArduinoIoTCloud = createArduinoCloud({ mqttConnect });
```

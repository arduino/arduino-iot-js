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

Via Yarn

```bash
$ yarn add arduino-iot-js
```

## How to use

The MQTT connection relies on Username / Password authentication.

Under the hood, this module could uses your user ID (plus a timestamp) as _Username_ and a valid JWT Token as _Password_ when needs to connect to every properties (You can use either a valid JWT token or just your API Credentials) or some device credentials.

### How to connect via **User Credentials**

- via **API Credentials**

```typescript
import { ArduinoIoTCloud } from 'arduino-iot-js';

(async () => {
  const client = await ArduinoIoTCloud.connect({
    clientId: 'YOUR_CLIENT_ID',
    clientSecret: 'YOUR_CLIENT_SECRET',
    onDisconnect: (message) => console.error(message),
  });

  // Send a value to a thing property
  const value = 'some value';
  client.sendProperty('YOUR_THING_ID', 'YOUR_VARIABLE_NAME', value);

  // Listen to a thing property's changes
  client.onPropertyValue('YOUR_THING_ID', 'ANOTHER_VARIABLE_NAME', (value) => console.log(value));
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

  const client = await ArduinoIoTCloud.connect({
    token,
    onDisconnect: (message) => console.error(message),
  });

  // Send a value to a thing property
  const value = 'some value';
  client.sendProperty('YOUR_THING_ID', 'YOUR_VARIABLE_NAME', value);

  // Listen to a thing property's changes
  client.onPropertyValue('YOUR_THING_ID', 'ANOTHER_VARIABLE_NAME', (value) => console.log(value));
})();
```

### How to connect via **Device Credentials**

```typescript
import { ArduinoIoTCloud } from 'arduino-iot-js';

(async () => {
  const client = await ArduinoIoTCloud.connect({
    deviceId: 'YOUR_DEVICE_ID',
    secretKey: 'YOUR_SECRET_KEY',
    onDisconnect: (message) => console.error(message),
  });

  // Send property's values as a device
  const value = 'some value';
  client.sendProperty('YOUR_VARIABLE_NAME', value);

  // Listen property's updates
  client.onPropertyValue('ANOTHER_VARIABLE_NAME', (value) => console.log(value));
})();
```

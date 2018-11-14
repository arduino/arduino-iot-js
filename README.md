[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![npm version](https://badge.fury.io/js/arduino-iot-js.svg)](https://badge.fury.io/js/arduino-iot-js)

# arduino-iot-js

JS module providing interaction with Arduino Cloud

## Installation

```bash
$ npm install arduino-iot-js
```

## How to use
```javascript
import ArduinoCloud from 'arduino-iot-js';

// connect establishes a connection with mqtt, using token as the password
// options = {
//   host: 'BROKER_URL',        // Default is wss.iot.arduino.cc
//   port: BROKER_PORT,         // Default is 8443
//   ssl: true/false,           // Default is true
//   token: 'YOUR_BEARER_TOKEN' // Required!   
//   apiUrl: 'AUTH SERVER URL', // Default is https://auth.arduino.cc
//   onDisconnect: message => { /* Disconnection callback */ }
// }
ArduinoCloud.connect(options).then(connectionId => {
  // Connected
});

ArduinoCloud.disconnect(connectionId).then(() => {
  // Disconnected
});

ArduinoCloud.subscribe(connectionId, topic, cb).then(topic => {
  // Subscribed to topic, messaged fired in the cb
});

ArduinoCloud.unsubscribe(connectionId, topic).then(topic => {
  // Unsubscribed to topic
});

ArduinoCloud.sendMessage(connectionId, topic, message).then(() => {
  // Message sent
});

ArduinoCloud.openCloudMonitor(connectionId, deviceId, cb).then(topic => {
  // Cloud monitor messages fired to cb
});

ArduinoCloud.writeCloudMonitor(connectionId, deviceId, message).then(() => {
  // Message sent to cloud monitor
});

ArduinoCloud.closeCloudMonitor(connectionId, deviceId).then(topic => {
  // Close cloud monitor
});

// Send a property value to a device
// - value can be a string, a boolean or a number
// - timestamp is a unix timestamp, not required
ArduinoCloud.sendProperty(connectionId, deviceId, name, value, timestamp).then(() => {
  // Property value sent
});

// Register a callback on a property value change
// 
ArduinoCloud.onPropertyValue(connectionId, deviceId, propertyName, updateCb).then(() => {
  // updateCb(message) will be called every time a new value is available. Value can be string, number, or a boolean depending on the property type
});

```

## Run tests
First of all you need a valid Hydra Arduino token, you can get it from [Arduino Create IoT Cloud](https://create.arduino.cc/cloud/)

Then you can use this token to run tests

```bash
$ TOKEN=YOUR_HYDRA_TOKEN_HERE npm run test
```

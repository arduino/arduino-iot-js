
[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![npm version](https://badge.fury.io/js/arduino-iot-js.svg)](https://badge.fury.io/js/arduino-iot-js)

# arduino-iot-js
## Introduction
This NPM module provides interaction with the Arduino IoT Cloud MQTT broker. It can be used both from the browser and node.js

The main features of this module are:
- Connection/disconnection to Arduino IoT Cloud Broker using WebSocket
- Send IoT Cloud *property* updates
- Listen for IoT Cloud *property*  updates made by other clients and/or devices

If you are looking for a way to create, read, update, delete resources like
- Devices 
- Things
- Properties
- Data Timeseries 

please check the official [Javascript Rest API client](https://www.npmjs.com/package/@arduino/arduino-iot-client).

If you want to learn more about Arduino IoT Cloud architecture, check the official [getting started documentation](https://www.arduino.cc/en/IoT/HomePage). 



## Installation

```bash
$ npm install arduino-iot-js
```

## How to use
The MQTT connection over Websocket relies on Username / Password authentication. Under the hood, this module uses your user ID (plus a timestamp) as *Username* and needs a valid JWT Token as *Password*. You can use either a valid JWT token or just your API Credentials (*clientId* and *clientSecret*).

### How to import arduino-iot-js in your project
Using a web application in the browser
```javascript
import { ArduinoIoTCloud } from 'arduino-iot-js'
```
Using nodejs
```javascript
const { ArduinoIoTCloud } = require('arduino-iot-js');
```

### How to connect to Arduino IoT Cloud broker using API Credentials
```javascript
const { ArduinoIoTCloud } = require('arduino-iot-js');

const options = {
    clientId: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    onDisconnect: message => {
        console.error(message);
    }
}

ArduinoIoTCloud.connect(options)
  .then(() => console.log("Connected to Arduino IoT Cloud broker"))
  .catch(error => console.error(error));
```

### How to listen for property value updates
After a successful connection, you can listen for property updates.
To do this you need:
- The ID of the *Thing* the *property* belongs to. You can list all your things and properties using the [Javascript Rest API client](https://www.npmjs.com/package/@arduino/arduino-iot-client), calling the [GET Things endpoint](https://www.arduino.cc/reference/en/iot/api/index.html#api-ThingsV2-thingsV2List)
- The *variable name* of the property you want to listen

```javascript
const { ArduinoIoTCloud } = require('arduino-iot-js');
const thingId = "THING_ID"
const variableName = "PROPERTY_NAME"

const options = {
    clientId: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    onDisconnect: message => {
        console.error(message);
    }
}

ArduinoIoTCloud.connect(options)
  .then(() => {
    console.log("Connected to Arduino IoT Cloud broker");
    return ArduinoIoTCloud.onPropertyValue(thingId, variableName, showUpdates = value => console.log(value));
  })
  .then(() => console.log("Callback registered"))
  .catch(error => console.log(error));
```
Each time a new value is sent from the Device, the `counterUpdates` callback will be called.

### How to disconnect from Arduino IoT Cloud Broker
```javascript
ArduinoCloud.disconnect()
  .then(() => console.log("Successfully disconnected"));
```
### How to send property values to the device
To do this you need:
- The ID of the *Thing* the *property* belongs to. You can list all your things and properties using the [Javascript Rest API client](https://www.npmjs.com/package/@arduino/arduino-iot-client),  calling the [GET Things endpoint](https://www.arduino.cc/reference/en/iot/api/index.html#api-ThingsV2-thingsV2List)
- The *variable name* of the property you want to set
- Value can be either a string, a boolean or a number
```javascript
const { ArduinoIoTCloud } = require('arduino-iot-js');
const thingId = "THING_ID"
const variableName = "PROPERTY_NAME"

const options = {
    clientId: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    onDisconnect: message => {
        console.error(message);
    }
}

ArduinoIoTCloud.connect(options).then(() => {
    console.log("Connected to Arduino IoT Cloud broker");
    ArduinoCloud.sendProperty(thingId, variableName, value).then(() => {
        console.log("Property value correctly sent");
    });    
});

```
### How to listen to every user properties updates
```javascript
const { ArduinoIoTCloud } = require('arduino-iot-js');
const ArduinoIoTApi = require('@arduino/arduino-iot-client');

const options = {
    clientId: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    onDisconnect:  message  => {
        console.error(message);
    }
}

// Connect to Arduino IoT Cloud MQTT Broker
ArduinoIoTCloud.connect(options)
  .then(() => {
    console.log("Connected to Arduino IoT Cloud MQTT broker");

    // Init Arduino API Client
    const ArduinoIoTClient = ArduinoIoTApi.ApiClient.instance;
    ArduinoIoTClient.authentications['oauth2'].accessToken = ArduinoIoTCloud.getToken();

    const thingsApi = new ArduinoIoTAPI.ThingsV2Api(ArduinoIoTClient);
    const propertiesAPI = new ArduinoIoTApi.PropertiesV2Api(ArduinoIoTClient);

    return thingsApi.thingsV2List()
      .then(things => {
        things.forEach(thing => {
          propertiesAPI.propertiesV2List(thing.id)
            .then(properties => {
              properties.forEach(property => {
                ArduinoIoTCloud.onPropertyValue(thing.id, property.variable_name,
                  showUpdates = value => console.log(property.variable_name + ": " + value))
                  .then(() => console.log("Callback registered for " + property.variable_name))
                  .catch(error => console.error(error));
              });
            })
            .catch(error => console.error(error));
        });
      });
  })
  .catch(error => console.error(error));
```

## Development

### Testing
In order to test the library you have to export a couple of environment variables and then
launch a specific `npm` script as follows:

```sh
$ export CLIENT_ID=<YOUR_CLIENT_ID>
$ export CLIENT_SECRET=<YOUR_CLIENT_SECRET>
$ npm run test
```

## Changelog
### [0.9.0] - 2023-01-16

#### Changed
A few development settings have been updated, this should not affect how the library works.
- 'mqtt' is imported differently if the library is used in the browser or in node.
  In browser we're using 'mqtt/dist/mqtt' because of some issues with React with some bundlers (namely, Parcel 2)
  
  See:

  [https://github.com/mqttjs/MQTT.js/issues/1412#issuecomment-1193363330](https://github.com/mqttjs/MQTT.js/issues/1412#issuecomment-1193363330)

  [https://github.com/mqttjs/MQTT.js/issues/1233](https://github.com/mqttjs/MQTT.js/issues/1233)

- updated README file with this changelog and some instructions about testing

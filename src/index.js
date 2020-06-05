/*
* Copyright 2018 ARDUINO SA (http://www.arduino.cc/)
* This file is part of arduino-iot-js.
* Copyright (c) 2018
* Authors: Fabrizio Mirabito
*
* This software is released under:
* The GNU General Public License, which covers the main part of
* arduino-iot-js
* The terms of this license can be found at:
* https://www.gnu.org/licenses/gpl-3.0.en.html
*
* You can be released from the requirements of the above licenses by purchasing
* a commercial license. Buying such a license is mandatory if you want to modify or
* otherwise use the software for commercial activities involving the Arduino
* software without disclosing the source code of your own applications. To purchase
* a commercial license, send an email to license@arduino.cc.
*
*/

/*
     SenML labels
     https://tools.ietf.org/html/draft-ietf-core-senml-16#section-4.3

     +---------------+-------+------------+------------+------------+
     |          Name | Label | CBOR Label | JSON Type  | XML Type   |
     +---------------+-------+------------+------------+------------+
     |     Base Name | bn    |         -2 | String     | string     |
     |     Base Time | bt    |         -3 | Number     | double     |
     |     Base Unit | bu    |         -4 | String     | string     |
     |    Base Value | bv    |         -5 | Number     | double     |
     |      Base Sum | bs    |         -6 | Number     | double     |
     |       Version | bver  |         -1 | Number     | int        |
     |          Name | n     |          0 | String     | string     |
     |          Unit | u     |          1 | String     | string     |
     |         Value | v     |          2 | Number     | double     |
     |  String Value | vs    |          3 | String     | string     |
     | Boolean Value | vb    |          4 | Boolean    | boolean    |
     |    Data Value | vd    |          8 | String (*) | string (*) |
     |     Value Sum | s     |          5 | Number     | double     |
     |          Time | t     |          6 | Number     | double     |
     |   Update Time | ut    |          7 | Number     | double     |
     +---------------+-------+------------+------------+------------+
*/

import Paho from 'paho-client';
import CBOR from '@arduino/cbor-js';

import ArduinoCloudError from './ArduinoCloudError';

let connection = null;
let connectionOptions = null;
const subscribedTopics = {};
const propertyCallback = {};
const arduinoCloudPort = 8443;
const arduinoCloudHost = 'wss.iot.arduino.cc';
const arduinoAuthURL = 'https://api2.arduino.cc';

const getUserId = (apiUrl, token) => fetch(apiUrl, {
  method: 'get',
  headers: new Headers({
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }),
}).then(res => res.json());


// Connect establishes a connection with mqtt, using token as the password, and returns a promise
// of a Symbol identifying the mqtt client
const connect = options => new Promise((resolve, reject) => {
  let ssl = false;
  if (options.ssl !== false) {
    ssl = true;
  }
  const opts = {
    host: options.host || arduinoCloudHost,
    port: options.port || arduinoCloudPort,
    apiUrl: options.apiUrl || arduinoAuthURL,
    ssl,
    token: options.token,
    onDisconnect: options.onDisconnect,
    onTrace: options.onTrace,
    onConnected: options.onConnected,
    useCloudProtocolV2: options.useCloudProtocolV2 || false,
  };

  connectionOptions = opts;

  if (connection) {
    return reject(new Error('connection failed: connection already open'));
  }

  if (!opts.host) {
    return reject(new Error('connection failed: you need to provide a valid host (broker)'));
  }

  if (!opts.token) {
    return reject(new Error('connection failed: you need to provide a valid token'));
  }

  if (!opts.apiUrl) {
    return reject(new Error('no apiUrl parameter is provided'));
  }

  return getUserId(`${opts.apiUrl}/users/v1/users/byID/me`, options.token).then((res) => {
    const clientID = `${res.id}:${new Date().getTime()}`;
    const client = new Paho.Client(opts.host, opts.port, clientID);
    client.topics = {};
    client.properties = {};

    client.onMessageArrived = (msg) => {
      if (msg.topic.indexOf('/s/o') > -1) {
        client.topics[msg.topic].forEach((cb) => {
          cb(msg.payloadString);
        });
      } else {
        const buf = new ArrayBuffer(msg.payloadBytes.length);
        const bufView = new Uint8Array(buf);
        for (let i = 0, strLen = msg.payloadBytes.length; i < strLen; i += 1) {
          bufView[i] = msg.payloadBytes[i];
        }

        const propertyValue = CBOR.decode(buf);
        const propertyNameId = 0;
        const attributeNameId = 1;

        let valueToSend = {};
        let propertyNameKeyPrevious = '';
        let propertyNameKey = '';
        propertyValue.forEach((p) => {
          // Support cbor labels
          propertyNameKey = p.n !== undefined ? p.n : p['0'];
          const propertyNameKeySplit = propertyNameKey.split(':');

          const valueKey = p.v !== undefined ? 'v' : '2';
          const valueStringKey = p.vs !== undefined ? 'vs' : '3';
          const valueBooleanKey = p.vb !== undefined ? 'vb' : '4';
          let value = null;
          propertyNameKey = propertyNameKeySplit[propertyNameId];
          if (propertyCallback[msg.topic][propertyNameKey]) {
            if (!(p[valueKey] === undefined)) {
              value = p[valueKey];
            } else if (!(p[valueStringKey] === undefined)) {
              value = p[valueStringKey];
            } else if (!(p[valueBooleanKey] === undefined)) {
              value = p[valueBooleanKey];
            }
          }
          if (propertyNameKeyPrevious === '') {
            propertyNameKeyPrevious = propertyNameKeySplit[propertyNameId];
          }
          if (propertyNameKeyPrevious !== propertyNameKey) {
            if (propertyCallback[msg.topic][propertyNameKeyPrevious]) {
              propertyCallback[msg.topic][propertyNameKeyPrevious](valueToSend);
            }
            propertyNameKeyPrevious = propertyNameKey;
            valueToSend = {};
          }
          if (propertyNameKeySplit.length === 1 && value !== null) {
            valueToSend = value;
          } else {
            const attributeName = propertyNameKeySplit[attributeNameId];
            valueToSend[attributeName] = value;
          }
        });
        if (valueToSend !== {} && propertyCallback[msg.topic][propertyNameKey]) {
          propertyCallback[msg.topic][propertyNameKey](valueToSend);
        }
      }
    };

    client.onConnected = (reconnect) => {
      const reconnectPromises = [];

      if (reconnect === true) {
        // This is a re-connection: re-subscribe to all topics subscribed before the
        // connection loss
        Object.values(subscribedTopics).forEach((subscribeParams) => {
          reconnectPromises.push(() => subscribe(subscribeParams.topic, subscribeParams.cb));
        });
      }

      return Promise.all(reconnectPromises)
        .then(() => {
          if (typeof opts.onConnected === 'function') {
            opts.onConnected(reconnect);
          }
        });
    };

    if (typeof onDisconnect === 'function') {
      client.onConnectionLost = opts.onDisconnect;
    }

    const connectionOpts = {
      useSSL: opts.ssl,
      timeout: 30,
      mqttVersion: 4,
      userName: res.id,
      // password: token,
      mqttVersionExplicit: true,
      // If reconnect is set to true, in the event that the connection is lost, the client will
      // attempt to reconnect to the server. It will initially wait 1 second before it attempts
      // to reconnect, for every failed reconnect attempt, the delay will double until it is at
      // 2 minutes at which point the delay will stay at 2 minutes.
      reconnect: true,
      keepAliveInterval: 30,
      onSuccess: () => {
        connection = client;
        return resolve();
      },
      onFailure: ({ errorCode, errorMessage }) => reject(
        new ArduinoCloudError(errorCode, errorMessage),
      ),
    };


    connectionOpts.password = opts.token;

    if (typeof opts.onTrace === 'function') {
      client.trace = (log) => {
        opts.onTrace(log);
      };
    }

    client.connect(connectionOpts);
  }, reject);
});

const disconnect = () => new Promise((resolve, reject) => {
  if (!connection) {
    return reject(new Error('disconnection failed: connection closed'));
  }

  try {
    connection.disconnect();
  } catch (error) {
    return reject(error);
  }

  // Remove the connection
  connection = null;

  // Remove property callbacks to allow resubscribing in a later connect()
  Object.keys(propertyCallback).forEach((topic) => {
    if (propertyCallback[topic]) {
      delete propertyCallback[topic];
    }
  });

  // Clean up subscribed topics - a new connection might not need the same topics
  Object.keys(subscribedTopics).forEach((topic) => {
    delete subscribedTopics[topic];
  });

  return resolve();
});

const updateToken = async function updateToken(token) {
  // This infinite loop will exit once the reconnection is successful -
  // and will pause between each reconnection tentative, every 5 secs.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      if (connection) {
        // Disconnect to the connection that is using the old token
        connection.disconnect();

        // Remove the connection
        connection = null;
      }

      // Reconnect using the new token
      const reconnectOptions = Object.assign({}, connectionOptions, { token });
      await connect(reconnectOptions);

      // Re-subscribe to all topics subscribed before the reconnection
      Object.values(subscribedTopics).forEach((subscribeParams) => {
        subscribe(subscribeParams.topic, subscribeParams.cb);
      });

      if (typeof connectionOptions.onConnected === 'function') {
        // Call the connection callback (with the reconnection param set to true)
        connectionOptions.onConnected(true);
      }

      // Exit the infinite loop
      return;
    } catch (error) {
      // Expose paho-mqtt errors
      // eslint-disable-next-line no-console
      console.error(error);

      // Something went wrong during the reconnection - retry in 5 secs.
      await new Promise((resolve) => {
        setTimeout(resolve, 5000);
      });
    }
  }
};

const subscribe = (topic, cb) => new Promise((resolve, reject) => {
  if (!connection) {
    return reject(new Error('subscription failed: connection closed'));
  }

  return connection.subscribe(topic, {
    onSuccess: () => {
      if (!connection.topics[topic]) {
        connection.topics[topic] = [];
      }
      connection.topics[topic].push(cb);
      return resolve(topic);
    },
    onFailure: error => reject(new Error(`subscription failed: ${error.errorMessage}`)),
  });
});

const unsubscribe = topic => new Promise((resolve, reject) => {
  if (!connection) {
    return reject(new Error('disconnection failed: connection closed'));
  }

  return connection.unsubscribe(topic, {
    onSuccess: () => resolve(topic),
    onFailure: () => reject(),
  });
});


const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const sendMessage = (topic, message) => new Promise((resolve, reject) => {
  if (!connection) {
    return reject(new Error('disconnection failed: connection closed'));
  }

  connection.publish(topic, message, 1, false);
  return resolve();
});

const openCloudMonitor = (deviceId, cb) => {
  const cloudMonitorOutputTopic = `/a/d/${deviceId}/s/o`;
  return subscribe(cloudMonitorOutputTopic, cb);
};

const writeCloudMonitor = (deviceId, message) => {
  const cloudMonitorInputTopic = `/a/d/${deviceId}/s/i`;
  return sendMessage(cloudMonitorInputTopic, message);
};

const closeCloudMonitor = (deviceId) => {
  const cloudMonitorOutputTopic = `/a/d/${deviceId}/s/o`;
  return unsubscribe(cloudMonitorOutputTopic);
};

const toCloudProtocolV2 = (cborValue) => {
  const cloudV2CBORValue = {};
  let cborLabel = null;

  Object.keys(cborValue).forEach((label) => {
    switch (label) {
      case 'bn':
        cborLabel = -2;
        break;
      case 'bt':
        cborLabel = -3;
        break;
      case 'bu':
        cborLabel = -4;
        break;
      case 'bv':
        cborLabel = -5;
        break;
      case 'bs':
        cborLabel = -6;
        break;
      case 'bver':
        cborLabel = -1;
        break;
      case 'n':
        cborLabel = 0;
        break;
      case 'u':
        cborLabel = 1;
        break;
      case 'v':
        cborLabel = 2;
        break;
      case 'vs':
        cborLabel = 3;
        break;
      case 'vb':
        cborLabel = 4;
        break;
      case 'vd':
        cborLabel = 8;
        break;
      case 's':
        cborLabel = 5;
        break;
      case 't':
        cborLabel = 6;
        break;
      case 'ut':
        cborLabel = 7;
        break;
      default:
        cborLabel = label;
    }

    cloudV2CBORValue[cborLabel] = cborValue[label];
  });

  return cloudV2CBORValue;
};

const sendProperty = (thingId, name, value, timestamp) => {
  const propertyInputTopic = `/a/t/${thingId}/e/i`;

  if (timestamp && !Number.isInteger(timestamp)) {
    throw new Error('Timestamp must be Integer');
  }

  if (name === undefined || typeof name !== 'string') {
    throw new Error('Name must be a valid string');
  }

  if (typeof value === 'object') {
    const objectKeys = Object.keys(value);
    const cborValues = objectKeys.map((key, i) => {
      const cborValue = {
        n: `${name}:${key}`,
      };

      if (i === 0) {
        cborValue.bt = timestamp || new Date().getTime();
      }

      switch (typeof value[key]) {
        case 'string':
          cborValue.vs = value[key];
          break;
        case 'number':
          cborValue.v = value[key];
          break;
        case 'boolean':
          cborValue.vb = value[key];
          break;
        default:
          break;
      }

      return cborValue;
    })
      .map((cborValue) => {
        if (connectionOptions.useCloudProtocolV2) {
          return toCloudProtocolV2(cborValue);
        }

        return cborValue;
      });

    return sendMessage(propertyInputTopic, CBOR.encode(cborValues, true));
  }

  let cborValue = {
    bt: timestamp || new Date().getTime(),
    n: name,
  };

  switch (typeof value) {
    case 'string':
      cborValue.vs = value;
      break;
    case 'number':
      cborValue.v = value;
      break;
    case 'boolean':
      cborValue.vb = value;
      break;
    default:
      break;
  }

  if (connectionOptions.useCloudProtocolV2) {
    cborValue = toCloudProtocolV2(cborValue);
  }

  return sendMessage(propertyInputTopic, CBOR.encode([cborValue], true));
};

const getSenml = (deviceId, name, value, timestamp) => {
  if (timestamp && !Number.isInteger(timestamp)) {
    throw new Error('Timestamp must be Integer');
  }

  if (name === undefined || typeof name !== 'string') {
    throw new Error('Name must be a valid string');
  }


  if (typeof value === 'object') {
    const objectKeys = Object.keys(value);
    const senMls = objectKeys.map((key, i) => {
      const senMl = {
        n: `${name}:${key}`,
      };

      if (i === 0) {
        senMl.bt = timestamp || new Date().getTime();

        if (deviceId) {
          senMl.bn = `urn:uuid:${deviceId}`;
        }
      }

      switch (typeof value[key]) {
        case 'string':
          senMl.vs = value[key];
          break;
        case 'number':
          senMl.v = value[key];
          break;
        case 'boolean':
          senMl.vb = value[key];
          break;
        default:
          break;
      }

      return senMl;
    })
      .map((senMl) => {
        if (connectionOptions.useCloudProtocolV2) {
          return toCloudProtocolV2(senMl);
        }

        return senMl;
      });

    return senMls;
  }

  const senMl = {
    bt: timestamp || new Date().getTime(),
    n: name,
  };

  if (deviceId) {
    senMl.bn = `urn:uuid:${deviceId}`;
  }

  switch (typeof value) {
    case 'string':
      senMl.vs = value;
      break;
    case 'number':
      senMl.v = value;
      break;
    case 'boolean':
      senMl.vb = value;
      break;
    default:
      break;
  }

  if (connectionOptions.useCloudProtocolV2) {
    return toCloudProtocolV2(senMl);
  }

  return senMl;
};

const getCborValue = (senMl) => {
  const cborEncoded = CBOR.encode(senMl);
  return arrayBufferToBase64(cborEncoded);
};

const sendPropertyAsDevice = (deviceId, thingId, name, value, timestamp) => {
  const propertyInputTopic = `/a/t/${thingId}/e/o`;

  if (timestamp && !Number.isInteger(timestamp)) {
    throw new Error('Timestamp must be Integer');
  }

  if (name === undefined || typeof name !== 'string') {
    throw new Error('Name must be a valid string');
  }

  const senMlValue = getSenml(deviceId, name, value, timestamp);
  return sendMessage(propertyInputTopic, CBOR.encode([senMlValue]));
};

const onPropertyValue = (thingId, name, cb) => {
  if (!name) {
    throw new Error('Invalid property name');
  }
  if (typeof cb !== 'function') {
    throw new Error('Invalid callback');
  }
  const propOutputTopic = `/a/t/${thingId}/e/o`;

  subscribedTopics[thingId] = {
    topic: propOutputTopic,
    cb,
  };

  if (!propertyCallback[propOutputTopic]) {
    propertyCallback[propOutputTopic] = {};
    propertyCallback[propOutputTopic][name] = cb;
    return subscribe(propOutputTopic, cb);
  }

  if (propertyCallback[propOutputTopic] && !propertyCallback[propOutputTopic][name]) {
    propertyCallback[propOutputTopic][name] = cb;
  }
  return Promise.resolve(propOutputTopic);
};

const removePropertyValueCallback = (thingId, name) => {
  if (!name) {
    throw new Error('Invalid property name');
  }
  const propOutputTopic = `/a/t/${thingId}/e/o`;
  delete propertyCallback[propOutputTopic][name];
  return Promise.resolve(propOutputTopic);
};


export default {
  connect,
  disconnect,
  updateToken,
  subscribe,
  unsubscribe,
  sendMessage,
  openCloudMonitor,
  writeCloudMonitor,
  closeCloudMonitor,
  sendProperty,
  sendPropertyAsDevice,
  onPropertyValue,
  removePropertyValueCallback,
  getCborValue,
  getSenml,
  ArduinoCloudError,
};

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
const ArduinoCloud = require('../dist/index.js');

const deviceId = '1f4ced70-53ad-4b29-b221-1b0abbdfc757';
const thingId = '2cea8542-d472-4464-859c-4ef4dfc7d1d3';
const propertyIntName = 'integer';
const propertyIntValue = 22;

const propertyFloatName = 'float';
const propertyFloatVal = 22.5;

const propertyStrName = 'string';
const propertyStrVal = 'ok';

const propertyBoolName = 'boolean';
const propertyBoolVal = true;

it('ArduinoCloud connection', (done) => {
  /* global token */
  ArduinoCloud.connect({
    token,
    onDisconnect: (message) => {
      if (message.errorCode !== 0) {
        throw Error(message);
      }
    },
  })
    .then(() => {
      done();
    })
    .catch((error) => {
      throw new Error(error);
    });
});

it('Property name must be a string in sendProperty', (done) => {
  try {
    ArduinoCloud.sendProperty(deviceId, undefined, propertyIntValue);
  } catch (error) {
    if (error.message === 'Name must be a valid string') {
      done();
    }
  }
});

it('Simulate client write to cloud monitor', (done) => {
  ArduinoCloud.writeCloudMonitor(deviceId, `this is a test ${Math.random()}`).then(() => {
    done();
  }, (error) => {
    throw new Error(error);
  });
});

it('Simulate device write to cloud monitor', (done) => {
  const cloudMonitorInputTopic = `/a/d/${deviceId}/s/o`;
  ArduinoCloud.sendMessage(cloudMonitorInputTopic, `this is a test ${Math.random()}`).then(() => {
    done();
  }, (error) => {
    throw new Error(error);
  });
});

it('Simulate device write and client read his message from cloud monitor', (done) => {
  const cloudMonitorInputTopic = `/a/d/${deviceId}/s/o`;

  const cb = () => {
    // console.log(`[${new Date()}] Message from monitor: ${message}`);
    done();
  };

  ArduinoCloud.openCloudMonitor(deviceId, cb).then(() => {
    // console.log(`Subscribed to topic: ${topic}`);
    const message = `This is a test ${new Date()}`;
    ArduinoCloud.sendMessage(cloudMonitorInputTopic, message).then(() => {
    // console.log(`[${new Date()}] Message sent to monitor: [${message}]`);
    }, (error) => {
      throw new Error(error);
    });
  }, (error) => {
    throw new Error(error);
  });
});

it('Simulate client read integer property sent by device', (done) => {
  ArduinoCloud.onPropertyValue(thingId, propertyIntName, (value) => {
    if (value === propertyIntValue) {
      done();
    }
  }).then(() => {
    ArduinoCloud.sendPropertyAsDevice(deviceId, thingId, propertyIntName, propertyIntValue);
  });
});

it('Simulate client read float property sent by device', (done) => {
  ArduinoCloud.onPropertyValue(thingId, propertyFloatName, (value) => {
    if (value === propertyFloatVal) {
      done();
    }
  }).then(() => {
    ArduinoCloud.sendPropertyAsDevice(deviceId, thingId, propertyFloatName, propertyFloatVal);
  });
});

it('Simulate client read string property sent by device', (done) => {
  ArduinoCloud.onPropertyValue(thingId, propertyStrName, (value) => {
    if (value === propertyStrVal) {
      done();
    }
  }).then(() => {
    ArduinoCloud.sendPropertyAsDevice(deviceId, thingId, propertyStrName, propertyStrVal);
  });
});

it('Simulate client read boolean property sent by device', (done) => {
  ArduinoCloud.onPropertyValue(thingId, propertyBoolName, (value) => {
    if (value === propertyBoolVal) {
      ArduinoCloud.disconnect();
      done();
    }
  }).then(() => {
    ArduinoCloud.sendPropertyAsDevice(deviceId, thingId, propertyBoolName, propertyBoolVal);
  });
});

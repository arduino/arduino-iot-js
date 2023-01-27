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
const { ArduinoIoTCloud, SenML } = require('../lib/index.js');

const deviceId = '1e5b4cdd-57da-4c68-9dfd-439e493f7c79';
const thingId = '82b903fe-4387-47ed-a503-201619b949fe';
const propertyIntName = 'integer';
const propertyIntValue = 22;

const propertyFloatName = 'float';
const propertyFloatVal = 22.5;

const propertyStrName = 'string';
const propertyStrVal = 'ok';

const propertyBoolName = 'boolean';
const propertyBoolVal = true;

describe('Test the library basic functionalities', () => {
  it('ArduinoCloud connection', (done) => {
    /* global token */
    ArduinoIoTCloud.connect({
      clientId,    
      clientSecret,
      onDisconnect: (message) => {
        if (message.errorCode !== 0) {
          throw Error(message);
        }
      },
    })
      .then(() => done());
  });

  afterEach(() => {
    ArduinoIoTCloud.disconnect();
  })

  describe("when connected", () => {
    beforeEach((done) => {
      ArduinoIoTCloud.connect({ 
        clientId,    
        clientSecret,
      }).then(() => done());
    })

    it('Property name must be a string in sendProperty', (done) => {
      ArduinoIoTCloud.sendProperty(deviceId, undefined, propertyIntValue)
        .catch(error => {
          if (error.message === 'Name must be a valid string') {
            done();
          }
        })
    });

    it('Simulate device write to cloud monitor', () => {
      return ArduinoIoTCloud.sendMessage(`/a/d/${deviceId}/s/o`, `this is a test ${Math.random()}`);
    });

    it('Simulate client read integer property sent by device', async (done) => {
      await ArduinoIoTCloud.onPropertyValue(thingId, propertyIntName, (value) => value === propertyIntValue ? done() : null);
      sendPropertyAsDevice(deviceId, thingId, propertyIntName, propertyIntValue);
    });

    it('Simulate client read float property sent by device', async (done) => {
      await ArduinoIoTCloud.onPropertyValue(thingId, propertyFloatName, (value) => value === propertyFloatVal ? done() : null);
      sendPropertyAsDevice(deviceId, thingId, propertyFloatName, propertyFloatVal);
    });

    it('Simulate client read string property sent by device', async (done) => {
      await ArduinoIoTCloud.onPropertyValue(thingId, propertyStrName, (value) => value === propertyStrVal ? done() : null);
      sendPropertyAsDevice(deviceId, thingId, propertyStrName, propertyStrVal);
    });

    it('Simulate client read boolean property sent by device', async (done) => {
      await ArduinoIoTCloud.onPropertyValue(thingId, propertyBoolName, (value) => value === propertyBoolVal ? done() : null);
      sendPropertyAsDevice(deviceId, thingId, propertyBoolName, propertyBoolVal);
    });

    it('Simulate client read boolean as FALSE property sent by device', async (done) => {
      await ArduinoIoTCloud.onPropertyValue(thingId, propertyBoolName, (value) => !value ? done() : null);
      sendPropertyAsDevice(deviceId, thingId, propertyBoolName, false);
    });

  })
});


const sendPropertyAsDevice = (deviceId, thingId, name, value, timestamp = new Date().getTime()) => {
  if (timestamp && !Number.isInteger(timestamp)) throw new Error('Timestamp must be Integer');
  if (name === undefined || typeof name !== 'string') throw new Error('Name must be a valid string');

  const senMlValue = SenML.parse(name, value, timestamp, false, deviceId);
  return ArduinoIoTCloud.sendMessage(`/a/t/${thingId}/e/o`, SenML.CBOR.encode([senMlValue]));
};

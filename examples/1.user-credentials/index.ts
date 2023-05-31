import { ArduinoIoTCloud } from 'arduino-iot-js';
import ArduinoIoTAPI from '@arduino/arduino-iot-client';

(async () => {
  const client = await ArduinoIoTCloud.connect({
    clientId: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    onDisconnect: message => console.error(message),
  });

  const api = ArduinoIoTAPI.ApiClient.instance;
  api.authentications['oauth2'].accessToken = ArduinoIoTCloud.getToken();
  
  const thingsAPI = new ArduinoIoTAPI.ThingsV2Api(api);
  const propertiesAPI = new ArduinoIoTAPI.PropertiesV2Api(api);

  const things = await thingsAPI.thingsV2List();

  things.forEach((t) => propertiesAPI.propertiesV2List(t.id)
    .then((properties) => {
      properties.forEach((p) => {
        client.onPropertyValue(t.id, p.variable_name, (value) => console.log(`${p.variable_name}:${value}`))
      });
  }));
})();

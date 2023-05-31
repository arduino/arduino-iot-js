import { ArduinoIoTCloud } from 'arduino-iot-js';

(async () => {
  const client = await ArduinoIoTCloud.connect({
    deviceId: "YOUR_DEVICE_ID",
    secretKey: "YOUR_SECRET_KEY",
    onDisconnect: message => console.error(message),
  });

  client.onPropertyValue('aPropertyName', (v) => console.log(`aPropertyName: ${v}`));

  setInterval(() => {
    client.sendProperty('time', new Date().getTime());
  }, 1000);
})();

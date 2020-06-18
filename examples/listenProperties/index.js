const { ArduinoIoTCloud } = require('arduino-iot-js');
const ArduinoIoTAPI = require('@arduino/arduino-iot-client');

options = {
    clientId: "YOUR_CLIENT_ID",
    clientSecret: "YOUR_CLIENT_SECRET",
    onDisconnect: message => {
		console.error(message);
	}
}

// Connect to Arduino IoT Cloud MQTT Broker
ArduinoIoTCloud.connect(options).then(() => {
    console.log("Connected to Arduino IoT Cloud MQTT broker");

    // Init Arduino API Client
    const ArduinoIoTClient = ArduinoIoTAPI.ApiClient.instance;
    ArduinoIoTClient.authentications['oauth2'].accessToken = ArduinoIoTCloud.getToken();
    
    const thingsAPI = new ArduinoIoTAPI.ThingsV2Api(ArduinoIoTClient);
    const propertiesAPI = new ArduinoIoTAPI.PropertiesV2Api(ArduinoIoTClient);
    thingsAPI.thingsV2List().then(things => {
        things.forEach(thing => {
            propertiesAPI.propertiesV2List(thing.id).then(properties => {
                properties.forEach(property => {
                    ArduinoIoTCloud.onPropertyValue(thing.id, property.variable_name, update = value => {
                        console.log(property.variable_name+": "+value)
                    }).then(() => {
                        console.log("Callback registered for "+property.variable_name);
                    });
                });
            })
        });
    }, error => {
        console.log(error)
    });
}); 
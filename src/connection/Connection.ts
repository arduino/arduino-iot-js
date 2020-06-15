import jws from 'jws';
import mqtt from 'mqtt';
import CBOR from '@arduino/cbor-js';
import { Observable, Subject } from "rxjs";
import { toArrayBuffer } from "../utils/Utils";

export type CloudMessageValue = string | number | boolean | object;
export type CloudMessage = { topic: string; propertyName?: string; value: CloudMessageValue };
export type Connection = mqtt.MqttClient & { messages?: Observable<CloudMessage> };

export namespace Connection {
  export function From(host: string, port: string | number, token: string): Connection {
    const connection: Connection = mqtt.connect(`wss://${host}:${port}/mqtt`, optionsFrom(token));
    const messages = connection.messages = new Subject<CloudMessage>();

    connection.on('message', (topic, msg) => {
      if (topic.indexOf('/s/o') > -1) messages.next({ topic, value: msg.toString() });
      else messagesFrom(topic, msg).forEach((m) => messages.next(m));
    });

    return connection;
  }

  function messagesFrom(topic: string, msg: Buffer): CloudMessage[] {
    let current = '';
    let attribute = '';
    let previous = '';
    let valueToSend: CloudMessageValue = {};
  
    const messages: CloudMessage[] = [];
    const properties = CBOR.decode(toArrayBuffer(msg));
  
    properties.forEach((p) => {
      const value = valueFrom(p);
      [current, attribute] = nameFrom(p).split(':');
      if (previous === '') previous = current;
  
      if (previous !== current) {
        messages.push({ topic, propertyName: previous, value: valueToSend })
        previous = current;
        valueToSend = {};
      }
  
      if (attribute) valueToSend[attribute] = value;
      else valueToSend = value
    });
  
    if (valueToSend !== {}) messages.push({ topic, propertyName: current, value: valueToSend })
  
    return messages;
  }

  function optionsFrom(token: string): mqtt.IClientOptions {
    const userId = jws.decode(token).payload['http://arduino.cc/id'];
    return {
      clientId: `${userId}:${new Date().getTime()}`,
      username: userId,
      password: token,
      properties: {},
      protocolVersion: 4,
      connectTimeout: 30000,
      keepalive: 30,
      clean: true,
    };
  };
}


function isPropertyValue(message: CBOR.CBORValue | string[]): message is CBOR.CBORValue {
  return !!(message as CBOR.CBORValue).n;
}

function valueFrom(message: CBOR.CBORValue | string[]): CloudMessageValue {
  return isPropertyValue(message)
    ? message.v || message.vs || message.vb
    : message[2] || message[3] || message[4];
}

function nameFrom(property: CBOR.CBORValue | string[]): string {
  return isPropertyValue(property) ? property.n : property[0]
}

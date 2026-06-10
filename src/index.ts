/*
 * Copyright 2023 ARDUINO SA (http://www.arduino.cc/)
 * This file is part of arduino-iot-js.
 * Copyright (c) 2023
 * Authors: Fabrizio Mirabito, Francesco Pirrotta
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

import * as SenML from './senML';
import { createArduinoCloud } from './connect';

/** Default entry point. Use `createArduinoCloud({ mqttConnect })` to override deps. */
const ArduinoIoTCloud = createArduinoCloud();

export { SenML };
export { ArduinoIoTCloud, createArduinoCloud };

export type { ArduinoCloudDeps } from './connect';
export type { CloudOptions, ConnectOptions, TokenOptions, APIOptions, CredentialsOptions } from './options';
export type { MqttConnectFn } from './transport/MqttTransport';
export type { CloudMessage, CloudMessageValue, MqttOptions } from './transport/types';
export type { MqttClient } from './mqtt/MqttClient';
export type { ActiveConnection } from './connection/ActiveConnection';
export type { UserConnection } from './connection/UserConnection';
export type { DeviceConnection } from './connection/DeviceConnection';
export type { Property, PropertyListener } from './connection/Property';
export type { Subscription } from './connection/Subscription';

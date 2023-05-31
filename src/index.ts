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

import 'whatwg-fetch';
import mqtt from 'mqtt';

import * as SenML from './senML';
import { ArduinoIoTCloudFactory } from './ArduinoIoTCloud';
import { HttpClientFactory } from './http/HttpClientFactory';
import { APIClientBuilder } from './builder/APIClientBuilder';
import { TokenClientBuilder } from './builder/TokenClientBuilder';
import { CredentialsClientBuilder } from './builder/CredentialsClientBuilder';

const builders = [
  new TokenClientBuilder(mqtt.connect),
  new CredentialsClientBuilder(mqtt.connect),
  new APIClientBuilder(HttpClientFactory.Create(fetch), mqtt.connect),
];

const ArduinoIoTCloud = ArduinoIoTCloudFactory(builders);

export { SenML };
export { ArduinoIoTCloud };
export { CloudOptions } from './CloudOptions';
export { CloudMessageValue } from './client/ICloudClient';

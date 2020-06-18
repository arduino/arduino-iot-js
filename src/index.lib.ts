/*
* Copyright 2020 ARDUINO SA (http://www.arduino.cc/)
* This file is part of arduino-iot-js.
* Copyright (c) 2020
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

import SenML from './senML';
import fetch from "node-fetch";
import { HttpClientFactory } from './http/HttpClientFactory';
import { CloudClient } from "./client/CloudClient";
import { APIConnectionBuilder } from "./builder/APIConnectionBuilder";
import { TokenConnectionBuilder } from "./builder/TokenConnectionBuilder";

const builders = [new TokenConnectionBuilder(), new APIConnectionBuilder(HttpClientFactory.Create(fetch))];
const ArduinoIoTCloud = new CloudClient(builders);

export { SenML };
export { ArduinoIoTCloud };
export { CloudOptions, CloudMessageValue } from "./client/ICloudClient";

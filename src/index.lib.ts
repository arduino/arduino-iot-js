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

import { APIConnection } from "./connection/APIConnection";
import { ArduinoCloudClient } from "./client/ArduinoCloudClient";

const DefaultClient = new ArduinoCloudClient(APIConnection.From);

export default DefaultClient;

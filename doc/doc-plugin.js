/*
 * Copyright DataStax, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * Name of the doclets and the maximum amount of occurrences.
 * @private
 */
const filterDoclets = {
  'module:types': 1
};
const filtered = {};

exports.handlers = {
  newDoclet: function (e) {

    const key = e.doclet.longname;
    if (!key) {
      return;
    }

    const maxLength = filterDoclets[key];
    if (maxLength === undefined ) {
      return;
    }

    filtered[key] = filtered[key] || 0;

    if (filtered[key]++ < maxLength) {
      return;
    }

    e.doclet.access = 'private';
  }
};
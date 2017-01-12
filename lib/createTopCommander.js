"use strict";

var TopCommander = require("./TopCommander");

module.exports = function createTopCommander(options) {
  return new TopCommander(options);
};

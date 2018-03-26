#!/usr/bin/env node
'use strict';

var fs = require('fs');
var Slacker = require('./Slacker');
var configPath = process.env.HOME + '/.config/slackadaisical/config.json';
var values = require('object.values');

if (!Object.values) {
    values.shim();
}

var config = null;

try {
    var rawData = fs.readFileSync(configPath).toString().trim();
    config = JSON.parse(rawData);
} catch (e) {
    console.log("Exception reading config at " + configPath + "\n" + e);
    process.exit(1);
}

var app = new Slacker(config);
app.init();
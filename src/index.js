#!/usr/bin/env node

const fs = require('fs');
const Slacker = require('./Slacker');
const configPath = process.env.HOME + '/.config/slackadaisical/config.json';
const values = require('object.values');

if (!Object.values) {
    values.shim();
}

let config = null;

try {
    let rawData = fs.readFileSync(configPath).toString().trim();
    config = JSON.parse(rawData);
} catch (e) {
    console.log("Could not find a slack config at " + e);
    process.exit(1);
}

const app = new Slacker(config);
app.init();



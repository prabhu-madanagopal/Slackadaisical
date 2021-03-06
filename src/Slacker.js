
const blessed = require('blessed');
const SlackAPI = require('./SlackAPI');
const ChannelsList = require('./ChannelsList');
const ChannelBox = require('./Channel');
const moment = require('moment');

var child_process = require('child_process');

export default class Slacker {

    constructor(config) {
        this.config = config;

        this.screen = blessed.screen({
            smartCSR: true,
            log: '/tmp/slacker.log',
            debug: true,
            dockBorders: true,
            autoPadding: true,
            ignoreDockContrast: true,
            fullUnicode: true,
        });

        let token = this.getStdout(this.config.tokenCommand);

        this.api = new SlackAPI(token, this.screen);
        this.channelsList = new ChannelsList(this.screen, this.api, this.config);
        this.channel = null;
        this.channelBox = null;

        this.screen.log(moment().format() + ": Slacker Init");
    }

    getStdout(cmd) {
        let stdout = child_process.execSync(cmd);
        return stdout.toString().trim();
    }

    changeChannel(channel) {
        this.channel = channel;

        if (this.channelBox) {
            this.channelBox.destroy();
            this.channelBox = null;
        }

        this.channelBox = new ChannelBox(this.channel, this.screen, this.api, this.config);

    }

    init() {

        this.screen.key(['escape', 'C-c'], function(ch, key) {
            return process.exit(0);
        });

        this.screen.key(['C-l'], (ch, key) => {
            if (this.channelsList) {
                this.channelsList.box.focus();
            }
        });

        this.screen.key(['C-o'], (ch, key) => {
            if (this.channelBox && this.channelBox.messageForm && this.channelBox.messageForm.textbox) {
                this.channelBox.messageForm.textbox.focus();
            }
        });

        this.screen.key(['C-y'], (ch, key) => {
            if (this.channelBox && this.channelBox.messagesList && this.channelBox.messagesList.box) {
                this.channelBox.messagesList.box.focus();
            }
        });

        this.channelsList.on('select_channel', (ch) => {
            this.changeChannel(ch);
        });

        this.channelsList.init();
        this.channelsList.box.focus();
    }

}

module.exports = Slacker;

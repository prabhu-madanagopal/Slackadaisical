'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var blessed = require('blessed');
var SlackAPI = require('./SlackAPI');
var ChannelsList = require('./ChannelsList');
var ChannelBox = require('./Channel');
var moment = require('moment');

var child_process = require('child_process');

var Slacker = function () {
    function Slacker(config) {
        _classCallCheck(this, Slacker);

        this.config = config;

        this.screen = blessed.screen({
            smartCSR: true,
            log: '/tmp/slacker.log',
            debug: true,
            dockBorders: true,
            autoPadding: true,
            ignoreDockContrast: true,
            fullUnicode: true
        });

        var token = this.getStdout(this.config.tokenCommand);

        this.api = new SlackAPI(token, this.screen);
        this.channelsList = new ChannelsList(this.screen, this.api, this.config);
        this.channel = null;
        this.channelBox = null;

        this.screen.log(moment().format() + ": Slacker Init");
    }

    _createClass(Slacker, [{
        key: 'getStdout',
        value: function getStdout(cmd) {
            var stdout = child_process.execSync(cmd);
            return stdout.toString().trim();
        }
    }, {
        key: 'changeChannel',
        value: function changeChannel(channel) {
            this.channel = channel;

            if (this.channelBox) {
                this.channelBox.destroy();
                this.channelBox = null;
            }

            this.channelBox = new ChannelBox(this.channel, this.screen, this.api, this.config);
        }
    }, {
        key: 'init',
        value: function init() {
            var _this = this;

            this.screen.key(['escape', 'C-c'], function (ch, key) {
                return process.exit(0);
            });

            this.screen.key(['C-l'], function (ch, key) {
                if (_this.channelsList) {
                    _this.channelsList.box.focus();
                }
            });

            this.screen.key(['C-o'], function (ch, key) {
                if (_this.channelBox && _this.channelBox.messageForm && _this.channelBox.messageForm.textbox) {
                    _this.channelBox.messageForm.textbox.focus();
                }
            });

            this.screen.key(['C-y'], function (ch, key) {
                if (_this.channelBox && _this.channelBox.messagesList && _this.channelBox.messagesList.box) {
                    _this.channelBox.messagesList.box.focus();
                }
            });

            this.channelsList.on('select_channel', function (ch) {
                _this.changeChannel(ch);
            });

            this.channelsList.init();
            this.channelsList.box.focus();
        }
    }]);

    return Slacker;
}();

exports.default = Slacker;


module.exports = Slacker;
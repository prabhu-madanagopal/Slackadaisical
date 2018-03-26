'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var blessed = require('blessed');
var wrap = require('word-wrap');
var moment = require('moment');

var MessagesList = function () {
    function MessagesList(channel) {
        _classCallCheck(this, MessagesList);

        this.channel = channel;
        this.screen = this.channel.screen;
        this.api = this.channel.api;
        this.config = this.channel.config;

        this.exists = true;

        this.box = blessed.box({
            parent: this.channel.box,
            top: 'top',
            label: this.api.getChannelDisplayName(this.channel.channel) + ' (Ctrl-y)',
            left: '0%',
            width: '100%',
            height: '100%-4',
            tags: true,
            scrollable: true,
            alwaysScroll: true,
            input: true,
            mouse: true,
            vi: true,
            border: {
                type: 'line'
            },
            style: {
                focus: {
                    border: {
                        fg: this.config.style.focus.border.fg
                    }
                }
            },
            keys: true,
            scrollbar: {
                ch: " ",
                inverse: true
            }
        });

        this.messages = [];

        this.init();

        this.loadHistory = this.loadHistory.bind(this);
    }

    _createClass(MessagesList, [{
        key: 'getUserReplacementMap',
        value: function getUserReplacementMap() {
            var _this = this;

            var map = {};
            Object.values(this.api.users).forEach(function (u) {
                map['@' + u.id] = '@' + _this.api.getUserName(u.id);
            });
            return map;
        }
    }, {
        key: 'init',
        value: function init() {
            this.refresh();
            this.api.on('receive message', this.receiveMessage.bind(this));
        }
    }, {
        key: 'receiveMessage',
        value: function receiveMessage(obj) {
            if (!this.exists) return null;
            if (obj.channel === this.channel.channel.id) {
                this.messages.push(obj);
                this.render();
            }
        }
    }, {
        key: 'refresh',
        value: function refresh() {
            var _this2 = this;

            this.api.fetchChannelHistory(this.channel.channel, function (history) {
                _this2.loadHistory(history);
            });
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            this.api.removeAllListeners('receive message');
            this.exists = false;
            this.box.destroy();
        }
    }, {
        key: 'render',
        value: function render() {
            var _this3 = this;

            // prevent against
            if (!this.box) return null;
            var lines = [];
            var width = parseInt(this.box.width) - 15;
            var userMap = this.getUserReplacementMap();
            var lastUserName = "";
            var lastDate = "";
            var userColorsMap = {};
            var userColorIndex = 0;
            this.messages.filter(function (m) {
                return m.type === 'message';
            }).forEach(function (m) {
                var userName = typeof m.user !== 'undefined' ? _this3.api.getUserName(m.user) : m.username ? m.username : 'Unknown User';
                var time = moment.unix(m.ts);
                var formattedTime = time.format('h:mma');
                var formattedDate = time.format('ddd, MMM Do');
                var text = m.text ? m.text : JSON.stringify(m);
                var content = "";
                var isSameOrigin = false;
                var isSameDay = true;
                var color = 'green';
                if (userName === _this3.config.messageList.userName) {
                    color = _this3.config.messageList.userColor;
                } else {
                    var colorIndex = userColorsMap[userName];
                    if (typeof colorIndex === 'undefined') {
                        colorIndex = userColorIndex % _this3.config.messageList.userColors.length;
                        userColorsMap[userName] = colorIndex;
                        userColorIndex++;
                    }
                    color = _this3.config.messageList.userColors[colorIndex];
                }
                if (lastDate !== formattedDate) {
                    content = '{underline}{default-fg}' + formattedDate + ':{/default-fg}{/underline}' + "\n\n";
                    isSameDay = false;
                }
                if (userName === lastUserName) {
                    isSameOrigin = true;
                    content = content + text;
                } else {
                    content = content + '{' + color + '-fg}' + userName + '{/' + color + '-fg} ' + '{cyan-fg}' + formattedTime + "{/cyan-fg}: \n" + text;
                }
                for (var replaceId in userMap) {
                    var replaceName = userMap[replaceId];
                    content = content.replace(replaceId, replaceName);
                }
                var wrapped = "";
                if (isSameOrigin && isSameDay) {
                    wrapped = wrap(content, { width: width });
                } else {
                    wrapped = "\n" + wrap(content, { width: width });
                }
                var exploded = wrapped.split("\n");
                lines = lines.concat(exploded);
                lastUserName = userName;
                lastDate = formattedDate;
            });

            this.box.setContent(lines.join("\n") + "\n");
            this.box.setScrollPerc(100);
            this.screen.render();
        }
    }, {
        key: 'loadHistory',
        value: function loadHistory(body) {
            if (body.ok) {
                this.messages = body.messages.slice(0).reverse();
                this.screen.log("MessagesList: Attempt to mark channel " + this.channel.channel.id + " read");
                this.api.markChannelRead(this.channel.channel);
            } else {
                this.messages = [{
                    text: 'Trouble loading this room. Error message was: ' + body.error + '. Try again later.',
                    username: 'Slacker App',
                    type: 'message',
                    ts: Date.now() / 1000
                }];
            }
            this.render();
        }
    }]);

    return MessagesList;
}();

exports.default = MessagesList;


module.exports = MessagesList;
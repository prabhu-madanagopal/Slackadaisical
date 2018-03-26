'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var EventEmitter = require('events').EventEmitter;
var blessed = require('blessed');

var SHOULD_FETCH_HISTORIES = false;
// how long before an individual channel history, once fetched,
// should be refreshed (updates unread_count_display but not unread * flag)
var REFRESH_TTL = 5 * 60 * 1000;
// how often should the refresh job, which only refreshes REFRESH_CHANNEL_LIMIT channels, runs
var REFRESH_INTERVAL = 1 * 1000;
// how many channels to refresh at a time.
var REFRESH_CHANNEL_LIMIT = 3;

var shuffle = function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var _ref = [a[j], a[i]];
        a[i] = _ref[0];
        a[j] = _ref[1];
    }
};

var ChannelsList = function (_EventEmitter) {
    _inherits(ChannelsList, _EventEmitter);

    function ChannelsList(screen, api, config) {
        _classCallCheck(this, ChannelsList);

        var _this = _possibleConstructorReturn(this, (ChannelsList.__proto__ || Object.getPrototypeOf(ChannelsList)).call(this));

        _this.selectedChannelId = null;
        _this.screen = screen;
        _this.api = api;
        _this.config = config;
        _this.channels = [];

        _this.box = blessed.list({
            parent: _this.screen,
            top: 'top',
            left: 'left',
            width: '20%',
            height: '100%',
            label: "Channels (Ctrl-l)",
            tags: true,
            scrollable: true,
            mouse: true,
            keys: true,
            vi: true,
            border: {
                type: 'line'
            },
            style: {
                fg: _this.config.channelsList.style.fg,
                bg: _this.config.channelsList.style.bg,
                focus: {
                    border: {
                        fg: _this.config.style.focus.border.fg
                    }
                }
            },
            search: function search(callback) {
                searchPrompt.setFront();
                searchPrompt.input('Search:', '', function (err, value) {
                    if (err) return;
                    return callback(null, value);
                });
            }
        });

        var searchPrompt = blessed.prompt({
            parent: _this.box,
            top: 'center',
            left: 'center',
            height: 'shrink',
            width: 'shrink',
            keys: true,
            vi: true,
            mouse: true,
            tags: true,
            border: 'line',
            hidden: true
        });

        searchPrompt.setFront();
        searchPrompt.setIndex(100);

        _this.box.on('select', function (e) {
            var chName = e.getContent();
            var channel = null;

            for (var index in _this.channels) {
                var ch = _this.channels[index];
                if (ch.display_name === chName) {
                    channel = ch;
                    _this.channels[index].has_unread = false;
                    _this.setChannels(_this.channels);
                    break;
                }
            }

            _this.selectedChannelId = channel.id;
            _this.emit('select_channel', channel);
            _this.refresh();
        });

        _this.screen.append(_this.box);

        _this.init();

        _this.refreshTimer = setInterval(function () {
            _this.refresh();
        }, REFRESH_INTERVAL);
        return _this;
    }

    _createClass(ChannelsList, [{
        key: 'initMessageListener',
        value: function initMessageListener() {
            var _this2 = this;

            this.api.on('message', function (message) {

                // increment unread display count
                if (message.type === 'message' && message.channel) {
                    for (var index in _this2.channels) {
                        if (_this2.channels[index].id === message.channel) {
                            _this2.screen.log("ChannelList: Received new message");
                            if (message.channel !== _this2.selectedChannelId) {
                                _this2.channels[index].has_unread = true;
                                _this2.screen.log("ChannelList: marking unselected channel as unread " + _this2.channels[index].id);
                            } else {
                                _this2.screen.log("ChannelList: marking selected channel as read " + _this2.channels[index].id);
                                _this2.api.markChannelRead(_this2.channels[index]);
                            }
                            if (typeof _this2.channels[index].history === 'undefined' || typeof _this2.channels[index].history.messages === 'undefined') {
                                _this2.channels[index].history = { messages: [] };
                            }
                            _this2.channels[index].history.messages.unshift(message);
                            _this2.setChannels(_this2.channels);
                            break;
                        }
                    }
                }
            });
        }
    }, {
        key: 'initUserListener',
        value: function initUserListener() {
            var _this3 = this;

            this.api.on('user info', function (user) {

                for (var index in _this3.channels) {
                    var ch = _this3.channels[index];
                    if (ch.is_im && ch.display_name === '@' + user.id) {
                        _this3.channels[index].display_name = '@' + user.profile.display_name;
                        break;
                    }
                }
                _this3.renderChannels();
            });
        }
    }, {
        key: 'setChannels',
        value: function setChannels(channels) {
            var _this4 = this;

            this.channels = channels.map(function (ch) {
                ch = Object.assign({}, ch);
                // ch.history = {unread_count_display: 3};
                ch.display_name = _this4.api.getChannelDisplayName(ch);

                if (typeof ch.history !== 'undefined' && typeof ch.history.unread_count_display !== 'undefined') {
                    ch.display_name = '(' + ch.history.unread_count_display + ') ' + ch.display_name;
                }

                if (ch.has_unread) {
                    ch.display_name = '* ' + ch.display_name + '';
                }

                return ch;
            });

            this.renderChannels();
            this.initUserListener();
        }
    }, {
        key: 'renderChannels',
        value: function renderChannels() {
            var _this5 = this;

            // this.box.clearItems();

            var lastSelected = this.box.selected;

            this.channels.filter(function (ch) {
                return ch.is_member || ch.is_im;
            }).sort(function (a, b) {
                var ats = -1;
                var bts = -1;

                if (a.history && a.history.messages && a.history.messages[0]) {
                    if (typeof a.history.messages[0].ts === 'undefined') {
                        ats = 0;
                    } else {
                        ats = parseFloat(a.history.messages[0].ts);
                    }
                }

                if (b.history && b.history.messages && b.history.messages[0]) {
                    if (typeof b.history.messages[0].ts === 'undefined') {
                        bts = 0;
                    } else {
                        bts = parseFloat(b.history.messages[0].ts);
                    }
                }

                if (ats == bts) return 0;
                return ats < bts ? 1 : -1;
            }).forEach(function (ch, i) {
                // check if has item first
                if (typeof _this5.box.items[i] !== 'undefined') {
                    _this5.box.setItem(parseInt(i), ch.display_name);
                } else {
                    _this5.box.addItem(ch.display_name);
                }
            });

            this.box.scrollTo(lastSelected);
            this.screen.render();
        }
    }, {
        key: 'fetchAllHistories',
        value: function fetchAllHistories() {
            var _this6 = this;

            // only refresh REFRESH_CHANNEL_LIMIT channels, if they're more than REFRESH_TTL old, every REFRESH_INTERVAL
            var delay = 10;
            var queued = 0;
            var now = Date.now();
            var allIndices = Object.keys(this.channels);
            shuffle(allIndices);

            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                var _loop = function _loop() {
                    var index = _step.value;

                    var channel = _this6.channels[index];
                    var lastUpdate = (channel.history || {}).lastUpdated;
                    if (typeof lastUpdate !== 'undefined' && lastUpdate - now < REFRESH_TTL) {
                        // Not old enough to update yet.
                        return 'continue';
                    }

                    setTimeout(function () {
                        _this6.api.fetchChannelHistory(channel, function (history) {
                            // check for rate limit
                            if (history.ok) {
                                _this6.channels[index].history = _extends({}, history, { lastUpdated: Date.now() });
                                _this6.setChannels(_this6.channels);
                            } else {
                                _this6.screen.log("ChannelsList: Could not get history for channel " + channel.id);
                                _this6.screen.log(JSON.stringify(history));
                            }
                        });
                    }, delay * queued);

                    queued++;

                    if (queued > REFRESH_CHANNEL_LIMIT) {
                        return 'break';
                    }
                };

                _loop2: for (var _iterator = allIndices[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var _ret = _loop();

                    switch (_ret) {
                        case 'continue':
                            continue;

                        case 'break':
                            break _loop2;}
                }
            } catch (err) {
                _didIteratorError = true;
                _iteratorError = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion && _iterator.return) {
                        _iterator.return();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }
        }
    }, {
        key: 'refresh',
        value: function refresh() {
            if (SHOULD_FETCH_HISTORIES) {
                this.fetchAllHistories();
            }
        }
    }, {
        key: 'init',
        value: function init() {
            var _this7 = this;

            this.api.fetchChannels(function (channels) {
                _this7.setChannels(Object.values(channels));
                if (SHOULD_FETCH_HISTORIES) {
                    _this7.fetchAllHistories();
                }
                _this7.initMessageListener();
            });
        }
    }]);

    return ChannelsList;
}(EventEmitter);

exports.default = ChannelsList;


module.exports = ChannelsList;

var blessed = require('blessed');
const MessagesList = require('./MessagesList');
const MessageForm = require('./MessageForm');

export default class ChannelBox {

    constructor(channel, screen, api, config) {
        this.channel = channel;
        this.screen = screen;
        this.api = api;
        this.config = config;

        this.box = blessed.box({
            parent: this.screen,
            label: this.api.getChannelDisplayName(channel) + ' (Ctrl-y)',
            top: 'top',
            left: '20%',
            width: '80%',
            height: '100%',
            input: true,
            mouse: true,
            border: {
                type: 'line'
            },
            style: {
                focus : {
                    border: {
                        fg: this.config.messageList.style.focus.border.fg
                    }
                }
            }
        });

        this.messagesList = new MessagesList(this);
        this.messageForm = new MessageForm(this);
    }

    refresh() {
        this.messagesList.refresh();
    }

    destroy() {
        this.messagesList.destroy();
        this.messageForm.destroy();
        this.box.destroy();
    }
}

module.exports = ChannelBox;

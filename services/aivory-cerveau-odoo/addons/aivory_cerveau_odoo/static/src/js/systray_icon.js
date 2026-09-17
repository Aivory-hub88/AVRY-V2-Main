/** @odoo-module **/

import { registry } from "@web/core/registry";
import { rpc } from "@web/core/network/rpc";
import { Dropdown } from "@web/core/dropdown/dropdown";
import { Component, useState } from "@odoo/owl";

class AivorySystrayPanel extends Component {
    static template = "aivory_cerveau_odoo.SystrayPanel";
    static props = {};

    setup() {
        this.state = useState({
            sending: false,
            draft: "",
            messages: [],
        });
    }

    onInput(ev) {
        this.state.draft = ev.target.value;
    }

    async sendMessage(ev) {
        ev.preventDefault();
        const message = this.state.draft.trim();
        if (!message || this.state.sending) {
            return;
        }

        this.state.messages.push({ from: "user", text: message });
        this.state.draft = "";
        this.state.sending = true;

        try {
            const result = await rpc("/aivory_cerveau/chat", { message });
            if (result && result.error) {
                this.state.messages.push({ from: "error", text: result.error });
            } else {
                const reply = (result && (result.reply || result.message)) || JSON.stringify(result);
                this.state.messages.push({ from: "aivory", text: reply });
            }
        } catch (error) {
            this.state.messages.push({ from: "error", text: "Request failed. Check the browser console." });
        } finally {
            this.state.sending = false;
        }
    }
}

class AivorySystrayIcon extends Component {
    static template = "aivory_cerveau_odoo.SystrayIcon";
    static components = { Dropdown, AivorySystrayPanel };
    static props = {};
}

export const systrayItem = {
    Component: AivorySystrayIcon,
};

registry.category("systray").add("aivory_cerveau_odoo.systray_icon", systrayItem, { sequence: 1 });

/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { Component, useState } from "@odoo/owl";

class CerveauSystrayIcon extends Component {
    static template = "aivory_cerveau_odoo.SystrayIcon";
    static props = {};

    setup() {
        this.rpc = useService("rpc");
        this.state = useState({
            open: false,
            sending: false,
            draft: "",
            messages: [],
        });
    }

    togglePanel() {
        this.state.open = !this.state.open;
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
            const result = await this.rpc("/aivory_cerveau/chat", { message });
            if (result && result.error) {
                this.state.messages.push({ from: "error", text: result.error });
            } else {
                const reply = (result && (result.reply || result.message)) || JSON.stringify(result);
                this.state.messages.push({ from: "cerveau", text: reply });
            }
        } catch (error) {
            this.state.messages.push({ from: "error", text: "Request failed. Check the browser console." });
        } finally {
            this.state.sending = false;
        }
    }
}

export const systrayItem = {
    Component: CerveauSystrayIcon,
};

registry.category("systray").add("aivory_cerveau_odoo.systray_icon", systrayItem, { sequence: 1 });

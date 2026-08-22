'use strict';
/**
 * Aivory Discord deployable-agent listener — thin Gateway <-> HTTP bridge.
 *
 * Discord pushes message content over a persistent Gateway WebSocket (no
 * inbound webhook the way Telegram's Bot API has), so this has to be its own
 * long-lived process, unlike telegram-agent.js's per-request Express handler.
 * Deliberately kept thin: ALL business logic (channel binding, credit/tier
 * gating, attachment handling, calling the agent gateway) lives in
 * avry-backend's discord_service.py — this file only translates Discord
 * Gateway events into calls against that service's internal HTTP endpoints,
 * and relays the reply back to Discord. Same shape as how Telegram's Bot API
 * webhook is a thin HTTP entry point into that same Python logic.
 *
 * Run as its own PM2 process: pm2 start discord-listener.js --name discord-listener
 * Shares the bridge's env (BACKEND_INTERNAL_URL, INTERNAL_TOKEN) plus:
 *   DISCORD_BOT_TOKEN        required — from the Discord Developer Portal
 *   DISCORD_APPLICATION_ID   required — same portal, General Information page
 */

require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  MessageFlags,
} = require('discord.js');

const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const APPLICATION_ID = process.env.DISCORD_APPLICATION_ID;
const BACKEND_URL = () => (process.env.BACKEND_INTERNAL_URL || 'http://localhost:8081').replace(/\/$/, '');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN;

if (!BOT_TOKEN || !APPLICATION_ID) {
  console.error('[discord-listener] DISCORD_BOT_TOKEN and DISCORD_APPLICATION_ID are required — exiting');
  process.exit(1);
}
if (!INTERNAL_TOKEN) {
  console.error('[discord-listener] INTERNAL_TOKEN is required (shared secret with avry-backend) — exiting');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// avry-backend calls
// ─────────────────────────────────────────────────────────────────────────────

async function backendPost(path, body) {
  const res = await fetch(`${BACKEND_URL()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(195000), // matches discord_service.py's own agent-gateway timeout
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.detail || `avry-backend ${path} returned ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Discord client
// ─────────────────────────────────────────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel], // needed to receive DM messageCreate events
});

async function registerSlashCommand() {
  const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
  const command = new SlashCommandBuilder()
    .setName('connect')
    .setDescription('Connect this channel to your Aivory agent')
    .addStringOption((opt) =>
      opt.setName('code').setDescription('The connect code from your Aivory dashboard').setRequired(true)
    )
    .toJSON();
  // Global registration: one-time (per command-shape change) ~1h propagation
  // delay, but works in every guild the bot is ever invited to without a
  // per-guild registration step — right tradeoff for a bot whose install
  // footprint (which tenant, which guild) isn't known ahead of time.
  await rest.put(Routes.applicationCommands(APPLICATION_ID), { body: [command] });
  console.log('[discord-listener] /connect slash command registered (global)');
}

client.once(Events.ClientReady, async (c) => {
  console.log(`[discord-listener] logged in as ${c.user.tag}`);
  try {
    await registerSlashCommand();
  } catch (err) {
    console.error('[discord-listener] slash command registration failed:', err.message);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'connect') return;
  const code = interaction.options.getString('code', true);
  try {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const result = await backendPost('/api/v1/discord/redeem', {
      code,
      guild_id: interaction.guildId || '0',
      channel_id: interaction.channelId,
      discord_user_id: interaction.user.id,
      channel_name: interaction.channel && interaction.channel.name ? interaction.channel.name : null,
    });
    await interaction.editReply(result.reply || 'Done.');
  } catch (err) {
    console.error('[discord-listener] /connect failed:', err.message);
    await interaction.editReply('⚠️ Something went wrong connecting this channel. Please try again in a moment.').catch(() => {});
  }
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return; // never respond to other bots (or ourselves) — no feedback loops
  const text = (message.content || '').trim();
  const attachments = [...message.attachments.values()].map((a) => ({
    filename: a.name,
    content_type: a.contentType,
    url: a.url, // Discord CDN URLs are directly fetchable, no auth needed
  }));
  if (!text && !attachments.length) return;

  const guildId = message.guildId || '0'; // '0' for DMs, mirrors Telegram's chat_id 0 = console convention
  const channelId = message.channelId;

  try {
    await message.channel.sendTyping().catch(() => {}); // best-effort, mirrors Telegram's send_typing
    const result = await backendPost('/api/v1/discord/message', {
      guild_id: guildId,
      channel_id: channelId,
      text: text.slice(0, 8000),
      attachments,
    });
    if (result.reply) {
      // discord_service.py already caps replies at 2000 chars (Discord's own
      // message length limit), so no chunking needed here.
      await message.channel.send(result.reply);
    }
    // reply === null means this channel isn't bound to any agent — stay
    // silent, same "unbound chats get no reply" posture Telegram's bridge has.
  } catch (err) {
    console.error(`[discord-listener] message routing failed for channel ${channelId}:`, err.message);
    await message.channel.send('⚠️ The agent is temporarily unavailable. Please try again in a moment.').catch(() => {});
  }
});

client.on(Events.Error, (err) => {
  console.error('[discord-listener] client error:', err.message);
});

client.login(BOT_TOKEN);

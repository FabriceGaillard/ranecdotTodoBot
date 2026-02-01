import {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  REST,
  Routes,
  Events,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';

import 'dotenv/config';
import { commands } from './commands.mjs';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

/* ───────────────────────── READY ───────────────────────── */

client.once(Events.ClientReady, async () => {
  console.log(`Connecté en tant que ${client.user.tag}`);

  const rest = new REST().setToken(process.env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(client.user.id), {
    body: commands,
  });
});

/* ────────────────────── BUTTONS REUSABLE ───────────────────── */

const doneButton = new ButtonBuilder()
  .setCustomId('check')
  .setLabel('done')
  .setStyle(ButtonStyle.Secondary);

/* ───────────────────── INTERACTION CREATE ───────────────────── */

client.on(Events.InteractionCreate, async (interaction) => {
  /* ─────── /todo ─────── */
  if (interaction.isChatInputCommand() && interaction.commandName === 'todo') {
    const nom = interaction.options.getString('nom', false);
    if (!nom)
      return interaction.reply({ content: 'Nom requis', ephemeral: true });

    const safeName = nom.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    await interaction.deferReply({ ephemeral: true });

    const channel = await interaction.guild.channels.create({
      name: `to-do-${safeName}`,
      type: ChannelType.GuildText,
      parent: '1467236411777486888',
      topic: `to-do:owner=${interaction.user.id};name=${safeName}`,
      reason: `Créé par ${interaction.user.tag}`,
    });

    const embed = new EmbedBuilder()
      .setTitle(`To-do — ${nom}`)
      .setAuthor({
        name: interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setThumbnail(interaction.user.displayAvatarURL())
      .setDescription('Espace dédié à la gestion des tâches.')
      .setColor(0x5865f2);

    const msg = await channel.send({ embeds: [embed] });

    await interaction.editReply({
      content: 'To-do créée',
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setStyle(ButtonStyle.Link)
            .setLabel('Go to to-do')
            .setURL(msg.url),
        ),
      ],
    });
  }

  /* ─────── /task ─────── */
  if (interaction.isChatInputCommand() && interaction.commandName === 'task') {
    const nom = interaction.options.getString('nom', false);
    if (!nom)
      return interaction.reply({ content: 'Nom requis', ephemeral: true });

    if (!interaction.channel.topic?.startsWith('to-do:')) {
      return interaction.reply({
        content: 'Pas un channel to-do',
        ephemeral: true,
      });
    }

    const editBtn = new ButtonBuilder()
      .setCustomId('edit')
      .setLabel('edit')
      .setStyle(ButtonStyle.Secondary);

    await interaction.channel.send({
      content: `>>> → **${nom}**\n-# ${interaction.user.tag}`,
      components: [new ActionRowBuilder().addComponents(doneButton, editBtn)],
    });

    await interaction
      .reply({ content: 'Ajouté', ephemeral: true })
      .then(() => interaction.deleteReply().catch(() => {}));
  }

  /* ─────── DONE ─────── */
  if (interaction.isButton() && interaction.customId === 'check') {
    const [task, author] = interaction.message.content.split('\n');

    const completed = task.replace(/^>>> → \*\*(.+)\*\*$/, '>>> ✔ ~~**$1**~~');

    await interaction.message.edit({
      content: `${completed}\n${author}`,
      components: [
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('reactivate')
            .setLabel('Undo')
            .setStyle(ButtonStyle.Secondary),
        ),
      ],
    });

    return interaction.deferUpdate();
  }

  /* ─────── UNDO ─────── */
  if (interaction.isButton() && interaction.customId === 'reactivate') {
    const [task, author] = interaction.message.content.split('\n');

    const restored = task.replace(/^>>> ✔ ~~\*\*(.+)\*\*~~$/, '>>> → **$1**');

    const editBtn = new ButtonBuilder()
      .setCustomId('edit')
      .setLabel('edit')
      .setStyle(ButtonStyle.Secondary);

    await interaction.message.edit({
      content: `${restored}\n${author}`,
      components: [new ActionRowBuilder().addComponents(doneButton, editBtn)],
    });

    return interaction.deferUpdate();
  }

  /* ─────── EDIT (open modal) ─────── */
  if (interaction.isButton() && interaction.customId === 'edit') {
    const task = interaction.message.content.match(/\*\*(.+?)\*\*/)?.[1] ?? '';

    const modal = new ModalBuilder()
      .setCustomId(`edit_task:${interaction.message.id}`)
      .setTitle('Modifier la tâche');

    const input = new TextInputBuilder()
      .setCustomId('task')
      .setLabel('Nom de la tâche')
      .setStyle(TextInputStyle.Paragraph)
      .setValue(task)
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    return interaction.showModal(modal);
  }

  /* ─────── MODAL SUBMIT (SAVE) ─────── */
  if (
    interaction.isModalSubmit() &&
    interaction.customId.startsWith('edit_task:')
  ) {
    const messageId = interaction.customId.split(':')[1];
    const newTask = interaction.fields.getTextInputValue('task');

    const message = await interaction.channel.messages.fetch(messageId);
    const [, author] = message.content.split('\n');

    await message.edit({
      content: `>>> → **${newTask}**\n${author}`,
    });

    await interaction
      .reply({
        content: 'Tâche mise à jour',
        ephemeral: true,
      })
      .then(() => interaction.deleteReply())
      .catch(() => {});
  }

  /* ─────── DELETE ─────── */
  if (
    interaction.isButton() &&
    interaction.customId.startsWith('delete_task:')
  ) {
    const id = interaction.customId.split(':')[1];
    const msg = await interaction.channel.messages.fetch(id);
    await msg.delete();

    await interaction.reply({ content: '🗑️ Supprimée', ephemeral: true });
  }
});

/* ───────────────────────── LOGIN ───────────────────────── */

client.login(process.env.DISCORD_TOKEN);

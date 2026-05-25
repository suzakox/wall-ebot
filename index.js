require('dotenv').config();

const {
    Client,
    GatewayIntentBits,
    Events,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder
} = require('discord.js');

const bosses = require('./bosses');
const db = require('./database/db');

// ========================================
// CONFIG
// ========================================

const ROLE_ID = '1504538619187298468';

const ALERT_CHANNEL_ID = '1506302612872626341';

// ========================================
// CLIENT
// ========================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ========================================
// DISCORD TIMESTAMP
// ========================================

const discordTime = (date) => {

    const unix = Math.floor(date.getTime() / 1000);

    return `<t:${unix}:F>`;

};

// ========================================
// READY
// ========================================

client.once('ready', () => {

    console.log(`Bot online: ${client.user.tag}`);

    // ========================================
    // ALERT LOOP
    // ========================================

    setInterval(async () => {

        const now = new Date();

        db.all(`
            SELECT *
            FROM boss_logs
            WHERE alert_sent = 0
        `, async (err, rows) => {

            if (err) {
                return console.error(err);
            }

            for (const row of rows) {

                const earliest = new Date(row.earliest);

                if (now >= earliest) {

                    try {

                        const channel =
                            client.channels.cache.get(ALERT_CHANNEL_ID);

                        if (!channel) continue;

                        const bossData = bosses.find(
                            b => b.name === row.boss_name
                        );

                        const embed = new EmbedBuilder()

                            .setColor(bossData.color)

                            .setTitle(`🟢 ${row.boss_name} entrou em janela!`)

                            .setThumbnail(bossData.image)

                            .setDescription(
`━━━━━━━━━━━━━━━━━━
⚔️ RAID OPEN
O boss entrou oficialmente em janela.
━━━━━━━━━━━━━━━━━━`
                            )

                            .addFields(

                                {
                                    name: '🟢 Início da Janela',
                                    value: discordTime(earliest),
                                    inline: true
                                },

                                {
                                    name: '🔴 Final da Janela',
                                    value: discordTime(
                                        new Date(row.latest)
                                    ),
                                    inline: true
                                }

                            )

                            .setFooter({
                                text: 'Wall-E TOD Tracker'
                            });

                        await channel.send({

                            content: `<@&${ROLE_ID}>`,

                            embeds: [embed]

                        });

                        db.run(`
                            UPDATE boss_logs
                            SET alert_sent = 1
                            WHERE id = ?
                        `, [row.id]);

                    } catch (error) {

                        console.error(error);

                    }

                }

            }

        });

    }, 60000);

});

// ========================================
// INTERACTIONS
// ========================================

client.on(Events.InteractionCreate, async interaction => {

    // ========================================
    // SLASH COMMANDS
    // ========================================

    if (interaction.isChatInputCommand()) {

        // ========================================
        // /TOD
        // ========================================

        if (interaction.commandName === 'tod') {

            const menu = new StringSelectMenuBuilder()
                .setCustomId('boss_select')
                .setPlaceholder('Escolha o boss');

            bosses.forEach(boss => {

                menu.addOptions({
                    label: boss.name,
                    value: boss.name
                });

            });

            const row = new ActionRowBuilder()
                .addComponents(menu);

            await interaction.reply({
                content: '👹 Escolha um boss:',
                components: [row]
            });

        }

        // ========================================
        // /NEXT
        // ========================================

        if (interaction.commandName === 'next') {

            const bossName =
                interaction.options.getString('boss');

            db.get(`
                SELECT *
                FROM boss_logs
                WHERE boss_name = ?
                ORDER BY id DESC
                LIMIT 1
            `, [bossName], async (err, row) => {

                if (err) {

                    console.error(err);

                    return interaction.reply({
                        content: '❌ Erro ao consultar banco.'
                    });

                }

                if (!row) {

                    return interaction.reply({
                        content:
`❌ Nenhum registro encontrado para ${bossName}`
                    });

                }

                const bossData = bosses.find(
                    b => b.name === row.boss_name
                );

                const killText =
                    row.kill_type === 'ally'
                        ? '🟢 Nossa Ally matou'
                        : '🔴 Ally inimiga matou';

                const dropText =
                    row.drop_status === 'yes'
                        ? `✔️ ${bossData.mainDrop} dropou`
                        : `❌ ${bossData.mainDrop} não dropou`;

                const embed = new EmbedBuilder()

                    .setColor(bossData.color)

                    .setTitle(`👑 ${row.boss_name}`)

                    .setThumbnail(bossData.image)

                    .setDescription(
`━━━━━━━━━━━━━━━━━━
⚔️ STATUS DA RAID
${killText}

💎 DROP
${dropText}
━━━━━━━━━━━━━━━━━━`
                    )

                    .addFields(

                        {
                            name: '💀 Último TOD',
                            value: discordTime(new Date(row.tod)),
                            inline: false
                        },

                        {
                            name: '🟢 Início da Janela',
                            value: discordTime(new Date(row.earliest)),
                            inline: true
                        },

                        {
                            name: '🔴 Final da Janela',
                            value: discordTime(new Date(row.latest)),
                            inline: true
                        }

                    )

                    .setFooter({
                        text: 'Wall-E TOD Tracker'
                    });

                await interaction.reply({

                    embeds: [embed]

                });

            });

        }

        // ========================================
        // /HISTORY
        // ========================================

        if (interaction.commandName === 'history') {

            const bossName =
                interaction.options.getString('boss');

            db.all(`
                SELECT *
                FROM boss_logs
                WHERE boss_name = ?
                ORDER BY id DESC
                LIMIT 10
            `, [bossName], async (err, rows) => {

                if (err) {

                    console.error(err);

                    return interaction.reply({
                        content: '❌ Erro ao consultar banco.'
                    });

                }

                if (!rows.length) {

                    return interaction.reply({
                        content:
`❌ Nenhum histórico encontrado para ${bossName}`
                    });

                }

                const bossData = bosses.find(
                    b => b.name === bossName
                );

                const embed = new EmbedBuilder()

                    .setColor(bossData.color)

                    .setTitle(`📜 Histórico — ${bossName}`)

                    .setThumbnail(bossData.image);

                rows.forEach((row, index) => {

                    const killText =
                        row.kill_type === 'ally'
                            ? '🟢 Nossa Ally'
                            : '🔴 Ally inimiga';

                    const dropText =
                        row.drop_status === 'yes'
                            ? '✔️ Dropou'
                            : '❌ Não dropou';

                    embed.addFields({

                        name: `#${index + 1}`,

                        value:
`💀 ${discordTime(new Date(row.tod))}
⚔️ ${killText}
💎 ${dropText}`

                    });

                });

                await interaction.reply({

                    embeds: [embed]

                });

            });

        }

    }

    // ========================================
    // DROPDOWN
    // ========================================

    if (interaction.isStringSelectMenu()) {

        if (interaction.customId === 'boss_select') {

            const selectedBoss = interaction.values[0];

            const bossData = bosses.find(
                b => b.name === selectedBoss
            );

            const allyButton = new ButtonBuilder()
                .setCustomId(`ally_${bossData.name}`)
                .setLabel('Nossa Ally')
                .setStyle(ButtonStyle.Success);

            const enemyButton = new ButtonBuilder()
                .setCustomId(`enemy_${bossData.name}`)
                .setLabel('Ally Inimiga')
                .setStyle(ButtonStyle.Danger);

            const buttonRow = new ActionRowBuilder()
                .addComponents(
                    allyButton,
                    enemyButton
                );

            await interaction.update({

                content:
`🔥 Boss selecionado: ${bossData.name}

⚔️ Quem matou?`,

                components: [buttonRow]

            });

        }

    }

    // ========================================
    // BUTTONS
    // ========================================

    if (interaction.isButton()) {

        await interaction.deferUpdate();

        const customId = interaction.customId;

        // ========================================
        // ALLY
        // ========================================

        if (customId.startsWith('ally_')) {

            const bossName =
                customId.replace('ally_', '');

            const dropButton = new ButtonBuilder()

                .setCustomId(
                    `drop_yes_${bossName}_ally`
                )

                .setLabel('Dropou')

                .setStyle(ButtonStyle.Success);

            const noDropButton = new ButtonBuilder()

                .setCustomId(
                    `drop_no_${bossName}_ally`
                )

                .setLabel('Não Dropou')

                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()

                .addComponents(
                    dropButton,
                    noDropButton
                );

            await interaction.editReply({

                content:
`🟢 Nossa ally matou o ${bossName}

💎 O item principal dropou?`,

                components: [row]

            });

        }

        // ========================================
        // ENEMY
        // ========================================

        if (customId.startsWith('enemy_')) {

            const bossName =
                customId.replace('enemy_', '');

            const dropButton = new ButtonBuilder()

                .setCustomId(
                    `drop_yes_${bossName}_enemy`
                )

                .setLabel('Dropou')

                .setStyle(ButtonStyle.Success);

            const noDropButton = new ButtonBuilder()

                .setCustomId(
                    `drop_no_${bossName}_enemy`
                )

                .setLabel('Não Dropou')

                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder()

                .addComponents(
                    dropButton,
                    noDropButton
                );

            await interaction.editReply({

                content:
`🔴 Ally inimiga matou o ${bossName}

💎 O item principal dropou?`,

                components: [row]

            });

        }

        // ========================================
        // DROP RESULT
        // ========================================

        if (customId.startsWith('drop_')) {

            const parts =
                customId.split('_');

            const dropStatus = parts[1];
            const bossName = parts[2];
            const killType = parts[3];

            const bossData = bosses.find(
                b => b.name === bossName
            );

            const now = new Date();

            const earliest = new Date(
                now.getTime() +
                bossData.respawnHours * 60 * 60 * 1000
            );

            const latest = new Date(
                earliest.getTime() +
                bossData.randomWindowHours * 60 * 60 * 1000
            );

            const killText =
                killType === 'ally'
                    ? '🟢 Nossa Ally matou'
                    : '🔴 Ally inimiga matou';

            const dropText =
                dropStatus === 'yes'
                    ? `✔️ ${bossData.mainDrop} dropou`
                    : `❌ ${bossData.mainDrop} não dropou`;

            const embed = new EmbedBuilder()

                .setColor(bossData.color)

                .setTitle(`👑 ${bossData.name}`)

                .setThumbnail(bossData.image)

                .setDescription(
`━━━━━━━━━━━━━━━━━━
⚔️ STATUS DA RAID
${killText}

💎 DROP
${dropText}
━━━━━━━━━━━━━━━━━━`
                )

                .addFields(

                    {
                        name: '💀 Time of Death',
                        value: discordTime(now),
                        inline: false
                    },

                    {
                        name: '🟢 Início da Janela',
                        value: discordTime(earliest),
                        inline: true
                    },

                    {
                        name: '🔴 Final da Janela',
                        value: discordTime(latest),
                        inline: true
                    }

                )

                .setFooter({
                    text:
`Reportado por ${interaction.user.username}`
                });

            await interaction.editReply({

                content: '',

                embeds: [embed],

                components: []

            });

            db.run(`
                INSERT INTO boss_logs (
                    boss_name,
                    kill_type,
                    drop_status,
                    tod,
                    earliest,
                    latest,
                    alert_sent
                )
                VALUES (?, ?, ?, ?, ?, ?, 0)
            `, [
                bossData.name,
                killType,
                dropStatus,
                now.toISOString(),
                earliest.toISOString(),
                latest.toISOString()
            ]);

        }

    }

});

client.login(process.env.TOKEN);
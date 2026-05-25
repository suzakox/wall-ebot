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

const ROLE_ID = '1504538619187298468';
const ALERT_CHANNEL_ID = '1506302612872626341';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const discordTime = (date) => {

    const unix = Math.floor(date.getTime() / 1000);

    return `<t:${unix}:F>`;

};

client.once('ready', () => {

    console.log(`Bot online: ${client.user.tag}`);

    setInterval(async () => {

        try {

            const rows = db.prepare(`
                SELECT *
                FROM boss_logs
                WHERE alert_sent = 0
            `).all();

            const now = new Date();

            for (const row of rows) {

                const earliest = new Date(row.earliest);

                if (now >= earliest) {

                    const channel =
                        client.channels.cache.get(ALERT_CHANNEL_ID);

                    if (!channel) continue;

                    const bossData =
                        bosses.find(
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
                                value:
                                    discordTime(
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

                    db.prepare(`
                        UPDATE boss_logs
                        SET alert_sent = 1
                        WHERE id = ?
                    `).run(row.id);

                }

            }

        } catch (error) {

            console.error(error);

        }

    }, 60000);

});

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

    }

    // ========================================
    // DROPDOWN
    // ========================================

    if (interaction.isStringSelectMenu()) {

        if (interaction.customId === 'boss_select') {

            const selectedBoss =
                interaction.values[0];

            const bossData =
                bosses.find(
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

            const bossData =
                bosses.find(
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

            db.prepare(`
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
            `).run(
                bossData.name,
                killType,
                dropStatus,
                now.toISOString(),
                earliest.toISOString(),
                latest.toISOString()
            );

        }

    }

});

client.login(process.env.TOKEN);
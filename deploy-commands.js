require('dotenv').config();

const {
    REST,
    Routes,
    SlashCommandBuilder
} = require('discord.js');

const bosses = require('./bosses');

const createBossOption = (option) => {

    option
        .setName('boss')
        .setDescription('Escolha o boss')
        .setRequired(true);

    bosses.forEach(boss => {

        option.addChoices({
            name: boss.name,
            value: boss.name
        });

    });

    return option;

};

const commands = [

    new SlashCommandBuilder()
        .setName('tod')
        .setDescription('Registrar Time of Death'),

    new SlashCommandBuilder()
        .setName('next')
        .setDescription('Mostrar próximo spawn do boss')
        .addStringOption(createBossOption),

    new SlashCommandBuilder()
        .setName('history')
        .setDescription('Mostrar histórico do boss')
        .addStringOption(createBossOption)

].map(command => command.toJSON());

const rest = new REST({ version: '10' })
    .setToken(process.env.TOKEN);

(async () => {

    try {

        console.log('Registrando comandos...');

        await rest.put(
            Routes.applicationCommands('1508219768379932682'),
            { body: commands }
        );

        console.log('Comandos registrados!');

    } catch (error) {

        console.error(error);

    }

})();
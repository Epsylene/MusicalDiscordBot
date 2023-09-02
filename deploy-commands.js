import { REST, Routes } from 'discord.js';
import config from "./config.json" assert { type: "json" };
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get all commands directories
const foldersPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'commands');
const commandFolders = fs.readdirSync(foldersPath);
const promises_commands = [];
const commands = [];
for (const folder of commandFolders) {
    // Get command files from the commands directory
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    // Get the output of each command
    for (const file of commandFiles) {
        const filePath = "file://" + path.join(commandsPath, file).replace(/\\/g, '//');
        promises_commands.push(import(filePath)
            .then(command => command.default)
            .then(command => {
                // Set a new item in the Collection with the key as the command name and the value as the exported module
                if ('data' in command && 'execute' in command) {
                    commands.push(command.data.toJSON());
                }
                else {
                    console.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            })
            .catch(err => console.warn(`Failed to load command at ${filePath}: ${err}`)));
    }
}
await Promise.all(promises_commands).then(() => console.log(`Loaded ${commands.length} commands.`));

// Deploy commands to Discord
const rest = new REST().setToken(config.discord_token);
(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Refresh commands in Discord
        const data = await rest.put(
            Routes.applicationCommands(config.discord_client),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    }
    catch (error) {
        console.error(error);
    }
})();
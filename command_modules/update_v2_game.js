
const config = require("../config.json");
const rw = require("../reader_writer.js");
const gameHub = require("../game_hub.js");
const guildModule = require("../guild_data.js");
const slaveServersModule = require("../slave_server.js");
const regexp = new RegExp(`^${config.prefix}UPDATE`, "i");

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "universal";

module.exports.getReadableCommand = function()
{
  return "update";
};

module.exports.getCommandArguments = ["`name of game to be updated to v3 bot`"];

module.exports.getHelpText = function()
{
  return `Moves a game that was hosted in the old bot (Mr. Clockwork v2) to be hosted by Mr. Clockwork v3, complete with all of the new features. The reason this was not done for all games automatically is because with v3 being just released, it's likely that bugs and other issues will occurr frequently, which might disrupt the flow of already advanced games. It will be up to the organizer whether or not to convert their game. Additionally, once converted, every played should claim their nation by using the \`${config.prefix}pretenders\` command and then \`${config.prefix}claim <number>\`, where the \`<number>\` is the number of the nation in question displayed after the \`${config.prefix}pretenders\` command.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage, wasSentInGameChannel, game)
{
  //User typed command to start the preferences manager
  if (regexp.test(command) === true)
  {
    console.log(`Update v2 game is invoked!`);
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  let server;

  if (options.args[0] == null)
  {
    message.channel.send(`You must specify the name of the game that you want to update.`);
    return;
  }

  //bot's slave server token
  server = slaveServersModule.getSlave("7f6175d2-7be8-468c-88e0-a0d26bb96040");

  if (server == null)
  {
    message.channel.send(`The slave server seems to be offline at the moment; you will have to try again later.`);
    return;
  }

  server.socket.emit("updateV2Game", {name: options.args[0].trim()}, function(err, port, ip)
  {
    if (err)
    {
      console.log(`UpdateV2Game returned error!`);
      message.channel.send(err);
      return;
    }

    rw.readJSON(`${config.pathToGameData}/${options.args[0]}/data.json`, null, function callback(err, gameData)
    {
      var revivedGame;
      var hostServer;

      if (err)
      {
        rw.log("error", true, {Path: `${config.pathToGameData}/${dir}/data.json`}, err);
        message.channel.send(`An error occurred when reading the converted data. Could not update game.`);
        return;
      }

      try
      {
        revivedGame = gameHub.fromJSON(gameData, guildModule.getGuildObject(gameData.guild));
      }

      catch(err)
      {
        rw.log("error", true, `Could not fetch the object for guild ${gameData.guild} to revive the converted game ${gameData.name}.`);
        message.channel.send(`Could not find the data for this game's guild. Is the bot deployed?`);
        return;
      }

      console.log(`Revived game: ${revivedGame.name}`);
      console.log(revivedGame);

      if (typeof revivedGame !== "object")
      {
        message.channel.send(`An error occurred when reviving game ${gameData.name}.`);
        return;
      }

      options.games[revivedGame.name.toLowerCase()] = revivedGame;
      server.addGame(revivedGame);

      gameHub.create(revivedGame.name, port, revivedGame.organizer, server, revivedGame.gameType, false, revivedGame.settings, function(err, createdGame)
      {
        if (err)
        {
          message.channel.send(`An error occurred when finalizing the creation of the updated game data.`);
          return;
        }

        console.log(`Created game:`);
        console.log(createdGame);
        createdGame.channel = revivedGame.channel;
        createdGame.role = revivedGame.role;

        //gameHub.create() resets the current timer to the default, as well as
        //the wasStarted property, which would cause issues
        createdGame.currentTimer = revivedGame.currentTimer;
        createdGame.wasStarted = revivedGame.wasStarted;
        createdGame.isServerOnline = true;

        console.log(`Sending signal to delete old data...`);

        server.socket.emit(`deleteV2Data`, {name: createdGame.name}, function(err)
        {
          if (err)
          {
            message.channel.send(`The game was updated successfully, but there was an error when deleting its old data. Contact Drithyl#1972 so it can be deleted manually, or it will continue running in the old bot as well, causing a conflict.`);
            return;
          }

          message.channel.send(`The game was updated successfully and the old data was deleted.`)
        });
      });
    });
  });
}

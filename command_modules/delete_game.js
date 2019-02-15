
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const hoster = require("../hoster.js");
const newsModule = require("../news_posting.js");
const regexp = new RegExp(`^${config.prefix}DELETE`, "i");
const fullRegexp = new RegExp("^FULL$", "i");
const channelRegexp = new RegExp("^CHANNEL$", "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "delete";
};

module.exports.getCommandArguments = [`\`channel\` to delete channel and role too. \`full\` to delete **everything**, including the game's save files`];

module.exports.getHelpText = function()
{
  return `Deletes the game hosted in the channel in which you used the command. This will not delete the dominions savedgame files; only the bot's files that make it host and track the game. If used with the \`full\` argument, it will delete everything, including the dominions savedgame files. Use this command when a game you've organized is finished.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  if (regexp.test(command) === true && isDirectMessage === false)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  var game = channelFunctions.getGameThroughChannel(message.channel.id, options.games);
  var channel = message.channel;
  var role = game.role;

  //tmp variables to use after deletion
  let gameName = game.name;
  let gameGuildID = game.guild.id;

  if (game == null)
  {
    message.channel.send("The game is not in my list of saved games.");
    return;
  }

  if (game.isServerOnline === false)
  {
    message.channel.send("This game's server is not online.");
    return;
  }

  if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, game.organizer.id) === false)
  {
    message.channel.send(`Sorry, you do not have the permissions to do this. Only this game's organizer (${game.organizer.user.username}) or GMs can do this.`);
    return;
  }

  if (channelRegexp.test(options.args[0]) === true)
  {
    rw.log(null, `${message.author.username} requested to delete the game ${game.name} and its channel and role.`);
    channelDelete(message, game, game.channel, game.role);
  }

  if (fullRegexp.test(options.args[0]) === true)
  {
    rw.log(null, `${message.author.username} requested to fully delete the game ${game.name}.`);
    fullDelete(message, game, game.channel, game.role);
  }

  else
  {
    rw.log(null, `${message.author.username} requested to delete ${game.name}'s bot data.`);
    normalDelete(message, game);
  }
};

function normalDelete(message, game)
{
  game.deleteGameData(function(err)
  {
    if (err)
    {
      message.channel.send(`An error occurred when trying to delete this game.`);
      return;
    }

    hoster.deleteGameData(game.name);
    message.channel.send(`The game and its data files have been deleted (the savedgame files still remain).`).catch((err) => {rw.logError({User: message.author.username}, `Error sending message: `, err);});
    newsModule.post(`${message.author.username} deleted the game ${gameName}.`, message.guild.id);
    rw.log(null, `The game's bot data has been deleted.`);
  });
}

function channelDelete(message, game)
{
  game.deleteGameData(function(err)
  {
    if (err)
    {
      message.channel.send(`An error occurred when trying to delete this game's data.`);
      return;
    }

    hoster.deleteGameData(game.name);

    //full deletion requested, delete channel and role as well
    channel.delete().then(function()
    {
      role.delete().then(function()
      {
        message.author.send(`The game and its data files and channel and role have been deleted (the savedgame files still remain).`).catch((err) => {rw.logError({User: message.author.username}, `Error sending message: `, err);});
        newsModule.post(`${message.author.username} deleted the game ${gameName}, including its channel and role.`, message.guild.id);
        rw.log(null, `The game's bot data and channel and role have been deleted.`);
      });
    }).catch(function(err)
    {
      rw.logError({Game: game.name, Channel: channel.name}, `channel delete() Error: `, err);
      message.author.send(`The game and its files have been deleted, but an error occurred when trying to delete the channel and role.`).catch((err) => {rw.logError({User: message.author.username}, `Error sending message: `, err);});
      newsModule.post(`${message.author.username} deleted the game ${gameName}, but an error occurred when trying to delete the channel and role.`, message.guild.id);
    });
  });
}

function fullDelete(message, game, channel, role)
{
  game.deleteGameSavefiles(function(err)
  {
    //If err is ENOENT it means there are no savefiles found, so proceed
    if (err && err.code !== "ENOENT")
    {
      message.channel.send(`An error occurred when trying to delete this game's savefiles.`);
      return;
    }

    game.deleteGameData(function(err)
    {
      if (err)
      {
        message.channel.send(`An error occurred when trying to delete this game's data.`);
        return;
      }

      hoster.deleteGameData(game.name);

      //full deletion requested, delete channel and role as well
      channel.delete().then(function()
      {
        role.delete().then(function()
        {
          message.author.send(`The game and its data and savefiles and channel and role have been deleted.`).catch((err) => {rw.logError({User: message.author.username}, `Error sending message: `, err);});
          newsModule.post(`${message.author.username} deleted the game ${gameName}, including its channel, role and savefiles.`, message.guild.id);
          rw.log(null, `The game's bot data, savefiles and channel and role have been deleted.`);
        });
      }).catch(function(err)
      {
        rw.logError({Game: game.name, Channel: channel.name}, `channel delete() Error: `, err);
        message.author.send(`The game and its files have been deleted, but an error occurred when trying to delete the channel and role.`).catch((err) => {rw.logError({User: message.author.username}, `Error sending message: `, err);});
        newsModule.post(`${message.author.username} deleted the game ${gameName}, but an error occurred when trying to delete the channel and role.`, message.guild.id);
      });
    });
  });
}

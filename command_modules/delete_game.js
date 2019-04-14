
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

module.exports.getCommandArguments = [`\`full\` to delete **everything**, including the game's save files`];

module.exports.getHelpText = function()
{
  return `Deletes the game hosted in the channel in which you used the command, as well as the channel itself and the game's role. Can also be used to delete a game channel you previously created with the \`${config.prefix}channel\` command in which no game was hosted. This will not delete the dominions savedgame files; only the bot's files that make it host and track the game. If used with the \`full\` argument, it will delete everything, including the dominions savedgame files. Use this command when a game you've organized is finished.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage, wasSentInGameChannel)
{
  if (regexp.test(command) === true && isDirectMessage === false)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  let pendingGameChannel = hoster.getPendingGameChannel(message.author.id, message.guild);

  //delete the pending game channel (with no game hosted) if that's where the user uses delete
  if (pendingGameChannel != null && message.channel.id === pendingGameChannel.id && options.game == null)
  {
    pendingGameChannel.delete();
    hoster.deletePendingGameChannel(message.author.id);
    message.author.send("You deleted the game channel you had created. You can now create a new channel or host a game normally.");
    return;
  }

  //don't pick up command on non-game channels
  if (options.game == null)
  {
    return;
  }

  var channel = message.channel;
  var role = options.game.role;

  //tmp variables to use after deletion
  let gameName = options.game.name;
  let gameGuildID = options.game.guild.id;

  if (options.game.isServerOnline === false)
  {
    message.channel.send("This game's server is not online.");
    return;
  }

  if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, options.game.organizer.id) === false)
  {
    message.channel.send(`Sorry, you do not have the permissions to do this. Only this game's organizer (${options.game.organizer.user.username}) or GMs can do this.`);
    return;
  }

  if (fullRegexp.test(options.args[0]) === true)
  {
    rw.log("general", `${message.author.username} requested to fully delete the game ${options.game.name}.`);
    fullDelete(message, options.game, options.game.channel, options.game.role);
  }

  else /*(channelRegexp.test(options.args[0]) === true)*/
  {
    rw.log("general", `${message.author.username} requested to delete the game ${options.game.name} and its channel and role.`);
    channelDelete(message, options.game, options.game.channel, options.game.role);
  }

  /*else
  {
    rw.log("general", `${message.author.username} requested to delete ${options.game.name}'s bot data.`);
    normalDelete(message, options.game);
  }*/
};

function normalDelete(message, game)
{
  //for announcement purposes after deletion
  let gameChannel = game.channel;

  game.deleteGameData(function(err)
  {
    if (err)
    {
      message.channel.send(`An error occurred when trying to delete this game.`);
      return;
    }

    hoster.deleteGameData(game.name);
    message.channel.send(`The game and its data files have been deleted (the savedgame files still remain).`).catch((err) => {rw.log("error", true, `Error sending message: `, {User: message.author.username}, err);});
    newsModule.post(`${message.author.username} deleted the game ${gameChannel}.`, message.guild.id);
    rw.log("general", `The game's bot data has been deleted.`);
  });
}

function channelDelete(message, game)
{
  //for announcement purposes after deletion
  let gameName = game.name;

  game.deleteGameData(function(err)
  {
    if (err)
    {
      message.channel.send(`An error occurred when trying to delete this game's data.`);
      return;
    }

    hoster.deleteGameData(game.name);

    //full deletion requested, delete channel and role as well
    game.channel.delete().then(function()
    {
      game.role.delete().then(function()
      {
        message.author.send(`The game and its data files and channel and role have been deleted (the savedgame files still remain).`).catch((err) => {rw.log("error", true, `Error sending message: `, {User: message.author.username}, err);});
        newsModule.post(`${message.author.username} deleted the game ${gameName}, including its channel and role.`, message.guild.id);
        rw.log("general", `The game's bot data and channel and role have been deleted.`);
      });
    }).catch(function(err)
    {
      rw.log("error", true, `channel delete() Error: `, {Game: game.name, Channel: channel.name}, err);
      message.author.send(`The game and its files have been deleted, but an error occurred when trying to delete the channel and role.`).catch((err) => {rw.log("error", true, `Error sending message: `, {User: message.author.username}, err);});
      newsModule.post(`${message.author.username} deleted the game ${gameName}, but an error occurred when trying to delete the channel and role.`, message.guild.id);
    });
  });
}

function fullDelete(message, game, channel, role)
{
  //for announcement purposes after deletion
  let gameName = game.name;

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
          message.author.send(`The game and its data and savefiles and channel and role have been deleted.`).catch((err) => {rw.log("error", true, `Error sending message: `, {User: message.author.username}, err);});
          newsModule.post(`${message.author.username} deleted the game ${gameName}, including its channel, role and savefiles.`, message.guild.id);
          rw.log("general", `The game's bot data, savefiles and channel and role have been deleted.`);
        });
      }).catch(function(err)
      {
        rw.log("error", true, `channel delete() Error: `, {Game: game.name, Channel: channel.name}, err);
        message.author.send(`The game and its files have been deleted, but an error occurred when trying to delete the channel and role.`).catch((err) => {rw.log("error", true, `Error sending message: `, {User: message.author.username}, err);});
        newsModule.post(`${message.author.username} deleted the game ${gameName}, but an error occurred when trying to delete the channel and role.`, message.guild.id);
      });
    });
  });
}

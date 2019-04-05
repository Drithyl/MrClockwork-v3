
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const hoster = require("../hoster.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}REGISTER`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "guild";

module.exports.getReadableCommand = function()
{
  return "register";
};

module.exports.getCommandArguments = ["`[a hosted game's name]`"];

module.exports.getHelpText = function()
{
  return `Creates a role and a channel for the given game. Bear in mind that hosting will normally already create these, therefore this command should only be necessary in very specific circumstances (like if the original game channel was deleted).`;
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
  var game;

  if (typeof options.args[0] !== "string")
  {
    message.channel.send(`You must specify for which game you are trying to create a channel.`);
    return;
  }

  game = options.games[options.args[0].toLowerCase().trim()];

  if (game == null)
  {
    message.channel.send(`The game ${options.args[0]} does not exist. Make sure you've spelled the name correctly.`);
    return;
  }

  if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, game.organizer.id) === false)
  {
    message.channel.send(`Sorry, you do not have the permissions to do this. Only this game's organizer (${game.organizer.user.username}) or GMs can do this.`);
    return;
  }

  rw.log("general", `${options.member.user.username} requested to register the game ${game.name}.`);

  channelFunctions.addGameChannelAndRole(game.name, game.organizer, game.isBlitz, function(err, channel, role)
  {
    if (err)
    {
      message.channel.send(`An error occurred when trying to create the channel and role for this game.`);
      return;
    }

    game.channel = channel;
    game.role = role;
    message.channel.send(`The channel and role have been created.`);
    rw.log("general", `The channel and role for the game ${game.name} have been created.`);
  });
};

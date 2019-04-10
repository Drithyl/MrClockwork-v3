
const config = require("../config.json");
const channelFunctions = require("../channel_functions.js");
const permissions = require("../permissions.js");
const rw = require("../reader_writer.js");
const hoster = require("../hoster.js");
const slaveServersModule = require("../slave_server.js");
const ipQuestion = new RegExp(`^what'*s*\\s*i*\\s*s*t?h?e?\\s*((ip)|(port))\\??`, `i`);

module.exports.enabled = true;

module.exports.ignoreHelp = true;

module.exports.getChannelRequiredToInvoke = "universal";

module.exports.getReadableCommand = function()
{
  return "";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Phrases and words that the bot will catch up on to reply with useful information.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage, wasSentInGameChannel)
{
  if (ipQuestion.test(message.content) === true && wasSentInGameChannel === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  if (ipQuestion.test(message.content) === true)
  {
    sendIPAndPort(message, options.member, options.game);
  }
};

function sendIPAndPort(message, member, game)
{
  if (member.roles.has(game.role.id) === true || permissions.equalOrHigher("gamemaster", member, message.guild.id) === true)
  {
    message.channel.send(`Check your PMs to find the IP and port.`);
    message.author.send(`The IP for ${game.name} is ${game.ip}. The port is ${game.port}.`);
  }

  else message.channel.send(`Only members with this game's role assigned can receive the IP and port. If you are playing this game but don't have its role assigned; contact ${game.organizer}.`);
}

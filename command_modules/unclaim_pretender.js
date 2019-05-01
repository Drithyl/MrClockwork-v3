
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}UNCLAIM`, `i`);

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "unclaim";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Removes the claim (without removing the submitted pretender from the game) from the pretender you had previously claimed.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage, wasSentInGameChannel)
{
  if (regexp.test(command) === true && wasSentInGameChannel === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  if (options.game.gameType !== config.dom5GameTypeName)
  {
    message.channel.send("Only Dominions 5 games support this function.");
    return;
  }

  if (options.game.isServerOnline === false)
  {
    message.channel.send("This game's server is not online.");
    return;
  }

  if (options.game.isBlitz === true)
  {
    message.channel.send(`Blitzes do not require pretenders to be claimed.`);
    return;
  }

  if (options.game.wasStarted === true && options.game.isConvertedToV3 !== true)
  {
    message.channel.send("You cannot remove a claim after the game has started.");
    return;
  }

  rw.log("general", `${message.author.username} requested to remove their claim for the game ${options.game.name}.`);
  options.game.unclaimPretender(options.member, function(err)
  {
    if (err)
    {
      message.channel.send(err);
      return;
    }

    options.member.removeRole(options.game.role);
    message.channel.send(`You have removed your claim on the nation you had selected.`);
    rw.log("general", `${message.author.username} removed their claim in the game ${options.game.name}.`);
  });
}

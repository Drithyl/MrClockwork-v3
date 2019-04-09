
const config = require("../config.json");
const permissions = require("../permissions.js");
const rw = require("../reader_writer.js");
const hoster = require("../hoster.js");
const regexp = new RegExp(`^${config.prefix}BLITZ`, `i`);
const cancelRegexp = new RegExp(`^${config.prefix}CANCEL`, `i`);
const backRegexp = new RegExp(`^${config.prefix}BACK`, `i`);
const gamesRegexp = new RegExp(`^((${config.dom4GameTypeName})|(${config.dom5GameTypeName}))`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "guild";

module.exports.getReadableCommand = function()
{
  return "blitz";
};

module.exports.getCommandArguments = ["`dom4`/`dom5`"];

module.exports.getHelpText = function()
{
  return `Command to host a new blitz. You must specify whether it's a dom4 or dom5 blitz.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  if (regexp.test(command) === true && isDirectMessage === false)
  {
    return true;
  }

  else if (hoster.hasOngoingInstance(message.author.id) === true && isDirectMessage === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  //don't trigger this branch when the command is host
  if (regexp.test(command) === false && hoster.hasOngoingInstance(message.author.id) === true)
  {
    if (cancelRegexp.test(command) === true)
    {
      hoster.cancelAssistedHosting(message, message.author.id);
    }

    else if (backRegexp.test(command) === true)
		{
			hoster.undoHostingStep(message, message.author.id);
		}

    else if (hoster.instanceHasServer(message.author.id) === false)
    {
      hoster.setGameServer(message, message.author.id);
    }

    else if (hoster.instanceHasName(message.author.id) === false)
		{
			hoster.setGameName(message, message.author.id);
		}

		else
		{
			hoster.validateInput(message, message.author.id);
		}

    return;
  }

  if (options.args[0] == null || typeof options.args[0] !== "string" || gamesRegexp.test(options.args[0]) === false)
  {
    message.channel.send("You must specify which game you want to host: `dom4` or `dom5`.");
    return;
  }

  if (permissions.equalOrHigher("trusted", options.member, message.guild.id) === false)
  {
    message.channel.send("Sorry, you do not have enough permissions to host a game. Only those with a trusted role can do this.");
    return;
  }

  if (hoster.hasOngoingInstance(options.member.id) === true)
  {
    message.channel.send(`You are already in the middle of an Assisted Hosting Instance. Please finish that one first. If you wish to cancel it, just type \`${config.prefix}cancel\` directly via private message to me.`);
    return;
  }

  hoster.startAssistedHosting(options.args[0].toLowerCase().trim(), options.member, true, function(err, response)
  {
    if (err)
    {
      message.channel.send(err);
      return;
    }

    message.author.send(response);
    rw.log("general", `Sent a DM to start the assisted hosting for a blitz game.`);
  });
};

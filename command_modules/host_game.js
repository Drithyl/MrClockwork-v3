
const config = require("../config.json");
const permissions = require("../permissions.js");
const rw = require("../reader_writer.js");
const hoster = require("../hoster.js");
const regexp = new RegExp(`^${config.prefix}HOST`, `i`);
const cancelRegexp = new RegExp(`^${config.prefix}CANCEL`, `i`);
const backRegexp = new RegExp(`^${config.prefix}BACK`, `i`);
const hereRegexp = new RegExp("^HERE", "i");
const blitzRegexp = new RegExp("^BLITZ", "i");
const gamesRegexp = new RegExp(`^(${config.dom4GameTypeName})|${config.dom5GameTypeName})`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "guild";

module.exports.getReadableCommand = function()
{
  return "host";
};

module.exports.getCommandArguments = ["`dom4`/`dom5`", "`here`/`blitz`"];

module.exports.getHelpText = function()
{
  return `Command to host a new game. It takes up to two arguments. The first argument must be the type of game you wish to host (dom4 or dom5). The second argument can either be \`here\` or \`blitz\`. \`here\` will host the game using the channel in which you used the command (for when you created the channel first with the channel command), while blitz will mark the game you're hosting as a blitz, making it appear in the blitz game categories.`;
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
  var isBlitz = false;

  if (hoster.hasOngoingInstance(message.author.id) === true)
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
    message.channel.send("You are already in the middle of an Assisted Hosting Instance. Please finish that one first. If you wish to cancel it, just type '%cancel' directly via private message to me.");
    return;
  }

  if (typeof options.args[1] === "string")
  {
    //Uses the channel in which the command was used as the dedicated channel for that game
    if (hereRegexp.test(options.args[1]) === true)
    {
      if (hoster.isChannelCreator(options.member.id, message.channel.id) === false)
      {
        message.channel.send("You have not created this channel. Only the channel creator can host a game in it.");
        return;
      }

      if (typeof options.args[2] === "string" && blitzRegexp.test(options.args[2]) === true)
      {
        isBlitz = true;
      }
    }

    else
    {
      if (blitzRegexp.test(options.args[1]) === true)
      {
        isBlitz = true;
      }

      if (hoster.hasPendingGameChannel(options.member.id, message.guild) === true)
      {
        message.channel.send("You cannot start a new Assisted Hosting Instance because you created a game channel that still has not had a game hosted.");
        return;
      }
    }
  }

  hoster.startAssistedHosting(options.args[0].toLowerCase().trim(), options.member, isBlitz, function(err, response)
  {
    if (err)
    {
      message.channel.send(err);
      return;
    }

    message.author.send(response);
    rw.log(null, `Sent a DM to start the assisted hosting.`);
  });
};

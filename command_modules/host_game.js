
const permissions = require("../permissions.js");
const rw = require("../reader_writer.js");
const hoster = require("../hoster.js");
const regexp = new RegExp("^HOST", "i");
const cancelRegexp = new RegExp("^CANCEL", "i");
const backRegexp = new RegExp("^BACK", "i");
const mapsRegexp = new RegExp("^MAPS", "i");
const modsRegexp = new RegExp("^MODS", "i");
const hereRegexp = new RegExp("^HERE", "i");
const blitzRegexp = new RegExp("^BLITZ", "i");
const gamesRegexp = new RegExp("^DOM(4|5)", "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "guild";

module.exports.getReadableCommand = function()
{
  return "host";
};

module.exports.getCommandArguments = ["`dom4`/`dom5`", "`here`/`blitz`"];

module.exports.getHelpText = function()
{
  return `Command to host a new game. It takes up to three arguments. The first argument must be the type of game you wish to host (dom4 or dom5). The second argument can either be \`here\` or \`blitz\`. \`here\` will host the game using the channel in which you used the command (for when you created the channel first with the channel command), while blitz will mark the game you're hosting as a blitz, making it appear in the blitz game categories.`;
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
  console.log("Assisted hosting command invoked");

  if (hoster.hasOngoingInstance(message.author.id) === true)
  {
    console.log("hoster has ongoing instance");
    if (cancelRegexp.test(command) === true)
    {
      console.log("cancel instance");
      hoster.cancelAssistedHosting(message, message.author.id);
    }

    else if (backRegexp.test(command) === true)
		{
      console.log("back one step");
			hoster.undoHostingStep(message, message.author.id);
		}

    else if (mapsRegexp.test(command))
    {
      console.log("get map list");
      hoster.sendMapList(message, message.author.id);
    }

    else if (modsRegexp.test(command))
    {
      console.log("get mod list");
      hoster.sendModList(message, message.author.id, options.args[0]);
    }

    else if (hoster.instanceHasName(message.author.id) === false)
		{
      console.log("no name, so set name");
			hoster.setGameName(message, message.author.id);
		}

		else
		{
      console.log("validate input");
			hoster.validateInput(message, message.author.id);
		}

    return;
  }

  if (options.args[0] == null || typeof options.args[0] !== "string" || gamesRegexp.test(options.args[0]) === false)
  {
    console.log("wrong gameType");
    message.channel.send("You must specify which game you want to host: `dom4` or `dom5`.");
    return;
  }

  if (permissions.equalOrHigher("trusted", options.member, message.guild.id) === false)
  {
    console.log("no trusted role");
    message.channel.send("Sorry, you do not have enough permissions to host a game. Only those with a trusted role can do this.");
    return;
  }

  if (hoster.hasOngoingInstance(options.member.id) === true)
  {
    console.log("already has an ongoing instance");
    message.channel.send("You are already in the middle of an Assisted Hosting Instance. Please finish that one first. If you wish to cancel it, just type '%cancel' directly via private message to me.");
    return;
  }

  if (typeof options.args[1] === "string")
  {
    console.log("2nd arg is string");
    //Uses the channel in which the command was used as the dedicated channel for that game
    if (hereRegexp.test(options.args[1]) === true)
    {
      console.log("2nd arg is here");
      if (hoster.isChannelCreator(options.member.id, message.channel.id) === false)
      {
        console.log("not the channel creator");
        message.channel.send("You have not created this channel. Only the channel creator can host a game in it.");
        return;
      }

      if (typeof options.args[2] === "string" && blitzRegexp.test(options.args[2]) === true)
      {
        console.log("it's a blitz");
        isBlitz = true;
      }
    }

    else
    {
      if (blitzRegexp.test(options.args[1]) === true)
      {
        console.log("it's a blitz");
        isBlitz = true;
      }

      if (hoster.hasPendingGameChannel(options.member.id) === true)
      {
        console.log("has pending channel");
        message.channel.send("You cannot start a new Assisted Hosting Instance because you created a game channel that still has not had a game hosted.");
        return;
      }
    }
  }

  console.log("passing to hoster to start assistant");
  hoster.startAssistedHosting(options.args[0].toLowerCase().trim(), options.member, isBlitz, function(err, response)
  {
    if (err)
    {
      console.log("error starting assistant");
      message.channel.send(err);
      return;
    }

    console.log("sending response to user");
    message.author.send(response);
    rw.log(null, `Sent a DM to start the assisted hosting.`);
  });
};

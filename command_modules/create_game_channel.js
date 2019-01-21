
const permissions = require("../permissions.js");
const hoster = require("../hoster.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp("^CHANNEL", "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "guild";

module.exports.getReadableCommand = function()
{
  return "channel";
};

module.exports.getCommandArguments = ["`[a channel name]`"];

module.exports.getHelpText = function()
{
  return `Creates a game channel so you can first discuss things with other players before actually hosting a long game. You must specify the name of the channel as the first argument of the command. Beware, you can only create a game channel as long as you don't have another created channel pending to have its game hosted. To host a game in the channel, refer to the host command.`;
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
  if (typeof options.args[0] !== "string")
  {
    message.channel.send(`This command requires a name for your channel as its first argument.`);
    return;
  }

  if (hoster.hasPendingGameChannel(options.member.id, message.guild) === true)
  {
    message.channel.send("You already have a game channel created. Please host and start that game first.");
    return;
  }

  if (permissions.equalOrHigher("trusted", options.member, message.guild.id) === false)
  {
    message.channel.send("Sorry, you do not have enough permissions to create a game channel. Only those with a trusted role can do this.");
    return;
  }

  if (hoster.isGameNameTaken(options.args[0]) === true)
  {
    message.channel.send(`A game with this name already exists. Please choose a different one.`);
    return;
  }

  //Characters other than digits, letters, dashes and underscores are not accepted
  if (/[^0-9A-Z\-_]/i.test(options.args[0]) === true)
  {
    message.channel.send(`Channel names can only contain digits, letters, dashes and underscores.`);
    return;
  }

  if (options.args[0].length > 60)
  {
    message.channel.send(`Please keep the channel names under 60 characters.`);
    return;
  }

  rw.log(null, `${options.member.user.username} requested to create a game channel called ${options.args[0]}.`);

  hoster.createGameChannel(options.args[0], options.member, false, function(err, channel)
  {
    if (err)
    {
      message.channel.send(`An error occurred when trying to create the channel.`);
      return;
    }

    message.channel.send(`The channel has been created.`);
    rw.log(null, `The game channel ${options.args[0]} was created.`);
  });
};

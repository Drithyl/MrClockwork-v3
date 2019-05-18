
const config = require("../config.json");
const permissions = require("../permissions.js");
const rw = require("../reader_writer.js");
const newsModule = require("../news_posting.js");
const regexp = new RegExp(`^${config.prefix}POST`, "i");

module.exports.enabled = true;

module.exports.ignoreHelp = true;

module.exports.getChannelRequiredToInvoke = "dm";

module.exports.getReadableCommand = function()
{
  return "post";
};

module.exports.getCommandArguments = ["`A message to post in the news channels.`"];

module.exports.getHelpText = function()
{
  return `Posts a message in all of the guilds' news channels.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  if (regexp.test(command) === true && isDirectMessage === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  if (options.args[0] == null)
  {
    message.author.send(`You must add a message to post in the news channels.`);
    return;
  }

	if (permissions.isServerOwner(message.author.id) === false)
	{
		message.channel.send(`Sorry, you do not have the permissions to do this. Only server owners can do this.`);
    return;
	}

  if (/^\@trusted/i.test(options.args[0]) === true)
  {
    //remove the mention as it will be added in the newsModule properly to ping
    options.args.shift();
    newsModule.post(options.args.join(" "), null, "trusted");
  }

  else newsModule.post(options.args.join(" "));
}


const config = require("../config.json");
const permissions = require("../permissions.js");
const rw = require("../reader_writer.js");
const hoster = require("../hoster.js");
const slaveServersModule = require("../slave_server.js");
const regexp = new RegExp(`^${config.prefix}MAPS`, `i`);
const dom4Regexp = new RegExp(`${config.dom4GameTypeName}`, "i");
const dom5Regexp = new RegExp(`${config.dom5GameTypeName}`, "i");

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "dm";

module.exports.getReadableCommand = function()
{
  return "maps";
};

module.exports.getCommandArguments = ["`dom4`/`dom5`", "`A server's name`"];

module.exports.getHelpText = function()
{
  return `Receive a list of the dom4/5 maps available in the given server. You can see a list of servers if you use this command without any arguments.`;
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
  if ((typeof options.args[0] !== "string" && typeof options.args[1] !== "string") || typeof options.args[1] !== "string")
  {
    message.channel.send(`Here is a list of the servers currently online. You must specify for which server you want to see the maps by adding its name at the end of the command, i.e. \`${config.prefix}maps dom5 myChosenServer\`:\n\n\`\`\`${slaveServersModule.getList()}\`\`\``);
    return;
  }

  if (typeof options.args[0] !== "string" || (dom4Regexp.test(options.args[0]) === false && dom5Regexp.test(options.args[0]) === false))
  {
    message.channel.send(`You must specify which server's maps you want to see; \`${config.dom4GameTypeName}\` or \`${config.dom4GameTypeName}\`.`);
    return;
  }

  hoster.sendMapList(options.args[0], options.args[1], message);
};

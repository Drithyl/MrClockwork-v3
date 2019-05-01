
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}REMOVE`, `i`);
const pretendersModule = require("./get_submitted_pretenders.js")
var pretenderInput = pretendersModule.pretenderInput;
var pretendersCommand = `${config.prefix}${pretendersModule.getReadableCommand()}`;

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "remove";
};

module.exports.getCommandArguments = [`A number from the list obtained with the \`${pretendersCommand}\` command`];

module.exports.getHelpText = function()
{
  return `Removes a pretender (both the claim and the file) from the list received when using the \`${pretendersCommand}\`, i.e. \`${config.prefix}${module.exports.getReadableCommand()} 1\`.`;
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

  if (pretenderInput[options.game.name] == null || pretenderInput[options.game.name][message.author.id] == null)
  {
    message.channel.send(`You must use the \`${pretendersCommand}\` command first, to display the current pretenders submitted.`);
    return;
  }

  if (isNaN(+options.args[0]) === true || pretenderInput[options.game.name][message.author.id][+options.args[0]] == null)
  {
    message.channel.send(`You must specify the number of the nation that you wish to remove. To see the nations submitted, use the \`${pretendersCommand}\` command.`);
    return;
  }

  if (pretenderInput[options.game.name] == null || pretenderInput[options.game.name][message.author.id] == null)
  {
    message.channel.send("Your input was lost. Please start over.");
    return;
  }

  if (isNaN(+options.args[0]) === true || Number.isInteger(+options.args[0]) === false)
  {
    message.channel.send("Select a number from the list.");
    return;
  }

  nation = pretendersModule.getSubmittedNation(options.game.name, message.author.id, +options.args[0]);

  if (nation == null)
  {
    message.channel.send(`Select a number from the list.`);
    return;
  }

  if (options.game.wasStarted === true && options.game.isConvertedToV3 !== true)
  {
    message.channel.send("You cannot remove a pretender after the game has started.");
    return;
  }

  rw.log("general", `${message.author.username} requested to remove the nation ${nation.filename} from the game ${options.game.name}.`);
  message.channel.send(`Attempting to remove the pretender...`);

  options.game.removePretender(nation.filename, options.member, function(err)
  {
    if (err)
    {
      message.channel.send(err);
      pretendersModule.deleteInput(options.game.name, message.author.id);
      return;
    }

    message.channel.send(`The pretender for ${nation.name} has been deleted.`);
    rw.log("general", `The pretender for ${nation.name} has been deleted in the game ${options.game.name}.`);
    pretendersModule.deleteInput(options.game.name, message.author.id);
  });
}

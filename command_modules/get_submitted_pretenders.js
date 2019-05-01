
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const regexp = new RegExp(`^${config.prefix}PRETENDER`, `i`);
var pretenderInput = {};
module.exports.pretenderInput = pretenderInput;

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "pretenders";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Displays a list of submitted pretenders in the game hosted in the channel. You can then claim a pretender, unclaim it, remove it or designate a substitute for it.`;
};

//to be called by the other pretender commands
module.exports.deleteInput = function(gameName, id)
{
  delete pretenderInput[gameName][id];
};

module.exports.getSubmittedNation = function(gameName, id, index)
{
  return pretenderInput[gameName][id][index];
}

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

  getSubmittedPretenders(message, options.game);
}

function getSubmittedPretenders(message, game)
{
  var listString = "";

  //the list returned is an array of objects containing the nation name and filename, so that
  //the nation name can be shown to players, and the filename used internally for removing it.
  game.getSubmittedPretenders(function(err, list)
  {
    if (err)
    {
      message.channel.send(`An error occurred when fetching the list of pretenders:\n\n\t${err}`);
      return;
    }

    if (pretenderInput[game.name] == null)
    {
      pretenderInput[game.name] = {};
    }

    pretenderInput[game.name][message.author.id] = list;

    list.forEach(function(nation, index)
    {
      let player = game.getPlayerRecord(nation.filename);

      if (player != null)
      {
        if (player.member == null)
        {
          listString += `${index}. ${nation.fullName}`.width("40") + `Did player leave Guild? Member object not found\n`;
        }

        else listString += `${index}. ${nation.fullName}`.width("40") + `${player.member.user.username}\n`;
      }

      else listString += `${index}. ${nation.fullName}\n`;
    });

    if (game.wasStarted === true)
    {
      message.channel.send(`Here is the list of pretenders and players who control them. You can type \`${config.prefix}sub\` followed by one of the numbers and a mention (\`@username\`) to a user to designate a substitute (this should be done with their consent)\n\n${listString.toBox()}`);
    }

    else if (listString === "")
    {
      message.channel.send(`There are no pretenders submitted yet.`);
    }

    else message.channel.send(`Here is the list of submitted pretenders. You can type \`${config.prefix}claim\`, \`${config.prefix}unclaim\` or \`${config.prefix}remove\` followed by one of the numbers to claim, unclaim or remove one of them. You can also type \`${config.prefix}sub\` followed by one of the numbers and a mention (\`@username\`) to a user to designate a substitute (this should be done with their consent):\n\n${listString.toBox()}`);
  });
}

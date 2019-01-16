
const config = require("../config.json");
const permissions = require("../permissions.js");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const listRegexp = new RegExp("^PRETENDER", "i");
const claimRegexp = new RegExp("^CLAIM", "i");
const subRegexp = new RegExp("^SUB", "i");
const removeRegexp = new RegExp("^REMOVE", "i");
var pretenderInput = {};

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
  return `Displays a list of submitted pretenders in the game hosted in the channel. You can then claim a pretender, remove it or designate a substitute for it.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  if ((listRegexp.test(command) === true ||
       subRegexp.test(command) === true ||
       claimRegexp.test(command) === true ||
       removeRegexp.test(command) === true) &&
      isDirectMessage === false)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  var nation;
  var game = channelFunctions.getGameThroughChannel(message.channel.id, options.games);

  if (game == null)
  {
    message.channel.send("The game is not in my list of saved games.");
    return;
  }

  if (game.gameType !== config.dom4GameTypeName)
  {
    message.channel.send("Only Dominions 5 games support this function.");
    return;
  }

  if (game.isServerOnline === false)
  {
    message.channel.send("This game's server is not online.");
    return;
  }

  if (listRegexp.test(command) === true)
  {
    getSubmittedPretenders(message, game);
    return;
  }

  if (pretenderInput[game.name] == null || pretenderInput[game.name][message.author.id] == null)
  {
    message.channel.send(`You must use the \`${config.prefix}pretenders\` command first, to display the current pretenders submitted.`);
    return;
  }

  if (isNaN(+options.args[0]) === true || pretenderInput[game.name][message.author.id][+options.args[0]] == null)
  {
    message.channel.send(`You must specify the number of the nation that you wish to claim/remove/sub. To see the nations submitted, use the \`${config.prefix}pretenders\` command.`);
    return;
  }

  nation = pretenderInput[game.name][message.author.id][+options.args[0]];

  if (pretenderInput[game.name] == null || pretenderInput[game.name][message.author.id] == null)
  {
    message.channel.send("Your input was lost. Please start over.");
    return;
  }

  if (isNaN(+options.args[0]) === true || Number.isInteger(+options.args[0]) === false)
  {
    message.channel.send("Select a number from the list.");
    return;
  }

  if (pretenderInput[game.name][message.author.id][+options.args[0]] == null)
  {
    message.channel.send(`Select a number from the list.`);
    return;
  }

  nation = pretenderInput[game.name][message.author.id][+options.args[0]];

  //If the user is not a game master nor the guy that submitted the pretender, he can't unsubmit it
  if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, game.organizer) === false &&
      game.getPretenderPlayer(nation) !== member.id)
  {
    message.channel.send("Only a gameMaster or the player who submitted this nation can do this.");
    return;
  }

  if (subRegexp.test(command) === true)
  {
    subPretender(message, game, +options.args[0], options.member);
    return;
  }

  if (game.wasStarted === true)
  {
    message.channel.send("You cannot claim or remove a pretender after the game has started.");
    return;
  }

  if (claimRegexp.test(command) === true)
  {
    claimPretender(message, game, +options.args[0], options.member);
  }

  else if (removeRegexp.test(command) === true)
  {
    removePretender(message, game, +options.args[0], options.member);
  }

  else
  {
    rw.logError({Game: game.name, Args: options.args}, `Command was invoked, but no case was recognized.`);
    message.channel.send("An error occurred.");
  }
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
      message.channel.send(`An error occurred when fetching the list of pretenders.`);
      return;
    }

    if (pretenderInput[game.name] == null)
    {
      pretenderInput[game.name] = {};
    }

    pretenderInput[game.name][message.author.id] = list;

    list.forEach(function(nation, index)
    {
      if (nation.player != null)
      {
        listString += `${index}. ${nation.name}`.width("40") + `${nation.player.user.username}\n`;
      }

      else listString += `${index}. ${nation.name}\n`;
    });

    if (game.wasStarted === true)
    {
      message.channel.send(`Here is the list of pretenders and players who control them. You can type \`%sub\` followed by one of the numbers and a mention (\`@username\`) to a user to designate a substitute (this should be done with their consent)\n\n${listString.toBox()}`);
    }

    else if (listString === "")
    {
      message.channel.send(`There are no pretenders submitted yet.`);
    }

    else message.channel.send(`Here is the list of submitted pretenders. You can type \`%claim\` or \`%remove\` followed by one of the numbers to claim or remove one of them. You can also type \`%sub\` followed by one of the numbers and a mention (\`@username\`) to a user to designate a substitute (this should be done with their consent):\n\n${listString.toBox()}`);
  });
}

function subPretender(message, game, number, member)
{
  var nation = pretenderInput[game.name][message.author.id][number];
  var subMemberEntry = message.mentions.members.values().next();

  if (subMemberEntry.value == null)
  {
    message.channel.send(`You must mention (\`@username\`) the user that will sub for the nation in your command.`);
    return;
  }

  game.subPretender(nation.filename, subMemberEntry.value, function(err)
  {
    if (err)
    {
      message.channel.send(err);
      deleteInput(game.name, message.author.id);
      return;
    }

    //remove the member's role if he is the pretender owner, as he is no longer in the game
    if (game.isPretenderOwner(nation.filename, member.id) === true)
    {
      member.removeRole(game.role, `Designated ${subMemberEntry.value.user.username} as a sub.`);
    }

    subMemberEntry.value.addRole(game.role, `Was designated as a sub by ${member.user.username}.`);
    message.channel.send(`You have designated ${subMemberEntry.value.user.username} as the substitute for the nation ${nation.name}.`);
    subMemberEntry.value.send(`You have been designated as the substitute for the nation ${nation.name} in the game ${game.name} (in the channel ${game.channel.name}, from the guild ${game.guild.name}). If this has been done without your consent, please contact the game's organizer (${game.organizer.user.username}), a GM or an Admin.`);
    rw.log(null, `${subMemberEntry.value} has been designated as the substitute for the nation ${nation.name} in the game ${game.name} and guild ${game.guild.name}.`);
    deleteInput(game.name, message.author.id);
  });
}

function claimPretender(message, game, number, member)
{
  var nation = pretenderInput[game.name][message.author.id][number];

  game.claimPretender(nation.filename, member, function(err)
  {
    if (err)
    {
      message.channel.send(err);
      deleteInput(game.name, message.author.id);
      return;
    }

    member.addRole(game.role);
    message.channel.send(`You have claimed the pretender for the nation ${nation.name}.`);
    rw.log(null, `The pretender for the nation ${nation.name} has been claimed.`);
    deleteInput(game.name, message.author.id);
  });
}

function removePretender(message, game, number, member)
{
  var nation = pretenderInput[game.name][message.author.id][number];

  game.removePretender(nation.filename, member, function(err)
  {
    if (err)
    {
      message.channel.send(err);
      deleteInput(game.name, message.author.id);
      return;
    }

    message.channel.send(`The pretender for ${nation.name} has been deleted.`);
    rw.log(null, `The pretender for ${nation.name} has been deleted.`);
    deleteInput(game.name, message.author.id);
  });
}

function deleteInput(gameName, userID)
{
  delete pretenderInput[gameName][userID];
}

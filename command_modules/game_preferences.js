
const config = require("../config.json");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const scoregraphsModule = require("../settings/dom5/scoregraphs.js");
const startRegexp = new RegExp(`^${config.prefix}PREFERENCES`, "i");
const finishRegexp = new RegExp("^FINISH", "i");
const backRegexp = new RegExp("^BACK", "i");
const numberRegexp = new RegExp("^\\d+", "i");
var usersManagingPreferences = {};

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom4GameTypeName, config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "preferences";
};

module.exports.getCommandArguments = [];

module.exports.getHelpText = function()
{
  return `Displays the preferences menu of the game hosted in this channel by sending you a PM (Private Message). In that menu you will find options to set turn reminders and automated turn backups. Make sure to use the \`finish\` command when you're done, as there are several commands that display a menu for the user.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  //User typed command to start the preferences manager
  if (startRegexp.test(command) === true && isDirectMessage === false && options.game.gameType === config.dom5GameTypeName)
  {
    return true;
  }

  //User DMed the bot responding to the manager
  else if (usersManagingPreferences[message.author.id] != null && isDirectMessage === true &&
           (finishRegexp.test(command) === true || backRegexp.test(command) === true ||
            numberRegexp.test(command) === true))
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  var game;

  if (usersManagingPreferences[message.author.id] != null && options.isDM === true)
  {
    handleInput(message.author.id, command);
    return;
  }

  game = channelFunctions.getGameThroughChannel(message.channel.id, options.games);

  if (game == null)
  {
    message.channel.send(`You can only use this command within the channel of the game for which you wish to manage your preferences.`);
    return;
  }

  if (game.gameType !== config.dom4GameTypeName && game.gameType !== config.dom5GameTypeName)
  {
    message.channel.send("Only Dominions games support this function.");
    return;
  }

  usersManagingPreferences[options.member.id] = {game: game, member: options.member, currentMenu: 0, preferences: generateGamePreferences(game, options.member)};
  options.member.send(displayMainMenu(game, options.member, usersManagingPreferences[options.member.id].preferences));
};

module.exports.sendReminders = function(game, hoursLeft, dump = null)
{
  var userIDs = Object.keys(game.reminders);

  userIDs.forEachAsync(function(id, index, next)
  {
    //don't send reminders to players that went AI or were subbed out; this is only supported by dom5
    if (game.gameType === config.dom5GameTypeName && (game.players[id].nation == null || game.players[id].wentAI === true || game.players[id].subbedOutBy != null))
    {
      next();
      return;
    }

    game.guild.fetchMember(id).then(function(member)
  	{
      if (game.players[id].reminders.includes(hoursLeft) === false)
      {
        next();
        return;
      }

      //dom4 games do not contain player-claimed nations, so cannot give accurate info
      if (game.players[id].nation == null)
      {
        member.send(`There are ${hoursLeft} hours left for ${game.name}'s turn to roll. If you have already done your turn, you can ignore this, but double-checking that the turn went through is always a good idea.`).catch((err) => {rw.logError({User: member.user.username}, `Error sending message: `, err);});
        next();
        return;
      }

      if (dump[game.players[id].nation.filename].controller !== 1)
      {
        next();
        return;
      }

      else if (dump[game.players[id].nation.filename].turnPlayed === 1)
      {
        member.send(`There are ${hoursLeft} hours left for ${game.name}'s turn to roll, and your turn status is:\n\n**Marked as unfinished.**`).catch((err) => {rw.logError({User: member.user.username}, `Error sending message: `, err);});
      }

      else if (dump[game.players[id].nation.filename].turnPlayed === 2)
      {
        member.send(`There are ${hoursLeft} hours left for ${game.name}'s turn to roll, and your turn status is:\n\n**Done.**`).catch((err) => {rw.logError({User: member.user.username}, `Error sending message: `, err);});
      }

      else member.send(`There are ${hoursLeft} hours left for ${game.name}'s turn to roll, and your turn status is:\n\n**Not done.**`).catch((err) => {rw.logError({User: member.user.username}, `Error sending message: `, err);});

      next();
  	})
    .catch(function(err)
    {
      rw.log(null, `Member ${id} could not be found, so the reminder at ${hoursLeft} hours left for the game ${game.name} was skipped.`);
    });;
  });
}

module.exports.sendAllPlayerTurnBackups = function(game, cb)
{
  let ids = Object.keys(game.players);

  ids.forEachAsync(function(id, index, next)
  {
    game.guild.fetchMember(id).then(function(member)
  	{
      //Don't send backups to those who went AI or were subbed out
      if (game.players[id].nation == null || game.players[id].wentAI === true || game.players[id].subbedOutBy != null)
      {
        next();
        return;
      }

      game.getNationTurnFile(game.players[id].nation.filename, function(err, buffer)
      {
        if (err)
        {
          member.send(err);
          next();
          return;
        }

        member.send({files: [{attachment: buffer, name: `${game.name}_Turn_${game.getLocalCurrentTimer().turn}_${nationFilename}.2h`}]}).then(function()
        {
          next();

        }).catch(function(err)
        {
          rw.logError({User: member.user.username}, `Error sending message with attachment: `, err);
          member.send(`Could not send the attachment.`);
        });
      });
  	});

  }, cb);
};

module.exports.sendScoreDumpsToPlayers = function(game, cb)
{
  let ids = Object.keys(game.players.filter((player) => player.isReceivingScoreDumps === true && player.nation != null && player.wentAI === false && player.subbedOutBy == null));

  ids.forEachAsync(function(id, index, next)
  {
    game.guild.fetchMember(id).then(function(member)
  	{
      game.getScoreDump(function(err, buffer)
      {
        if (err)
        {
          member.send(err);
          next();
          return;
        }

        member.send({files: [{attachment: buffer, name: `${game.name}_Turn_${game.getLocalCurrentTimer().turn}.html`}]}).then(function()
        {
          next();

        }).catch(function(err)
        {
          rw.logError({User: member.user.username}, `Error sending message with attachment: `, err)
          member.send(`Could not send the attachment.`);
        });
      });
  	});

  }, cb);
};

function displayMainMenu(game, member, preferences)
{
  var mainMenuText = `Choose a number from the menu below to manage your preferences for the game ${game.name}:\n`;

  preferences.forEach(function(pref, i)
  {
    mainMenuText += `\n\t${i}. ${pref.text}.`
  });

  return mainMenuText;
}

function generateGamePreferences(game, member)
{
  var preferences =
  [
    {fn: displayReminders, text: "View reminders"},
    {fn: displayAddRemindersMenu, text: "Add reminders"},
    {fn: displayRemoveRemindersMenu, text: "Remove reminders"},
    {fn: removeAllReminders, text: "Stop every reminder for this game"}
  ];

  //dom5 games support new turn backups
  if (game.gameType === config.dom5GameTypeName)
  {
    if (game.players[member.id].isReceivingBackups === true)
    {
      preferences.push({fn: toggleTurnBackups, text: "Stop receiving turn files every new turn"});
    }

    else preferences.push({fn: toggleTurnBackups, text: "Start receiving turn files every new turn"});
  }

  //dom5 games support score dumps to be sent to players when graphs setting is on
  if (game.gameType === config.dom5GameTypeName && scoregraphsModule.areScoregraphsOn(game.settings[scoregraphsModule.getKey()]) === true)
  {
    if (game.players[member.id].isReceivingScoreDumps === true)
    {
      preferences.push({fn: toggleScoreDumps, text: "Stop receiving score files every new turn"});
    }

    else preferences.push({fn: toggleScoreDumps, text: "Start receiving score files every new turn"});
  }

  //TODO: automated unrequested extensions, available only to game organizers
  /*if (member.id === game.organizer.id)
  {
    preferences.push({fn: displayUnrequestedExtensions})
  }*/

  preferences.push({fn: finish, text: "Finish"});

  return preferences;
}

function handleInput(id, input)
{
  var instance = usersManagingPreferences[id];

  if (finishRegexp.test(input) === true)
  {
    instance.member.send(`You have closed the preference manager for the game ${instance.game.name}.`);
    delete usersManagingPreferences[id];
  }

  else if (instance.currentMenu === 0)
  {
    if (instance.preferences[+input] == null)
    {
      instance.member.send(`Please choose a number among those in the menu given.`);
      return;
    }

    //delegate the function call to whichever option was displayed at that index,
    //based on the preferences generated in generateGamePreferences()
    instance.preferences[+input].fn(instance);
  }

  else if (backRegexp.test(input) === true)
  {
    instance.currentMenu = 0;
    instance.member.send(displayMainMenu(instance.game, instance.member, instance.preferences));
  }

  else if (instance.currentMenu === 2)
  {
    addReminder(instance, input);
  }

  else if (instance.currentMenu === 3)
  {
    removeReminder(instance, input);
  }

  else
  {
    rw.logError({id: id, input: input, currentMenu: instance.currentMenu, instance: instance}, `currentMenu unrecognized.`);
    instance.member.send(`A problem occurred; the manager cannot identify which menu you are on. You will have to restart the assistant again from the beginning.`);
    delete usersManagingPreferences[id];
  }
}

function finish(instance)
{
  instance.member.send(`The managing assistant has been closed.`);
  delete usersManagingPreferences[instance.member.id];
}

function displayReminders(instance)
{
  var msg = "";

  if (instance.game.players[instance.member.id].reminders.length < 1)
  {
    instance.member.send("You have no reminders set for this game.");
    return;
  }

  instance.game.players[instance.member.id].reminders.sort(function(a, b)
  {
    return a - b;
  }).forEach(function(reminder)
  {
    msg += "At **" + reminder + " h** left.\n";
  });

  instance.member.send(msg);
};

function displayAddRemindersMenu(instance)
{
  instance.currentMenu = 2;
  instance.member.send(`Type a number of hours left for the turn to roll at which you would like to be notified, \`back\` to go back to the main menu, or \`finish\` to finish managing your preferences. You can see your existing reminders for this game below:`).then(displayReminders(instance));
};

function displayRemoveRemindersMenu(instance)
{
  instance.currentMenu = 3;
  instance.member.send(`Type a number of hours left to remove that reminder, \`back\` to go back to the main menu, or \`finish\` to finish managing your preferences. You can see your existing reminders for this game below:`).then(displayReminders(instance));
};

function removeAllReminders(instance)
{
  instance.game.players[instance.member.id].reminders = [];
  instance.member.send(`All your reminders for the game ${instance.game.name} have been removed.`);
};

function toggleTurnBackups(instance)
{
  //dom5 games support new turn backups
  if (instance.game.gameType !== config.dom5GameTypeName)
  {
    instance.member.send(`Only Dominions 5 games support this feature.`);
    return;
  }

  if (instance.game.players[instance.member.id].isReceivingBackups === false)
  {
    instance.game.togglePlayerBackups(instance.member.id);
    instance.member.send(`You will now receive your turn file here with every new turn.`);
    return;
  }

  else
  {
    instance.game.togglePlayerBackups(instance.member.id);
    instance.member.send(`You will no longer receive new turn files.`);
  }
}

function toggleScoreDumps(instance)
{
  //dom5 games support new turn backups
  if (instance.game.gameType !== config.dom5GameTypeName)
  {
    instance.member.send(`Only Dominions 5 games support this feature.`);
    return;
  }

  if (instance.game.players[instance.member.id].isReceivingScoreDumps === false)
  {
    instance.game.togglePlayerScoreDumps(instance.member.id);
    instance.member.send(`You will now receive a score file here with every new turn.`);
    return;
  }

  else
  {
    instance.game.togglePlayerScoreDumps(instance.member.id);
    instance.member.send(`You will no longer receive new score files.`);
  }
}

function addReminder(instance, input)
{
  if (isNaN(+input) === true)
  {
    instance.member.send(`You must type in a number of hours for a reminder.`);
    return;
  }

  if (+input <= 0 || +input > 360)
  {
    instance.member.send(`The hour mark must be more than zero and 360 or less.`);
    return;
  }

  if (instance.game.players[instance.member.id].reminders.includes(+input) === true)
  {
    instance.member.send(`You already have a reminder set for this hour mark.`);
    return;
  }

  instance.game.players[instance.member.id].reminders.push(+input);

  instance.member.send(`Your reminder has been added. Type another hour mark to add it as a reminder, \`back\` to go back to the main menu, or \`finish\` to finish managing your preferences.`);
};

function removeReminder(instance, input)
{
  if (isNaN(+input) === true)
  {
    instance.member.send(`You must type in a number of hours.`);
    return;
  }

  if (instance.game.players[instance.member.id].reminders.includes(+input) === false)
  {
    instance.member.send(`You do not have this hour mark within your reminders.`);
    return;
  }

  instance.game.players[instance.member.id].reminders.splice(instance.game.players[instance.member.id].reminders.indexOf(+input), 1);
  instance.member.send(`Your reminder has been removed. Type another hour mark to remove it from your reminders, \`back\` to go back to the main menu, or \`finish\` to finish managing your preferences.`);
}

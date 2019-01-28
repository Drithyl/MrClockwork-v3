
const config = require("../config.json");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const permissions = require("../permissions.js");
const translator = require("../translator.js");
const startRegexp = new RegExp(`^${config.prefix}SETTINGS`, "i");
const finishRegexp = new RegExp("^FINISH$", "i");
var usersChangingSettings = {};

//Load indexes to load each setting module in the proper order
const dom5SettingsIndex = require("../settings/dom5/index.js");
var dom5Settings = [];

dom5SettingsIndex.forEach(function(filename)
{
  dom5Settings.push(require(`../settings/dom5/${filename}`));
});

module.exports.enabled = true;

module.exports.gameTypesSupported = [config.dom5GameTypeName];

module.exports.getChannelRequiredToInvoke = "game";

module.exports.getReadableCommand = function()
{
  return "settings";
};

module.exports.getHelpText = function()
{
  return `Allows the organizer of a game to change its settings if the game hasn't started yet. When invoked, a numbered list of settings will be presented through a private message, and you'll be able to choose which one to change by replying to the message with its number. A cue will then follow to let you know in what format the setting is expected.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  //User typed command to start the reminder manager
  if (startRegexp.test(command) === true && isDirectMessage === false)
  {
    return true;
  }

  //User DMed the bot responding to the manager
  else if (usersChangingSettings[message.author.id] != null && isDirectMessage === true)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  var game;

  if (usersChangingSettings[message.author.id] != null && options.isDM === true)
  {
    handleInput(message.author.id, message.content);
    return;
  }

  game = channelFunctions.getGameThroughChannel(message.channel.id, options.games);

  if (game == null)
  {
    message.channel.send(`You can only use this command within the channel of the game for which you want to change settings.`);
    return;
  }

  if (game.gameType !== config.dom5GameTypeName)
  {
    message.channel.send(`Only Dominions 5 games support this function.`);
    return;
  }

  if (game.isServerOnline === false)
  {
    message.channel.send("This game's server is not online.");
    return;
  }

	if (permissions.equalOrHigher("gameMaster", options.member, message.guild.id, game.organizer.id) === false)
	{
		message.channel.send(`Sorry, you do not have the permissions to do this. Only this game's organizer (${game.organizer.user.username}) or GMs can do this.`);
    return;
	}

	if (game.wasStarted === true)
	{
		message.channel.send("The settings of a game can only be changed if it has not started.");
    return;
	}

  usersChangingSettings[options.member.id] = {game: game, member: options.member, currentMenu: 0};
  options.member.send(displayMainMenu(usersChangingSettings[options.member.id]));
};

function displayMainMenu(userChangingSettings)
{
  var str = `Choose a number from the menu below to change a setting for the game ${userChangingSettings.game.name}, or type \`finish\` to finish changing settings.:\n\n`;

  dom5Settings.forEach(function(mod, index)
  {
    if (index < dom5Settings.length)
    {
      str += `\t${index}. ${mod.getName()}.\n`;
    }
  });

  return str;
}

function handleInput(id, input)
{
  var instance = usersChangingSettings[id];

  if (finishRegexp.test(input) === true)
  {
    delete usersChangingSettings[id];
    instance.member.send(`You have finished changing settings.`);
  }

  //number selected, send setting cue
  else if (instance.currentMenu === 0)
  {
    if (isNaN(+input) === true || dom5Settings[+input].getCue() == null)
    {
      instance.member.send(`You must select a number from the list to change the setting.`);
      return;
    }

    instance.member.send(`${dom5Settings[+input].getCue()} Current setting is \`${dom5Settings[+input].toInfo(instance.game.settings[dom5Settings[+input].getKey()])}\`.`);
    instance.selectedSettingIndex = +input;
    instance.currentMenu = 1;
  }

  //setting input received, validate it and change it
  else if (instance.currentMenu === 1)
  {
    changeSetting(dom5Settings[instance.selectedSettingIndex].getKey(), input, instance.game, function(err)
    {
      //reset the menu regardless of the result
      delete instance.selectedSettingIndex;
      instance.currentMenu = 0;

      if (err)
      {
        instance.member.send(err);
        return;
      }

      instance.game.save(function(err)
      {
        if (err)
        {
          instance.member.send(`The setting change could not be saved.`);
          return;
        }

        instance.game.saveSettings(function(err)
        {
          if (err)
          {
            instance.member.send(`The setting change could not be saved on the slave server.`);
            return;
          }

          instance.game.kill(function(err)
          {
            if (err)
            {
              instance.member.send(`The setting has been changed successfully but the game task failed to be killed to be rebooted. Try killing it manually using the assigned command. You can also select a different number if you want to change a setting, or type \`finish\` to finish changing settings.`);
              return;
            }

            instance.game.host(null, function(err)
            {
              if (err)
              {
                instance.member.send(`The setting has been changed successfully but the game task failed to be launched again. Try launching it manually using the assigned command. You can also select a different number if you want to change a setting, or type \`finish\` to finish changing settings.`);
                return;
              }

              instance.member.send(`The setting has been changed successfully! Select a different number if you want to change a setting, or type \`finish\` to finish changing settings.`)
            });
          });
        });
      });
    });
  }

  else
  {
    rw.logError({id: id, input: input, currentMenu: instance.currentMenu}, `currentMenu unrecognized.`);
    instance.member.send(`A problem occurred; the manager cannot identify which menu you are on. You will have to restart the assistant again from the beginning.`);
    delete usersChangingSettings[id];
  }
}

function changeSetting(key, input, game, cb)
{
  var setting = dom5Settings.find(function(mod)
  {
    if (mod.getKey().toLowerCase() === key.toLowerCase().trim())
    {
      return mod;
    }
  });

  if (typeof setting.validate !== "function")
  {
    rw.logError({key: key, input: input, game: game.name}, `The key does not correspond to any setting.`);
    cb(`There was an error when trying to change this setting.`);
    return;
  }

  //game is passed as the settings object since it contains all the same keys as a
  //validatedSettings that's used during the hosting process
  setting.validate(input, game.settings, game.server, function(err, validatedSetting)
  {
    if (err)
    {
      cb(err);
      return;
    }

    game.settings[key] = validatedSetting;
    cb(null);
  });
}

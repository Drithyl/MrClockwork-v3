
const config = require("../config.json");
const channelFunctions = require("../channel_functions.js");
const rw = require("../reader_writer.js");
const permissions = require("../permissions.js");
const translator = require("../translator.js");
const newsModule = require("../news_posting.js");
const settingsLoader = require("../settings/loader.js");
const startRegexp = new RegExp(`^${config.prefix}SETTINGS`, "i");
const finishRegexp = new RegExp(`^${config.prefix}FINISH$`, "i");
var usersChangingSettings = {};

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
  else if (usersChangingSettings[message.author.id] != null && isDirectMessage === true && (finishRegexp.test(command) === true || command.indexOf(config.prefix) !== 0))
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

  usersChangingSettings[options.member.id] = {game: game, member: options.member, currentMenu: 0, settingModules: settingsLoader.getAll(game.gameType)};
  options.member.send(displayMainMenu(usersChangingSettings[options.member.id]));
};

function displayMainMenu(instance)
{
  var str = `Choose a number from the menu below to change a setting for the game ${instance.game.name}, or type \`${config.prefix}finish\` to finish changing settings.:\n\n`;

  instance.settingModules.forEach(function(mod, index)
  {
    str += `\t${index}. ${mod.getName()}.\n`;
  });

  return str;
}

function handleInput(id, input)
{
  var instance = usersChangingSettings[id];

  if (finishRegexp.test(input) === true)
  {
    finishChanging(instance.member);
  }

  //number selected, send setting cue
  else if (instance.currentMenu === 0)
  {
    sendSettingCue(input, instance);
  }

  //setting input received, validate it and change it
  else if (instance.currentMenu === 1)
  {
    changeSettingAndSave(input, instance);
  }

  else
  {
    rw.log("error", true, {id: id, input: input, currentMenu: instance.currentMenu}, `currentMenu unrecognized.`);
    instance.member.send(`A problem occurred; the manager cannot identify which menu you are on. You will have to restart the assistant again from the beginning.`);
    delete usersChangingSettings[id];
  }
}

function finishChanging(member)
{
  delete usersChangingSettings[member.id];
  member.send(`You have finished changing settings.`);
}

function sendSettingCue(input, instance)
{
  let settingMod = instance.settingModules[+input];

  if (isNaN(+input) === true || settingMod == null)
  {
    instance.member.send(`You must select a number from the list to change the setting. If you're done changing settings, type \`${config.prefix}finish\`.`);
    return;
  }

  instance.member.send(`${settingMod.getCue()} \n\nCurrent setting is \`${settingMod.toInfo(instance.game.settings[settingMod.getKey()], instance.game)}\`.`);
  instance.selectedSetting = settingMod;
  instance.currentMenu = 1;
}

function changeSettingAndSave(input, instance)
{
  //to use down the chain of callbacks in postSettingChange()
  let newSettingValue;
  let settingName = instance.selectedSetting.getName();
  let settingKey = instance.selectedSetting.getKey();

  changeSetting(settingKey, input, instance.game, function(err, validatedSetting)
  {
    //reset the menu regardless of the result
    delete instance.selectedSetting;
    instance.currentMenu = 0;

    if (err)
    {
      instance.member.send(`An error occurred when trying to change the setting: ${err}`);
      return;
    }

    newSettingValue = validatedSetting;
    instance.game.save(saveGameCb);
  });

  function saveGameCb(err)
  {
    if (err)
    {
      instance.member.send(`The setting change could not be saved.`);
      return;
    }

    instance.game.rehost(null, rehostCb);
  }

  function rehostCb(err)
  {
    if (err)
    {
      instance.member.send(`The setting has been changed successfully but the game task failed to be re-launched again. Try killing it and launching it manually. You can also select a different number if you want to change a setting, or type \`${config.prefix}finish\` to finish changing settings.`);
    }

    else instance.member.send(`The setting has been changed successfully! Select a different number if you want to change a setting, or type \`${config.prefix}finish\` to finish changing settings.`)

    if (settingKey.toLowerCase() !== "masterpassword")
    {
      instance.game.channel.send(`${instance.member.user.username} changed the \`${settingName}\` setting to \`${newSettingValue}\`.`);
    }
  }
}

//can be used by calling it through a game object,
//or by passing a game as an argument
function changeSetting(key, input, game, cb)
{
  try
  {
    let settingModule = settingsLoader.get(game.gameType, key);
    settingModule.validate(input, game.settings, game.server, function(err, validatedSetting)
    {
      if (err)
      {
        cb(err);
        return;
      }

      game.settings[key] = validatedSetting;
      cb(null, validatedSetting);
    });
  }

  catch(err)
  {
    cb(err);
  }
}

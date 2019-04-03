
const config = require("./config.json");
const rw = require("./reader_writer.js");

//Load indexes to load each setting module in the proper order
const coe4SettingsIndex = require("./settings/coe4/index.js");
const dom4SettingsIndex = require("./settings/dom4/index.js");
const dom5SettingsIndex = require("./settings/dom5/index.js");
var coe4Settings = [];
var dom4Settings = [];
var dom5Settings = [];

rw.log(["host", "general"], `Loading CoE4 settings...`);
coe4SettingsIndex.forEach(function(filename)
{
  coe4Settings.push(require(`./settings/coe4/${filename}`));
  rw.log(["host", "general"], `${filename} loaded.`);
});

rw.log(["host", "general"], `Loading Dom4 settings...`);
dom4SettingsIndex.forEach(function(filename)
{
  dom4Settings.push(require(`./settings/dom4/${filename}`));
  rw.log(["host", "general"], `${filename} loaded.`);
});

rw.log(["host", "general"], `Loading Dom5 settings...`);
dom5SettingsIndex.forEach(function(filename)
{
  dom5Settings.push(require(`./settings/dom5/${filename}`));
  rw.log(["host", "general"], `${filename} loaded.`);
});

//Creates a new hosting instance with the proper pack of settings
module.exports.Instance = function(member, gameType, isBlitz)
{
  this.id = member.id;
  this.organizer = member;
  this.currentIndex = 0;
  this.gameType = gameType;
  this.isBlitz = isBlitz;
  this.validatedSettings = {};

  if (gameType.trim().toLowerCase() === config.coe4GameTypeName)
  {
    this.settings = coe4Settings;
  }

  else if (gameType.trim().toLowerCase() === config.dom4GameTypeName)
  {
    this.settings = dom4Settings;
  }

  else if (gameType.trim().toLowerCase() === config.dom5GameTypeName)
  {
    this.settings = dom5Settings;
  }

  else throw `An error occurred when creating a hosting instance. The gameType ${gameType} is invalid.`;

  this.currentKey = function()
  {
    return this.settings[this.currentIndex].getKey();
  };

  this.stepForward = function()
  {
    this.currentIndex++;
  };

  this.stepBack = function()
  {
    if (this.currentIndex === 0)
    {
      rw.log(["host", "general"], `stepBack() Error: Cannot go back any further.`);
      throw "You cannot go back any further.";
    }

    this.currentIndex--;
  };

  this.setName = function(name)
  {
    this.name = name;
  }

  this.hasName = function()
  {
    if (this.name != null && typeof this.name === "string")
    {
      return true;
    }

    else return false;
  }

  this.setServer = function(server)
  {
    this.server = server;
  }

  this.hasServer = function()
  {
    if (this.server != null && typeof this.server === "object")
    {
      return true;
    }

    else return false;
  }

  this.setPort = function(port)
  {
    this.port = port;
  }

  this.getName = function()
  {
    return this.name;
  }

  this.registerSetting = function(input, cb)
  {
    //preserve context through async callback
    var that = this;

    //execute the corresponding check for the input, and assign it to the validatedSettings if no error results
    this.settings[this.currentIndex].validate(input, this.validatedSettings, this.server, function(err, setting)
    {
      if (err)
      {
        cb(err);
        return;
      }

      that.validatedSettings[that.currentKey()] = setting;
      cb(null);
    });
  };

  this.getCue = function()
  {
    return this.settings[this.currentIndex].getCue();
  };

  this.isReadyToLaunch = function()
  {
    if (this.currentIndex === this.settings.length)
    {
      return true;
    }

    else return false;
  };

  this.getSettingsPack = function()
  {
    return this.validatedSettings;
  };
};

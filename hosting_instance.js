
const config = require("./config.json");
const rw = require("./reader_writer.js");
const settingsLoader = require("./settings/loader.js");

//Creates a new hosting instance with the proper pack of settings
module.exports.Instance = function(member, gameType, isBlitz)
{
  this.id = member.id;
  this.organizer = member;
  this.currentIndex = 0;
  this.gameType = gameType;
  this.isBlitz = isBlitz;
  this.validatedSettings = {};
  this.settings = settingsLoader.getAll(gameType);

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

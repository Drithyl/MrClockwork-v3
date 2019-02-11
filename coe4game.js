

/**While it is possible to host CoE4 games with this,
***Illwinter has not given it the proper support yet,
***so ongoing multiplayer games are not viable and
***won't work properly.*****************************/

//TODO: must adapt entirely to the slave servers, but pointless to do so
//until Illwinter changes the way some things work

const fs = require('fs');
const translator = require("./translator.js");
const timer = require("./timer.js");
const rw = require("./reader_writer.js");
const config = require("./config.json");

function createPrototype()
{
  var prototype = {};

  prototype.gameType = config.coe4GameTypeName;
  prototype.port = null;
  prototype.server = null;
  prototype.serverToken = null;
  prototype.turnDirectory = null;
  prototype.name = "Prototype";
  prototype.tracked = false;
  prototype.guild = null;
  prototype.organizer = null;
  prototype.runtime = 0;
  prototype.lastHosted = 0;
  prototype.firstHosted = Date.now();
  prototype.channel = null;
  prototype.role = null;
  prototype.players = [];
  prototype.teams = [];
  prototype.currentPlayer = 0;
  prototype.isOnline = false;
  prototype.isServerOnline = true;


  /****************
  *   FUNCTIONS   *
  ****************/
  prototype.toJSON = toJSON;
  prototype.setOnlineServer = setOnlineServer;
  prototype.setServerOffline = setServerOffline;
  prototype.printSettings = printSettings;
  prototype.settingsToExeArguments = settingsToExeArguments;
  prototype.setPort = setPort;
  prototype.host = host;
  prototype.track = track;
  prototype.untrack = untrack;
  prototype.kill = kill;
  prototype.updateLastHostedTime = updateLastHostedTime;
  prototype.statusCheck = statusCheck;
  prototype.preStartCheck = preStartCheck;
  prototype.start = start;
  prototype.announceStart = announceStart;
  prototype.announceTurn = announceTurn;
  prototype.deleteCoESave = deleteCoESave;
  prototype.deleteGameData = deleteGameData;
  prototype.getLogInfo = getLogInfo;
  prototype.getTurnDir = getTurnDir;
  prototype.save = save;

  return prototype;
}

module.exports.create = function(name, port, member, server, settings = {}, cb)
{
  var game = createPrototype();

  game.name = name;
  game.port = port;
  game.gameType = config.coe4GameTypeName;
  game.settings = settings;
  game.server = server;
  game.serverToken = server.token;
  game.organizer = member;
  game.guild = member.guild;

  game.server.socket.emit("create", {name: game.name, port: game.port, gameType: game.gameType, args: game.settingsToExeArguments()}, function(err)
  {
    if (err)
    {
      rw.logError({Game: game.name}, `"create" Error: `, err);
      cb(err, null);
    }

    else cb(null, game);
  });
};

module.exports.fromJSON = function(json, server, guild)
{
  var game = Object.assign(createPrototype(), json);
  game.guild = guild;

  //Reset the isOnline and isServerOnline properties and the object is just being revived right now
  game.isOnline = false;
  game.isServerOnline = false;

  if (game.organizer != null)
  {
    game.organizer = game.guild.members.get(game.organizer);
  }

  if (game.channel != null)
  {
    game.channel = game.guild.channels.get(game.channel);
  }

  if (game.role != null)
  {
    game.role = game.guild.roles.get(game.role);
  }

  return game;
};

/************************************************************
*                       toJSON()                            *
* is called whenever JSON.stringify() is used on the object *
************************************************************/

function toJSON()
{
  var jsonObj = Object.assign({}, this);

  jsonObj.server = null;
  jsonObj.instance = null;
  jsonObj.guild = this.guild.id;
  jsonObj.organizer = this.organizer.id;

  if (jsonObj.channel != null)
  {
    jsonObj.channel = this.channel.id;
  }

  if (jsonObj.role != null)
  {
    jsonObj.role = this.role.id;
  }

  return jsonObj;
}

/********************************
*        LOCAL FUNCTIONS        *
* No calls to the slave servers *
********************************/
function setOnlineServer(server)
{
  if (typeof this.server === "string" && this.server !== server.token)
  {
    throw "The server that is trying to host the game does not match the recorded one.";
  }

  //will get assigned even if this.server is null, since there's probably a reason
  //why the server that's passed has this game in the first place
  this.server = server;
  this.isServerOnline = true;
}

function setServerOffline()
{
  this.isOnline = false;
  this.isServerOnline = false;
  this.organizer.send(`The server on which the game ${this.name} was hosted has disconnected. If it reconnects automatically or this gets resolved, the game will be back online.`);
}

function printSettings()
{
  return translator.translateGameInfo(this);
}

function settingsToExeArguments()
{
  var def = ["--window", "--nofade", "--server", "--port=" + this.port, "--rename"];
  return translator.settingsToExeArguments(this.settings, this.gameType).concat(def);
}

function track()
{
  this.tracked = true;
}

function untrack()
{
  this.tracked = false;
}

function announceStart()
{
  if (this.channel == null)
  {
    //rw.log(null, "The channel for the game " + this.name + " could not be found. Impossible to announce changes.");
    return;
  }

  if (this.role == null)
  {
    //rw.log(null, "The role for the game " + this.name + " could not be found.");
  }

  rw.log(null, this.name + ": game started! The turn directory is: " + this.turnDirectory);
  this.channel.send(this.role + " Game started! " + this.players[0].name + " (" + this.players[0].class + ") is now in control.");
}

function announceTurn()
{
  if (this.channel == null)
  {
    //rw.log(null, "The channel for the game " + this.name + " could not be found. Impossible to announce changes.");
    return;
  }

  if (this.role == null)
  {
    //rw.log(null, "The role for the game " + this.name + " could not be found.");
  }

  if (this.currentPlayer === this.players.length - 1)
  {
    this.turn++;
    this.season++;
    this.currentPlayer = 0;
    rw.log(null, this.name + ": new turn " + this.turn + "! " + this.players[0].name + " (" + this.players[0].class + ") is up.");
    this.channel.send(this.role + " A month has passed (" + this.turn + "). 'Tis " + translator.getSeason(this.season) + ". " + this.players[0].name + " (" + this.players[0].class + ") is now in control.");
  }

  else
  {
    this.currentPlayer++;
    rw.log(null, this.name + ": " + this.players[this.currentPlayer].name + " (" + this.players[this.currentPlayer].class + ") is up.");
    this.channel.send(this.role + " " + this.players[this.currentPlayer].name + " (" + this.players[this.currentPlayer].class + ") is now in control.");
  }
}


/************************************************
*            EXTERNAL FUNCTIONS                 *
* These make socket calls to the slave servers  *
************************************************/
function host(options, cb)
{
  //preserve context to use in callback below
  var that = this;
  var args = this.settingsToExeArguments();

  if (this.server == null)
  {
    cb(`${this.name} has no server assigned; cannot host it.`, null);
    return;
  }

  if (this.isServerOnline === false)
  {
    cb(`${this.name}'s server is offline; cannot host it.`, null);
    return;
  }

  if (options != null && options.extraArgs != null && Array.isArray(extraArgs) === true)
  {
    args = args.concat(extraArgs);
  }

  if (this.turn < 0)
  {
    args.push("--newgame");
  }

  else
  {
    args.concat(["--loadgame=" + this.name, "--server", "--textonly", "--port=" + this.port]);
    this.modifiedDateToIgnore = true;
    this.turnDirToGet = true;
  }

  //send request to slave server to host the process
  this.server.socket.emit("host", {name: this.name, port: this.port, args: args}, function(err, warning)
  {
    if (err)
    {
      rw.logError({Game: that.name}, `"host" Error:`, err);
      cb(err, null);
      return;
    }

    else if (warning)
    {
      rw.writeToGeneralLog(warning);
    }

    that.isOnline = true;
    cb(null);
  });
}

function kill(cb)
{
  //preserve context to use in callback below
  var that = this;

  this.server.socket.emit("kill", {name: this.name, port: this.port}, function(err)
  {
    if (err)
    {
      rw.logError({Game: that.name}, `"kill" Error: `, err);
      cb(err, null);
      return;
    }

    that.isOnline = false;
    cb(null);
  });
}

function updateLastHostedTime(cb)
{
  var that = this;

  this.server.socket.emit("getLastHostedTime", {name: this.name, port: this.port}, function(err, time)
  {
    if (err)
    {
      rw.logError({Game: that.name}, `"getLastHostedTime" Error: `, err);
      cb(err, null);
      return;
    }

    that.lastHosted = time;
    cb(null, time);
  });
}

function statusCheck()
{
  var lastHosted;

  //preserve context to use in callback below
  var that = this;

  if (this.isOnline === true)
  {
    this.runtime += 60; //1 minute in seconds
  }

  if (this.isServerOnline === false || this.server == null || this.server.socket == null)
  {
    //server offline
    return;
  }

  if (this.tracked === true)
  {
    if (this.turnDirToGet === true)
    {
      //game hosted, catch save path in debug log
      this.getTurnDir(null);
    }

    if (this.turn < 0)
    {
      this.preStartCheck();
    }

    lastHosted = this.lastHosted;
    this.updateLastHostedTime(function(err, time)
    {
      if (err)
      {
        return;
      }

      if (lastHosted < time)
      {
        if (that.modifiedDateToIgnore === true)
        {
          console.log("Modification ignored.");
          that.modifiedDateToIgnore = false;
          return;
        }

        else
        {
          that.turnToSave = true;
          that.announceTurn();
        }
      }

      that.save(cb);
    });
  }
}

function preStartCheck()
{
  this.getLogInfo(function(info)
  {
    var parsedInfo = parseLogInfo(info);

    if (parsedInfo.turn === 0)
    {
      if (!this.players.length || this.players.length <= 0)
      {
        this.players = this.parsePlayers(info);
      }

      //game started, catch save path in debug log
      this.getTurnDir(function()
      {
        this.start(parsedInfo);
      });
    }

  });
}

function start(startInfo)
{
  this.turn = startInfo.turn;
  this.season = startInfo.season;
  //this.kill();
  //setTimeout(function()
  //{
    //this.host([]);
    this.announceStart();
    this.lastHosted = this.getLastHostedTime();
  //}, 10000);
}

function deleteCoESave(cb)
{
  //preserve context to use in callback below
  var that = this;

  this.server.socket.emit("deleteGameSave", {name: this.name, port: this.port}, function(err)
  {
    if (err)
    {
      rw.logError({Game: that.name}, `deleteGameSave Error: `, err);
      cb(err, null);
    }

    else cb(null);
  });


  //preserve context to use in callback below
  var that = this;
  var files = fs.readdirSync(config.pathToGameData + "/" + this.name, "utf8");

  this.kill(function()
  {
    for (var i = 0; i < files.length; i++)
    {
      fs.unlinkSync(config.pathToGameData + "/" + that.name + "/" + files[i]);
    }

    fs.rmdirSync(config.pathToGameData + "/" + that.name);
  });
}

function getLogInfo(cb)
{
  var that = this;

  fs.readFile(config.pathToGameData + "/" + this.name + "/status", "utf8", (err, data) =>
  {
    if (err)
    {
      if (err.message.includes("ENOENT")) //Path not found error; file doesn't exist so game has not started
      {
        cb(null, "");
        return;
      }

      else
      {
        rw.logError({Game: that.name}, `fs.readFile Error: `, err);
        cb(err, null);
        return;
      }
    }

    cb(data);
  });
}

function getTurnDir(cb)
{
  var that = this;

  fs.readFile("log.txt", "utf8", (err, data) =>
  {
    if (err)
    {
      rw.logError({Game: that.name}, `fs.readFile Error: `, err);
      return;
    }

    if (data.lastIndexOf("putfile2:") == -1)
    {
      return;
    }

    var pathIndex = data.lastIndexOf("putfile2:") + 9;
    var path = data.slice(pathIndex, data.indexOf("\n", pathIndex)).trim();
    path = path.replace(/\\/g, "/");
    path = path.replace(/C\:\/Users\/\w+\//i, "C:/Users/" + config.pcUser + "/");
    that.turnDirectory = path;
    rw.copyFileSync(path, config.coe4DataPath + "saves/" + that.name);
    //this.teams = this.parseTeams(data);
    fs.unlinkSync("log.txt");
    console.log("Got new turn directory: " + path);
    that.turnDirToGet = false;

    if (cb != null)
    {
      cb();
    }
  });
}

function parseTeams(dLog)
{
  var teams = [];

  for (var i = 0; i < this.players.length; i++)
  {
    var changeTeamIndex = dLog.lastIndexOf("change team " + i + " ");

    if (changeTeamIndex != -1 && dLog.lastIndexOf("change team " + i + " -1") == -1)
    {
      var line = dLog.slice(changeTeamIndex, dLog.indexOf("\n", changeTeamIndex));
      var teamNumber = line.replace(/\s\d+\s/, "");
      teamNumber = +line.slice(0, line.indexOf("c-")).replace(/\D+/g, "");

      if (teams[teamNumber] == null)
      {
        teams[teamNumber] = [];
      }

      teams[teamNumber].push(i);
    }
  }

  console.log("teams: " + teams);
  return teams;
}

function save(cb)
{
  var that = this;

  //if directory with game name does not exist, create it.
  if (fs.existsSync(config.pathToGameData + "/" + this.name) == false)
  {
    fs.mkdirSync(config.pathToGameData + "/" + this.name);
  }

  rw.saveJSON(config.pathToGameData + "/" + this.name + "/data.json", this, function(err)
  {
    if (err)
    {
      cb(err);
      return;
    }

    if (this.turnToSave === true)
    {
      rw.copyFile(this.turnDirectory, config.coe4DataPath + "saves/" + this.name, function(err)
      {
        if (err)
        {
          cb(err);
          return;
        }

        rw.log(null, that.name + ": new turn info saved successfully.");
        that.turnToSave = false;
        cb(null);
      });
    }
  });
}

function parsePlayers(info)
{
  var counter = 0;
  var players = [];

  while (info.indexOf("Player " + counter + ", Name ") !== -1)
  {
    var playerIndex = info.indexOf("Player " + counter + ", Name ");
    var line = info.slice(playerIndex, info.indexOf(", Army strength", playerIndex));

    if (line.slice(line.indexOf(","), line.indexOf(", Class")).includes("Human") === true)
    {
      var nameIndex = line.indexOf("Name ") + 5;
      var humanIndex = line.indexOf(", Human");
      var classIndex = line.indexOf("Class ", humanIndex) + 6;
      players.push({name: line.slice(nameIndex, humanIndex), class: line.slice(classIndex, line.indexOf(", Units", classIndex)), type: "human"});
    }

    else
    {
      var nameIndex = line.indexOf("Name ") + 5;
      var endNameIndex = line.indexOf(", ", nameIndex);
      var classIndex = line.indexOf(", Class ") + 8;
      players.push({name: line.slice(nameIndex, endNameIndex), class: line.slice(classIndex, line.indexOf(", Units", classIndex)), type: "AI"});
    }

    counter++;
  }

  return players;
}

function parseLogInfo(info)
{
  if (info == null || /\S+/.test(info) === false)
  {
    return {turn: -1, season: 0};
  }

  var newTurnIndex = info.lastIndexOf("turn: ");
  var newSeasonIndex = info.indexOf("season ", newTurnIndex);
  var newTurn = +(info.slice(newTurnIndex, newSeasonIndex).replace(/\D+/g, ""));
  var newSeason = +(info.slice(newSeasonIndex, info.indexOf("Player", newSeasonIndex)).replace(/\D+/g, ""));
  return {turn: newTurn, season: newSeason};
}

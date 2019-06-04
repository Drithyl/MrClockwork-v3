
const fs = require('fs');
const translator = require("./translator.js");
const nations = require("./nation_fetcher.js");
const playerRecords = require("./dom_player_record.js");
const timerModule = require("./timer.js");
const rw = require("./reader_writer.js");
const config = require("./config.json");
const newsModule = require("./news_posting.js");
const defaultTimer = require("./settings/dom5/default_timer.js");
const currentTimer = require("./settings/dom5/current_timer.js");
var playerPreferences;

if (require("./command_modules/game_preferences.js") == null)
{
  rw.log("general", `game_preferences.js not found. Reminders and turn backups are disabled.`);
}

else playerPreferences = require("./command_modules/game_preferences.js");

function createPrototype()
{
  var prototype = {};

  prototype.gameType = config.dom5GameTypeName;
  prototype.port = null;
  prototype.server = null;
  prototype.serverToken = null;
  prototype.name = "Prototype";
  prototype.settings = {};
  prototype.tracked = true;
  prototype.guild = null;
  prototype.organizer = null;
  prototype.reminders = {};
  prototype.runtime = 0;
  prototype.lastHosted = 0;
  prototype.firstHosted = Date.now();
  prototype.wasStarted = false;
  prototype.timerChanged = false;
  prototype.channel = null;
  prototype.role = null;
  prototype.isOnline = false;
  prototype.isServerOnline = true;
  prototype.startedAt = null;
  prototype.players = {}; //will keep track of player status and preferences


  /****************
  *   FUNCTIONS   *
  ****************/
  prototype.toJSON = toJSON;
  prototype.toSlaveServerData = toSlaveServerData;
  prototype.setOnlineServer = setOnlineServer;
  prototype.setServerOffline = setServerOffline;
  prototype.printSettings = printSettings;
  prototype.settingsToExeArguments = settingsToExeArguments;
  prototype.isPretenderOwner = isPretenderOwner;
  prototype.subPretender = subPretender;
  prototype.claimPretender = claimPretender;
  prototype.unclaimPretender = unclaimPretender;
  prototype.removePretender = removePretender;
  prototype.getPlayerRecord = getPlayerRecord;
  prototype.deletePlayerRecord = deletePlayerRecord;
  prototype.toggleSendRemindersOnTurnDone = toggleSendRemindersOnTurnDone;
  prototype.togglePlayerBackups = togglePlayerBackups;
  prototype.togglePlayerScoreDumps = togglePlayerScoreDumps;
  prototype.getStatusDump = getStatusDump;
  prototype.getNationTurnFile = getNationTurnFile;
  prototype.getScoreDump = getScoreDump;
  prototype.getLocalCurrentTimer = getLocalCurrentTimer;
  prototype.getLocalDefaultTimer = getLocalDefaultTimer;
  prototype.start = start;
  prototype.restart = restart;
  prototype.host = host;
  prototype.kill = kill;
  prototype.rehost = rehost;
  prototype.changeCurrentTimer = changeCurrentTimer;
  prototype.changeDefaultTimer = changeDefaultTimer;
  prototype.getSubmittedPretenders = getSubmittedPretenders;
  prototype.updateLastHostedTime = updateLastHostedTime;
  prototype.sendStales = sendStales;
  prototype.statusCheck = statusCheck;
  prototype.updateTurnInfo = updateTurnInfo;
  prototype.processNewTurn = processNewTurn;
  prototype.processNewHour = processNewHour;
  prototype.announceTurn = announceTurn;
  prototype.announceLastHour = announceLastHour;
  prototype.deleteGameData = deleteGameData;
  prototype.deleteGameSavefiles = deleteGameSavefiles;
  prototype.backupSavefiles = backupSavefiles;
  prototype.rollback = rollback;
  prototype.getTurnInfo = getTurnInfo;
  prototype.getCurrentTimer = getCurrentTimer;
  prototype.save = save;

  return prototype;
}

module.exports.create = function(name, port, member, server, isBlitz, settings = {}, cb)
{
  var game = createPrototype();

  game.name = name;
  game.ip = server.ip;
  game.port = port;
  game.gameType = config.dom5GameTypeName;
  game.isBlitz = isBlitz;
  game.settings = Object.assign({}, settings);

  //currentTimer is not part of the default settings package, therefore
  //add it manually and set it to the default timer
  game.settings[currentTimer.getKey()] = settings[defaultTimer.getKey()];
  game.server = server;
  game.serverToken = server.token;
  game.organizer = member;
  game.guild = member.guild;

  game.server.socket.emit("create", game.toSlaveServerData(), function(err)
  {
    if (err)
    {
      rw.log("error", true, `"create" slave Error:`, {Game: game.name}, err);
      cb(err, null);
      return;
    }

    cb(null, game);
  });
};

module.exports.fromJSON = function(json, guild, cb)
{
  var game = Object.assign(createPrototype(), json);

  game.settings[defaultTimer.getKey()] = defaultTimer.revive(game.settings[defaultTimer.getKey()]);
  game.settings[currentTimer.getKey()] = currentTimer.revive(game.settings[currentTimer.getKey()]);
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

  Object.keys(game.players).forEachAsync((id, index, next) =>
  {
    let player = game.players[id];

    game.guild.fetchMember(id)
    .then(function(member)
    {
      game.players[id].member = member;
      next();
    })
    .catch(function(err)
    {
      rw.log("error", `Could not fetch player's member object:`, {userID: id, nation: player.nation, Game: game.name}, err);
      next();
    });
  }, cb(null, game));
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

  //reset references within players (Object.assign doesn't dettach references
  //deeper than one level so setting .member to null till also remove it from
  //the this object)
  jsonObj.players = {};

  for (var id in this.players)
  {
    jsonObj.players[id] = {};

    for (var key in this.players[id])
    {
      if (key !== "member")
      {
        jsonObj.players[id][key] = this.players[id][key];
      }
    }
  }

  return jsonObj;
}

function toSlaveServerData()
{
  return {
    name: this.name,
    port: this.port,
    gameType: this.gameType,
    args: this.settingsToExeArguments()
  }
}

/************************************************
*            EXTERNAL FUNCTIONS                 *
* These make socket calls to the slave servers  *
************************************************/
function getSubmittedPretenders(cb)
{
  var that = this;

  this.server.socket.emit("getSubmittedPretenders", this.toSlaveServerData(), function(err, list)
  {
    if (err)
    {
      rw.log("error", true, `"getSubmittedPretenders" slave Error:`, {Game: that.name}, err);
      cb(err);
      return;
    }

    cb(null, list);
  });
}

function isPretenderOwner(nationFilename, memberID)
{
  if (this.players[memberID].nation.filename === nationFilename && this.players[memberID].subbedOutBy == null)
  {
    return true;
  }

  else return false;
}

function claimPretender(nationObj, member, cb)
{
  var that = this;

  if (this.players[member.id] != null)
  {
    this.getSubmittedPretenders((err, list) =>
    {
      if (list.find((nation) => that.players[member.id].nation.filename === nation.filename) == null)
      {
        //the nation appears claimed, but there is no nation file submitted. This
        //could be caused by a pretender previously removed where the game instance
        //could not be restarted, so the file got deleted but the record did not update.
        //Delete record and retry the claiming.
        delete that.players[member.id];
        that.claimPretender(nationObj, member, cb);
      }

      else cb(`You have already claimed a pretender; each player can only control one.`);
    });

    return;
  }

  //check for the pretender already being claimed by others
  for (var id in this.players)
  {
    if (this.players[id].nation.filename === nationObj.filename)
    {
      if (this.players[id].member != null)
      {
        cb(`The pretender for this nation was already claimed by ${this.players[id].member.user.username}.`);
      }

      else cb(`This pretender is already claimed by the user with id ${id}, but the member's data could not be fetched. Did the user leave the Guild?`);

      return;
    }
  }

  this.players[member.id] = playerRecords.create(member, nationObj, this);

  that.save(function(err)
  {
    if (err)
    {
      //undo the change since the data could not be saved
      delete this.players[member.id];
      cb(`The pretender could not be claimed because the game's data could not be saved.`);
      return;
    }

    cb(null);
  });
}

function unclaimPretender(member, cb)
{
  var that = this;
  let recordClone = Object.assign({}, this.players[member.id]);
  this.deletePlayerRecord(member.id);

  this.save(function(err)
  {
    if (err)
    {
      //undo the change since the data could not be saved
      that.players[member.id] = recordClone;
      cb(`The claim on the pretender could not be removed because the game's data could not be saved.`);
      return;
    }

    cb(null);
  });
}

function subPretender(nationFilename, subMember, cb)
{
  var that = this;
  var playerRecordsClone;

  //this nation already has a player record if there is an existing record
  var existingPlayerRecord = this.getPlayerRecord(nationFilename);

  //the designated sub already has a player record if this is not null
  var existingSubPlayerRecord = this.getPlayerRecord(subMember.id);

  if (existingPlayerRecord == null)
  {
    cb(`This nation either has no pretender submitted or nobody claimed it.`);
    return;
  }

  if (existingSubPlayerRecord != null)
  {
    cb(`The candidate you chose already plays a nation in this game.`);
    return;
  }

  playerRecordsClone = Object.assign({}, this.players);
  this.deletePlayerRecord(nationFilename);
  this.players[subMember.id] = playerRecords.create(subMember, Object.assign({}, existingPlayerRecord.nation), this);

  this.save(function(err)
  {
    if (err)
    {
      //undo the change since the data could not be saved
      that.players = playerRecordsClone;
      cb(`The pretender could not be claimed because the game's data could not be saved.`);
      return;
    }

    cb(null);
  });
}

function removePretender(nationFile, member, cb)
{
  var that = this;
  var data = Object.assign({}, this.toSlaveServerData(), {nationFile: nationFile});

  this.server.socket.emit("removePretender", data, function(err)
  {
    if (err)
    {
      cb(err);
      return;
    }

    that.deletePlayerRecord(nationFile);
    cb();
  });
}

//grabs a player record through a player id or nation token
function getPlayerRecord(token)
{
  for (var id in this.players)
  {
    let record = this.players[id];

    if (token === record.id)
    {
      return record;
    }

    if (record != null && record.nation != null)
    {
      if (record.nation.name === token ||
          record.nation.number === token ||
          record.nation.filename === token ||
          record.nation.fullName === token)
      {
        return record;
      }
    }
  }

  return null;
}

function deletePlayerRecord(token)
{
  for (var id in this.players)
  {
    let record = this.players[id];

    if (token === record.id)
    {
      delete this.players[id];
      break;
    }

    if (record != null && record.nation != null)
    {
      if (record.nation.name === token ||
          record.nation.number === token ||
          record.nation.filename === token ||
          record.nation.fullName === token)
      {
        delete this.players[id];
        break;
      }
    }
  }
}

//The .wasStarted flag will not be set here, since this just kickstarts the Dominions
//generation of the map, starting positions, etc. which might fail and bring back
//the game to the lobby. Instead that will be done when a statusCheck() finds that
//the game's statuspage returns a turn of 1, meaning it finished generating correctly
function start(cb)
{
  var that = this;
  var strOfUnclaimedNations = "";
  var data = Object.assign({}, this.toSlaveServerData(), {timer: 60});

  //don't check for pretenders in a blitz game
  if (this.isBlitz === true)
  {
    that.server.socket.emit("start", data, function(err)
    {
      if (err)
      {
        rw.log("error", true, `"start" slave Error:`, {Game: that.name}, err);
        cb(err);
        return;
      }

      that.settings[currentTimer.getKey()] = Object.assign({}, that.settings[defaultTimer.getKey()]);
      cb();
    });
  }

  else
  {
    this.getSubmittedPretenders(function(err, list)
    {
      if (err)
      {
        cb(`Could not receive a list of the submitted pretenders.`);
        return;
      }

      if (list.length < 2)
      {
        cb(`Cannot start the game with less than two human players.`);
        return;
      }

      let unclaimedNations = list.filter((nation) =>
      {
        for (var id in that.players)
        {
          if (that.players[id].nation != null && that.players[id].nation.filename === nation.filename)
          {
            return false;
          }
        }

        strOfUnclaimedNations += `${nation.fullName}\n`;
        return true;
      });

      if (unclaimedNations.length > 0)
      {
        cb(`Cannot start the game. The following pretenders have not been claimed by players:\n\n${strOfUnclaimedNations.toBox()}`);
        return;
      }

      for (var id in that.players)
      {
        if (list.find((nation) => nation.filename === that.players[id].nation.filename) == null)
        {
          cb(`Cannot start the game. The player ${that.players[id].member.user.username} shows as the claimer for the nation ${that.players[id].nation.filename}, but the file for this pretender is missing in the server. Submit the pretender again, and either claim it or remove it.`);
          return;
        }
      }

      that.server.socket.emit("start", data, function(err)
      {
        if (err)
        {
          rw.log("error", true, `"start" slave Error:`, {Game: that.name}, err);
          cb(err);
          return;
        }

        that.settings[currentTimer.getKey()] = Object.assign({}, that.settings[defaultTimer.getKey()]);
        cb();
      });
    });
  }
}

function restart(cb)
{
  var that = this;

  this.server.socket.emit("restart", this.toSlaveServerData(), function(err)
  {
    if (err)
    {
      rw.log("error", true, `"restart" slave Error:`, {Game: that.name}, err);
      cb(err);
      return;
    }

    that.wasStarted = false;
    that.startedAt = null;

    //if not a blitz there are player records to reset, but don't delete the
    //players entirely as they're probably gonna be playing the game again,
    //so it's good to keep the reminders
    if (that.isBlitz === false)
    {
      rw.log("general", "Resetting players...");
      that.players = {};
    }

    that.settings[currentTimer.getKey()] = that.settings[defaultTimer.getKey()];

    //set turns to 0 in case the defaultTimer somehow got its turn assigned wrongly
    that.settings[defaultTimer.getKey()].turn = 0;
    that.settings[currentTimer.getKey()].turn = 0;
    cb();
  });
}

function host(options, cb)
{
  //preserve context to use in callback below
  var that = this;
  var args = this.settingsToExeArguments(options);

  //no options were passed
  if (typeof options === "function" && cb == null)
  {
    cb = options;
  }

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

  //send request to slave server to host the process
  this.server.socket.emit("host", this.toSlaveServerData(), function(err, warning)
  {
    if (err)
    {
      rw.log("error", true, `"host" slave Error:`, {Game: that.name}, err);
      cb(err, null);
      return;
    }

    else if (warning)
    {
      rw.log("general", warning);
    }

    that.isOnline = true;
    cb(null);
  });
}

function kill(cb)
{
  //preserve context to use in callback below
  var that = this;

  //Kill and relaunch the dom5 instance with the full default timer
  this.server.socket.emit("kill", this.toSlaveServerData(), function(err)
  {
    if (err)
    {
      rw.log("error", true, `"kill" slave Error:`, {Game: that.name}, err);
      cb(err, null);
      return;
    }

    that.isOnline = false;
    cb(null);
  });
}

function rehost(options, cb)
{
  let that = this;

  this.kill(function(err)
  {
    if (err)
    {
      cb(err);
      return;
    }

    that.host(options, cb);
  });
}

function changeCurrentTimer(timer, cb)
{
  var that = this;
  var data = Object.assign({}, this.toSlaveServerData(), {timer: timer.getTotalSeconds()});

  this.server.socket.emit("changeCurrentTimer", data, function(err)
  {
    if (err)
    {
      rw.log("error", true, `"changeCurrentTimer" slave Error:`, {Game: that.name}, err);
      that.organizer.send(`An error occurred; failed to change the current timer to ${timer.shortPrint()}.`);
      cb(err, null);
      return;
    }

    //can't do Object.assign or it will also change the turn number
    that.settings[currentTimer.getKey()].days = timer.days;
    that.settings[currentTimer.getKey()].hours = timer.hours;
    that.settings[currentTimer.getKey()].minutes = timer.minutes;
    that.settings[currentTimer.getKey()].seconds = timer.seconds;
    that.settings[currentTimer.getKey()].isPaused = timer.isPaused;
    that.timerChanged = true;
    cb(null);
  });
}

function changeDefaultTimer(timer, cb)
{
  var that = this;
  var data = Object.assign({}, this.toSlaveServerData(), {timer: timer.getTotalMinutes(), currentTimer: this.settings[currentTimer.getKey()].getTotalSeconds()});

  this.server.socket.emit("changeDefaultTimer", data, function(err)
  {
    if (err)
    {
      rw.log("error", true, `"changeDefaultTimer" slave Error:`, {Game: that.name}, err);
      cb(err, null);
      return;
    }

    that.settings[defaultTimer.getKey()].days = timer.days;
    that.settings[defaultTimer.getKey()].hours = timer.hours;
    that.settings[defaultTimer.getKey()].minutes = timer.minutes;
    that.settings[defaultTimer.getKey()].seconds = timer.seconds;
    that.settings[defaultTimer.getKey()].isPaused = timer.isPaused;
    cb(null);
  });
}

function sendStales(cb)
{
  var that = this;
  var staleMsg = "**" + this.name + ": the nations below staled this turn.**\n";
  var aiMsg = "**The nations below went AI this last turn:**\n";
  var data = Object.assign({}, this.toSlaveServerData(), {lastHostedTime: this.lastHosted});

  this.server.socket.emit("getStales", {name: this.name, port: this.port, lastHostedTime: this.lastHosted}, function(err, data)
  {
    if (err)
    {
      rw.log("error", true, `"getStales" slave Error:`, {Game: that.name}, err);
      that.organizer.send(`An error occurred; could not fetch the information on stales for the game ${that.name}.`);
      cb(err);
      return;
    }

    if (data.stales.length > 0)
    {
      let strList = "";

      data.stales.forEach((nation) =>
      {
        strList += `${nation.name}\n`;
      });

      that.organizer.send(`${staleMsg}\n\n${strList.toBox()}`);
    }

    if (data.ai.length > 0)
    {
      let strList = "";

      data.ai.forEach((nation) =>
      {
        for (var id in this.players)
        {
          if (that.players[id].nation.filename === nation.filename && that.players[id].wentAI === false)
          {
            strList += `${nation.name}\n`;
            that.players[id].wentAI = true;
          }
        }
      });

      if (strList !== "")
      {
        that.organizer.send(`${aiMsg}\n\n${strList.toBox()}`);
      }
    }

    cb(null);
  });
}

function updateLastHostedTime(cb)
{
  var that = this;

  this.server.socket.emit("getLastHostedTime", this.toSlaveServerData(), function(err, time)
  {
    if (err)
    {
      rw.log("error", true, `"getLastHostedTime" slave Error:`, {Game: that.name}, err);
      cb(err, null);
      return;
    }

    that.lastHosted = time;
    cb(null, time);
  });
}

function deleteGameData(cb)
{
  var path = `${config.pathToGameData}/${this.name}`;

  //preserve context to use in callback below
  var that = this;

  //send the request for the slave server to delete its data as well
  this.server.socket.emit("deleteGameData", this.toSlaveServerData(), function(err)
  {
    if (err)
    {
      rw.log("error", true, `"deleteGameData" slave Error:`, {Game: that.name, err: err});
      cb(`An Error occurred when trying to delete ${this.server.name}'s game data:\n\n${err}`);
      return;
    }

    //delete the Discord bot's data files on the game
    if (fs.existsSync(path) === false)
  	{
      return;
    }

    rw.deleteDir(path, function(err)
    {
      if (err)
      {
        rw.log("error", true, {path: path, err: err});
        cb(`An Error occurred when trying to delete the game's bot data.`);
        return;
      }

      cb();
    });
  });
}

function deleteGameSavefiles(cb)
{
  //preserve context to use in callback below
  var that = this;

  this.server.socket.emit("deleteGameSavefiles", this.toSlaveServerData(), function(err)
  {
    if (err)
    {
      rw.log("error", true, `"deleteGameSavefiles" slave Error:`, {Game: that.name}, err);
      cb(err, null);
    }

    else cb(null);
  });
}

function backupSavefiles(isNewTurn, cb)
{
  var that = this;
  var data = Object.assign({}, this.toSlaveServerData(), {isNewTurn: isNewTurn, turnNbr: this.settings[currentTimer.getKey()].turn});

  //backup game's save files
  this.server.socket.emit("backupSavefiles", data, function(err)
  {
    if (err)
    {
      rw.log("error", true, `"backupSavefiles" slave Error:`, {Game: that.name}, err);
      cb(err);
    }

    else cb(null);
  });
}

//restores the previous turn of the game
function rollback(cb)
{
  var that = this;
  var data = Object.assign({}, this.toSlaveServerData(), {turnNbr: this.settings[currentTimer.getKey()].turn - 1});

  this.server.socket.emit("rollback", data, function(err)
  {
    if (err)
    {
      rw.log("error", true, `"rollback" slave Error:`, {Game: that.name}, err);
      cb(err);
      return;
    }

    //update the latest turn
    that.settings[currentTimer.getKey()].turn--;

    that.changeCurrentTimer(that.settings[defaultTimer.getKey()], function(err)
    {
      if (err)
      {
        cb(`Rollback successful, but could not change the current timer to match the default timer.`);
        return;
      }

      cb(null);
    });
  });
}

//will fetch the most recent turn and timer info from the slave and check
//for anomalies or errors, then pass it back into the callback
function getTurnInfo(cb)
{
  var that = this;

  this.server.socket.emit("getTurnInfo", this.toSlaveServerData(), function(err, info)
  {
    if (err)
    {
      //statuspage could not be found; this is normal for an unstarted game
      //so don't return an error, just don't return info either
      if (that.wasStarted === false && err.code === "ENOENT")
      {
        return cb(null, null);
      }

      return cb(err, null);
    }

    //Anomaly. If the game is started and running there *must* be a statuspage file to parse.
    //Otherwise it might mean the game is running without the --statuspage flag, or that the
    //statuspage is badly constructed due to some Dominions internal error or that the
    //info is wrong because of bad parsing on the slave's side
    if (that.wasStarted === true && (info == null || info.turn == null || info.turn === 0))
    {
      if (info == null)
      {
        let errStr = `No turn info received even though the game ${that.name} was started. Is the game running without the --statuspage flag?`;
        return cb(new Error(errStr));
      }

      else if (info.turn == null)
      {
        let errStr = `Invalid .turn field in the data received even though the game ${that.name} was started. Could the statuspage be badly constructed due to a parsing or Dominions error?`;
        return cb(new Error(errStr));
      }

      else if (info.turn === 0)
      {
        let errStr = `.turn field is 0 even though the game ${that.name} was started. Could the statuspage be badly constructed due to a parsing or Dominions error?`;
        return cb(new Error(errStr));
      }
    }

    else cb(null, info);
  });
}

function getCurrentTimer(cb)
{
  //preserve context to use in callback below
  var that = this;

  this.getTurnInfo(function(err, newTurnInfo)
  {
    if (err)
    {
      return cb(err);
    }

    //has not started yet (info should be null in this case as well since
    //no statuspage gets generated until a game starts)
    if (that.wasStarted === false)
    {
      if (newTurnInfo != null)
      {
        return cb(null, `The game has not started, but some turn info was found. This is an anomaly. It reports being turn ${newTurnInfo.turn} and there being ${timerModule.print(newTurnInfo)} left for it to roll (0 is paused).`);
      }

      else return cb(`The game has not started yet!`);
    }

    else if (newTurnInfo.isPaused === true)
    {
      cb(null, `It is turn ${newTurnInfo.turn}, and the timer is paused.`);
    }

    else if (newTurnInfo.totalSeconds > 0)
    {
      cb(null, `It is turn ${newTurnInfo.turn}, and there are ${timerModule.print(newTurnInfo)} left for it to roll.`);
    }

    else
    {
      cb(null, "Unless something's wrong, one minute or less remains for the turn to roll. It might even be processing right now. The new turn announcement should come soon.");
    }
  });
}

//This function does not return any errors to the callback, nor does it stop
//execution early, as every step of the process must be executed regardless
//of the result of the previous steps. Instead it will log the errors encountered
//along the way
function processNewTurn(newTurnInfo, cb)
{
  //preserve context to use in callback below
  var that = this;

  this.announceTurn(newTurnInfo);

  //send stale turns information to organizer (err handled within the function itself)
  this.sendStales(function(err)
  {
    that.settings[currentTimer.getKey()].turn = newTurnInfo.turn;

    //update timer to default turn timer (err handled within the function itself)
    that.changeCurrentTimer(that.settings[defaultTimer.getKey()], function(err)
    {
      if (!err)
      {
        rw.log("general", `New turn's current timer changed to fit the default timer:`, that.settings[defaultTimer.getKey()]);
      }

      //update the timestamp of the last time the turn was hosted (used for stales) (err handled within the function itself)
      that.updateLastHostedTime(function(err, time)
      {
        //backup game's bot data
        rw.copyDir(`${config.pathToGameData}/${that.name}`, `${config.pathToGameDataBackup}/${that.name}`, false, null, function(err)
        {
          //send turn backups to those that requested them
          if (playerPreferences != null)
          {
            playerPreferences.sendAllPlayerTurnBackups(that, function(err)
            {
              playerPreferences.sendScoreDumpsToPlayers(that, function(err)
              {
                cb();
              });
            });
          }
        });
      });
    });
  });
}

function processNewHour(newTurnInfo, cb)
{
  var that = this;

  if (newTurnInfo.totalHours <= 0 && newTurnInfo.totalSeconds != 0)
  {
    this.announceLastHour(newTurnInfo, function(err)
    {
      if (err)
      {
        cb(err);
      }
    });
  }

  this.getStatusDump(function(err, dump)
  {
    if (err)
    {
      cb(err, null);
      return;
    }

    if (playerPreferences != null)
    {
      playerPreferences.sendReminders(that, newTurnInfo.totalHours, dump);
    }
  });
}

/*  STATUSDUMP FORMAT: OBJECT WITH NATION FILENAMES FOR KEYS                                        *
*   .filename:        the nation's filename (with the .2h extension)                                *
*   .nationFullName:  the nation's full name                                                        *
*   .nationName:      the nation's name without the titles                                          *
*   .nationNbr:       the nation's ingame number                                                    *
*   .pretenderNbr:    ingame number of the nation who's the pretender (for disciple games)          *
*   .controller:      player controller - 0=AI, 1=Human, 2=Just went AI last turn                   *
*   .aiLevel:         AI's difficulty - 0 to 5= easy, normal, difficult, mighty, master, impossible *
*   .turnPlayer:      0=turn untouched, 1=marked as unfinished, 2=done                              *
****************************************************************************************************/

function getStatusDump(cb)
{
  this.server.socket.emit("getDump", this.toSlaveServerData(), function(err, dump)
  {
    if (err)
    {
      rw.log("error", true, `getStatusDump() Error:`, {Game: that.name}, err);
      return cb(err, null);
    }

    cb(null, dump);
  });
}

function getNationTurnFile(nationFilename, cb)
{
  var data = Object.assign({}, this.toSlaveServerData(), {nationFilename: nationFilename});

  this.server.socket.emit("getTurnFile", data, function(err, buffer)
  {
    if (err)
    {
      cb(err);
    }

    else cb(null, buffer);
  });
}

function getScoreDump(cb)
{
  this.server.socket.emit("getScoreDump", this.toSlaveServerData(), function(err, buffer)
  {
    if (err)
    {
      cb(err);
    }

    else cb(null, buffer);
  });
}

/********************************
*        LOCAL FUNCTIONS        *
* No calls to the slave servers *
********************************/
//gets the current timer that the bot is aware of,
//without fetching the most recent one from the server that is hosting the game
function getLocalCurrentTimer()
{
  if (this.settings[currentTimer.getKey()] == null)
  {
    return Object.assign({}, this.settings[defaultTimer.getKey()]);
  }

  else return Object.assign({}, this.settings[currentTimer.getKey()]);
}

//gets the default timer that the bot is aware of,
//without fetching the most recent one from the server that is hosting the game
function getLocalDefaultTimer()
{
  return Object.assign({}, this.settings[defaultTimer.getKey()]);
}

function toggleSendRemindersOnTurnDone(id)
{
  if (this.players[id].sendRemindersOnTurnDone !== true)
  {
    this.players[id].sendRemindersOnTurnDone = true;
  }

  else this.players[id].sendRemindersOnTurnDone = false;
}

function togglePlayerBackups(id)
{
  this.players[id].isReceivingBackups = !this.players[id].isReceivingBackups;
}

function togglePlayerScoreDumps(id)
{
  this.players[id].isReceivingScoreDumps = !this.players[id].isReceivingScoreDumps;
}

function setOnlineServer(server)
{
  if (typeof this.server === "string" && this.server !== server.token)
  {
    throw "The server that is trying to host the game does not match the recorded one.";
  }

  //will get assigned even if this.server is null, since there's probably a reason
  //why the server that's passed has this game in the first place
  this.server = server;
  this.ip = server.ip;
  this.isServerOnline = true;
}

function setServerOffline()
{
  this.isOnline = false;
  this.isServerOnline = false;
  //this.organizer.send(`The server on which the game ${this.name} was hosted has disconnected. If it reconnects automatically or this gets resolved, the game will be back online.`);
}

function printSettings()
{
  return translator.translateGameInfo(this);
}

function settingsToExeArguments(options)
{
  let def = [this.name, "--scoredump", "--nosound", "--window", "--tcpserver", "--port", this.port, "--noclientstart", "--renaming", "--statusdump"];
  let settings = def.concat(translator.settingsToExeArguments(this.settings, this.gameType));

  if (options == null || (options != null && options.ui !== true))
  {
    settings.push("--textonly");
  }

  if (options != null && options.screen === true)
  {
    settings.unshift("screen", "-d");
  }

  //no current timer, so use default
  if (this.settings[currentTimer.getKey()] == null)
  {
    return settings.concat(defaultTimer.toExeArguments(this.settings[defaultTimer.getKey()]));
  }

  else
  {
    return settings.concat(currentTimer.toExeArguments(this.settings[currentTimer.getKey()]));
  }
}

//Fetch the turn information from the slave's statuspage and verify that it is reliable
function statusCheck(cb)
{
  //preserve context to use in callback below
  var that = this;

  this.getTurnInfo(function(err, info)
  {
    if (err)
    {
      rw.log("error", `Error occurred when getting turn info of game ${that.name}:\n`, err);
      cb(err);
      return;
    }

    //has not started yet (info should be null in this case as well since
    //no statuspage gets generated until a game starts)
    if (that.wasStarted === false && info == null)
    {
      return cb();
    }

    that.updateTurnInfo(info, function(err)
    {
      if (err)
      {
        rw.log("error", `Error occurred when updating turn info of game ${that.name}:`, err);
        cb(err);
        return;
      }

      else that.save(cb);
    });
  });
}

//Update the game's information based on the (verified) turn info received
function updateTurnInfo(newTurnInfo, cb)
{
  //store the old information for comparisons and assign the new one
  let oldCurrentTimer = Object.assign({}, this.settings[currentTimer.getKey()]);

  //since things cannot be announced properly, hold off changes to the next status check
  if (this.channel == null)
  {
    return cb(new Error(`The channel for the game ${this.name} could not be found. Impossible to announce changes. Holding them off until the next status check.`));
  }

  //since things cannot be announced properly, hold off changes to the next status check
  if (this.role == null)
  {
    rw.log("error", `The role for the game ${this.name} could not be found. Changes will be announced in the game's channel without a mention to the players.`);
  }

  //assign the new information to the current timer
  this.settings[currentTimer.getKey()].assignNewTimer(newTurnInfo);

  //timer was changed right before this check, so return
  //and hold off the update to the next status check,
  //otherwise the bot is likely to make an announcement or
  //send reminders that don't match, since the statuspage
  //file is not yet updated
  if (this.timerChanged === true)
  {
    this.timerChanged = false;
    return cb();
  }

  //Should set the wasStarted flag properly since the game has received turn info
  if (newTurnInfo.turn === 1 && this.wasStarted === false)
  {
    this.wasStarted = true;
    this.startedAt = Date.now();
    rw.log("general", `Setting .wasStarted on ${this.name} to true and timestamping since turn 1 info was received.`);
  }

  //Anomaly. A game with .wasStarted being false should be receiving a turn into
  //with the turn being 1, not above that. Is this a parsing error on the slave's
  //side or did the game's .wasStarted flag get set to false incorrectly?
  if (newTurnInfo.turn > 1 && this.wasStarted === false)
  {
    this.wasStarted = true;
    rw.log("error", `The game ${this.name} reports .wasStarted === false, but received a turn info with the .turn = ${newTurnInfo.turn}. .wasStarted set to true to correct this. Is this a parsing error on the slave's
    side or did the game's .wasStarted flag get set to false incorrectly?`);
  }

  //new turn.
  else if (newTurnInfo.turn > oldCurrentTimer.turn)
  {
    rw.log("general", `New turn found in game ${this.name}:`, {newTurnInfo: newTurnInfo, currentTimer: oldCurrentTimer});

    //Blitzes don't need to process anything here
    if (this.isBlitz === false)
    {
      this.processNewTurn(newTurnInfo, cb);
    }
  }

  else if (isNaN(oldCurrentTimer.getTotalHours()) === true && this.isBlitz === false)
  {
    rw.log("error", `${this.name}'s oldCurrentTimer.getTotalHours() is not a number: <${oldCurrentTimer.getTotalHours()}>. Full timer object:\n\n${JSON.stringify(oldCurrentTimer, 2, null)}`);
  }

  else if (isNaN(newTurnInfo.totalHours) === true && this.isBlitz === false)
  {
    rw.log("error", `${this.name}'s newTurnInfo.totalHours is not a number: <${newTurnInfo.totalHours}>. Full timer object:\n\n${JSON.stringify(newTurnInfo, 2, null)}`);
  }

  //An hour went by without a turn, so check and send necessary reminders for non blitzes
  else if (newTurnInfo.totalHours - oldCurrentTimer.getTotalHours() === 1 && this.isBlitz === false)
  {
    this.processNewHour(newTurnInfo, cb);
  }

  else if (newTurnInfo.totalHours - oldCurrentTimer.getTotalHours() > 1 && this.isBlitz === false)
  {
    rw.log("error", `More than an hour has passed in ${this.name} without the timer getting updated? oldCurrentTimer hours: ${oldCurrentTimer.getTotalHours()} newTurnInfo hours: ${newTurnInfo.totalHours}.\n\noldCurrentTimer:\n\n${JSON.stringify(oldCurrentTimer, 2, null)}\n\nnewTurnInfo:\n\n${JSON.stringify(newTurnInfo, null, 2)}`);
    this.processNewHour(newTurnInfo, cb);
  }

  else if (newTurnInfo.totalHours - oldCurrentTimer.getTotalHours() < 0 && this.isBlitz === false)
  {
    rw.log("error", `${this.name}'s oldCurrentTimer hours is higher than the newTurnInfo received?: ${oldCurrentTimer.getTotalHours()} newTurnInfo hours: ${newTurnInfo.totalHours}.\n\noldCurrentTimer:\n\n${JSON.stringify(oldCurrentTimer, 2, null)}\n\nnewTurnInfo:\n\n${JSON.stringify(newTurnInfo, null, 2)}`);
    this.processNewHour(newTurnInfo, cb);
  }

  //Nothing happened, update the timer and callback
  else
  {
    cb();
  }
}

function announceTurn(newTurnInfo)
{
  if (newTurnInfo.turn === 1)
  {
    rw.log("general", `${this.name}: game started! The default turn timer is: ${this.settings[defaultTimer.getKey()].print()}.`);
    this.channel.send(`${this.role} Game started! The default turn timer is: ${this.settings[defaultTimer.getKey()].print()}.`);
  }

  else
  {
    rw.log("general", `${this.name}: new turn ${newTurnInfo.turn}! ${this.settings[defaultTimer.getKey()].print()} left for the next turn.`);
    this.channel.send(`${this.role} New turn ${newTurnInfo.turn} is here! ${this.settings[defaultTimer.getKey()].print()} left for the next turn.`);
  }
}

function announceLastHour(newTurnInfo, cb)
{
  var that = this;
  var undoneCount = 0;
  var unfinishedCount = 0;
  var undoneNations = "The nations below have not yet **checked or done** their turn:\n\n";
  var unfinishedNations = "The nations below have their turn marked as **unfinished** (this is probably fine, and if not, is the players' responsibility):\n\n";

  rw.log("general", this.name + ": 1h or less left for the next turn.");

  this.getStatusDump(function(err, dump)
  {
    if (err)
    {
      cb(err, null);
      return;
    }

    for (var nation in dump)
    {
      if (dump[nation].controller != 1)
      {
        continue;
      }

      if (dump[nation].turnPlayed == 0)
      {
        undoneCount++;
        undoneNations += "- " + dump[nation].nationFullName + "\n";
      }

      else if (dump[nation].turnPlayed == 1)
      {
        unfinishedCount++;
        unfinishedNations += "- " + dump[nation].nationFullName + "\n";
      }
    }

    if (undoneCount > 0 && unfinishedCount > 0)
    {
      that.channel.send(`${that.role} There are ${newTurnInfo.totalMinutes} minutes left for the new turn. ${undoneNations}\n\n${unfinishedNations}`);
    }

    else if (undoneCount > 0)
    {
      that.channel.send(`${that.role} There are ${newTurnInfo.totalMinutes} minutes left for the new turn. ${undoneNations}`);
    }

    else if (unfinishedCount > 0)
    {
      that.channel.send(`${that.role} There are ${newTurnInfo.totalMinutes} minutes left for the new turn. ${unfinishedNations}`);
    }
  });
}

function save(cb)
{
  var that = this;

  //if directory with game name does not exist, create it.
  if (fs.existsSync(`${config.pathToGameData}/${this.name}`) == false)
  {
    fs.mkdirSync(`${config.pathToGameData}/${this.name}`);
  }

  rw.saveJSON(`${config.pathToGameData}/${this.name}/data.json`, this, function(err)
  {
    if (err)
    {
      rw.log("error", `Error occurred when saving data of game ${that.name}:`, err);
      cb(err);
      return;
    }

    cb();
  });
}

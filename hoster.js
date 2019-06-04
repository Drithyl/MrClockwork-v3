
var games;
var slaveServersModule;
var instances = {};
var gameHub;
const fs = require('fs');
const config = require("./config.json");
const rw = require("./reader_writer.js");
const newsModule = require("./news_posting.js");
const Instance = require("./hosting_instance.js").Instance;
const channelFunctions = require("./channel_functions.js");

//keeps track of the channels for new games that users created before hosting a game.
var pendingGameChannels;

if (fs.existsSync(config.pathToPendingChannels) === true)
{
  pendingGameChannels = require(config.pathToPendingChannels);
}

else pendingGameChannels = {};

module.exports.init = function(gameList, serversModule, gameHubModule)
{
  games = gameList;
  slaveServersModule = serversModule;
  gameHub = gameHubModule;
  return this;
};

module.exports.startAssistedHosting = function(gameType, member, isBlitz, cb)
{
  let leastBusyServer = slaveServersModule.getLeastBusy();

  if (leastBusyServer.capacity <= leastBusyServer.hostedGameNames.length)
  {
    cb("All the servers available are currently full. You will have to wait until a game finishes before hosting a new one.", null);
    return;
  }

  instances[member.id] = new Instance(member, gameType, isBlitz);
  rw.log(["host", "general"], `Assisted Hosting Instance created for ${member.user.username} created successfully.`);
  cb(null, `Welcome to the Assisted Hosting System! You can cancel it anytime by simply typing \`${config.prefix}cancel\` here. You can also go back one step by typing \`${config.prefix}back\`. I will be asking you for a number of settings to host your game. First, choose a server on which to host your game by typing its name. See the list below:\n\n\`\`\`${slaveServersModule.getList()}\`\`\``);
};

module.exports.createGameChannel = function(name, member, isBlitz, cb)
{
  rw.log(["host", "general"], `Creating a game channel with name ${name} for member ${member.user.username}.`);
  channelFunctions.createGameChannel(name, member, isBlitz, function(err, channel)
  {
    if (err)
    {
      rw.log(["host", "general"], `Could not create game channel.`);
      cb(err);
      return;
    }

    rw.log(["host", "general"], `Game channel created successfully.`);
    pendingGameChannels[member.id] = channel.id;

    rw.log(["host", "general"], `Saving pending channels data...`);
    rw.saveJSON(config.pathToPendingChannels, pendingGameChannels, function(err)
    {
      if (err)
      {
        rw.log(["host", "general"], `Could not save the pending channels data.`);
        cb(err);
        return;
      }

      rw.log(["host", "general"], `Saved the pending channels data successfully.`);
      cb(null, channel);
    });
  });
};

module.exports.deletePendingGameChannel = function(memberID)
{
  delete pendingGameChannels[memberID];
};

module.exports.hasPendingGameChannel = function(id, guild)
{
  if (pendingGameChannels[id] != null)
  {
    //if for some reason channel does not exist (i.e. has been deleted while bot was down),
    //clear the data
    if (guild.channels.get(pendingGameChannels[id]) == null)
    {
      delete pendingGameChannels[id];
      return false;
    }

    else return true;
  }

  else return false;
};

//also ensures that the channel is a game channel created for that effect,
//since regular channels won't be stored in pendingGameChannels
module.exports.isChannelCreator = function(userID, channelID)
{
  if (pendingGameChannels[userID] === channelID)
  {
    return true;
  }

  else return false;
};

//If a channel gets deleted, remove it from the pendingGameChannels list so the
//user is free to create a new one
module.exports.updateAndDeletePendingGameChannel = function(channelID)
{
  for (var userID in pendingGameChannels)
  {
    if (pendingGameChannels[userID] === channelID)
    {
      delete pendingGameChannels[userID];
    }
  }
};

module.exports.getPendingGameChannel = function(memberID, guild)
{
  return guild.channels.get(pendingGameChannels[memberID]);
};

module.exports.isGameNameTaken = function(name)
{
  if (games[name.toLowerCase().trim()] != null)
  {
    return true;
  }

  for (id in instances)
  {
    var instanceName = instances[id].getName();

    if (instanceName != null && instanceName.toLowerCase() === name.toLowerCase().trim())
    {
      return true;
    }
  }

  return false;
};

module.exports.setGameName = function(message, userID)
{
  var instance = instances[userID];

  rw.log(["host", "general"], `Setting game name...`);
  if (module.exports.isGameNameTaken(message.content) === true)
  {
    rw.log(["host", "general"], `Game name ${message.content} already taken, could not set game name.`);
    message.author.send("This name is already taken. Please choose a different name for your game.");
    return;
  }

  rw.log(["host", "general"], `Checking game name with slave server...`);
  instance.server.socket.emit("checkGameName", {id: userID, name: message.content.trim(), gameType: instance.gameType}, function(err)
  {
    if (err)
    {
      rw.log("error", true, `"checkGameName" slave Error:`, {User: message.author.username}, err);
      rw.log(["host", "general"], `Game name ${message.content} denied by the slave server:\n`, err);
      message.author.send(err);
      return;
    }

    instance.setName(message.content.trim());
    rw.log(["host", "general"], `Game name ${message.content} set successfully.`);
    message.author.send(instance.getCue());
  });
};

module.exports.setGameServer = function(message, userID)
{
  var instance = instances[userID];
  let server = slaveServersModule.getByName(message.content);

  rw.log(["host", "general"], `Checking server name...`);
  if (server == null)
  {
    message.author.send(`This server is not in my list. Please make sure you spelled the name correctly.`);
    return;
  }

  instance.setServer(server);

  server.socket.emit("reservePort", {id: userID}, function(err, port, ip)
  {
    if (err)
    {
      rw.log("error", true, `"reservePort" slave Error:`, {User: message.author.username}, err);
      rw.log(["host", "general"], `Could not reserve a port.`);
      cb(err);
      return;
    }

    rw.log(["host", "general"], `Port ${port} was reserved successfully.`);
    instance.setPort(port);

    rw.log(["host", "general"], `Game server ${message.content} set successfully.`);
    message.author.send(`Now, choose a game name. It must not contain any special characters other than underscores.`);
  });
};

module.exports.cancelAssistedHosting = function(message, userID)
{
  deleteHostingInstance(userID);
  rw.log(["host", "general"], `Deleted hosting instance ${userID} under ${message.author.username}'s request.`);
  message.author.send("Your assisted hosting instance has been cancelled.");
};

module.exports.undoHostingStep = function(message, userID)
{
  rw.log(["host", "general"], `Undoing last hosting step...`);
  try
  {
    instances[userID].stepBack();
    message.author.send(instances[userID].getCue());
  }

  catch(err)
  {
    message.author.send(err);
  }
};

module.exports.sendMapList = function(gameType, serverName, message)
{
  /*The expected list is an array containing objects, each with the following properties: *
  *   .name = the filename of the .map file                                               *
  *   .sea = the number of sea provinces of the map                                       *
  *   .land = the number of land provinces of the map                                     *
  *   .total = the total number of provinces of the map                                   *
  *****************************************************************************************/
  var msg = "";
  let server = slaveServersModule.getByName(serverName);

  if (server == null)
  {
    message.author.send(`This server is not in my list. Please make sure you spelled the name correctly.`);
    return;
  }

  rw.log(["host", "general"], `Requesting map list to the slave server ${server.name}...`);
  server.socket.emit("getMapList", {gameType: gameType}, function(err, list)
  {
    if (err)
    {
      rw.log(["host", "general"], `Error: could not get the map list:\n`, err);
      message.author.send(err);
      return;
    }

    rw.log(["host", "general"], `Map list obtained.`);

    list.forEach((map) =>
    {
      msg += `${(map.name).width(48)} (${map.land.toString().width(4)} land, ${map.sea.toString().width(3)} sea).\n`;
    });

    message.channel.send(`Here is the list of maps available:\n${msg.toBox()}`, {split: {prepend: "```", append: "```"}});
  });
};

module.exports.sendModList = function(gameType, serverName, message)
{
  var msg = "";
  let server = slaveServersModule.getByName(serverName);

  if (server == null)
  {
    message.author.send(`This server is not in my list. Please make sure you spelled the name correctly.`);
    return;
  }

  rw.log(["host", "general"], `Requesting mod list to the slave server...`);
  server.socket.emit("getModList", {gameType: gameType}, function(err, list)
  {
    if (err)
    {
      rw.log(["host", "general"], `Error: could not get the mod list:\n`, err);
      message.author.send(err);
      return;
    }

    rw.log(["host", "general"], `Mod list obtained.`);
    message.channel.send(`Here is the list of mods available:\n${list.join("\n").toBox()}`, {split: {prepend: "```", append: "```"}});
  });
};

module.exports.validateInput = function(message, userID)
{
  var instance = instances[userID];

  instance.registerSetting(message.content, function(err)
  {
    if (err)
    {
      rw.log(["host", "general"], `Could not validate input <${message.content}>.`);
      message.author.send(err);
      return;
    }

    instance.stepForward();

    //go on to next cue if we're still not finished
    if (instance.isReadyToLaunch() === false)
    {
      message.author.send(instance.getCue());
      return;
    }

    rw.log(["host", "general"], `Hosting instance is ready to be launched, creating game...`);

    //set up the game if that was the last cue
    createGame(instance, function(err, game)
    {
      if (err)
      {
        rw.log(["host", "general"], `Could not create the game.`);
        message.author.send(err);
        return;
      }

      rw.log(["host", "general"], `Game created. Saving...`);

      //after it's created, save the data
      game.save(function(err)
      {
        if (err)
        {
          rw.log(["host", "general"], `Could not save the game's data.`);
          message.author.send(`There was an error when saving your game's data.`);
          return;
        }

        game.server.addGame(game);
        rw.log(["host", "general"], `Game's data saved. Hosting the game...`);

        //then host the game instance
        game.host(null, function(err)
        {
          if (err)
          {
            rw.log(["host", "general"], `Could not host the game.`);
            message.author.send(err);
            return;
          }

          rw.log(["host", "general"], `Game hosted.`);
          newsModule.post(`${message.author.username} created the game ${game.channel}.`, game.guild.id);
          message.author.send(`The game has been hosted on the server. You can connect to it at IP ${game.ip} and Port ${game.port}. You can find the settings in the game's channel.`);
          game.channel.send(`${game.printSettings().toBox()}`)
          .then((msg) => msg.pin())
          .catch((err) => game.channel.send(`Error occurred when trying to pin settings:\n\n${err.message}`));
        });
      });
    });
  });
};

module.exports.hasOngoingInstance = function(id)
{
  if (instances[id] != null)
  {
    return true;
  }

  else return false;
};

module.exports.instanceHasName = function(id)
{
  if (instances[id] != null && instances[id].hasName() === true)
  {
    return true;
  }

  else return false;
};

module.exports.instanceHasServer = function(id)
{
  if (instances[id] != null && instances[id].hasServer() === true)
  {
    return true;
  }

  else return false;
};

module.exports.notifyAssistedHostingUsersOfDisconnection = function(server)
{
  rw.log(["host", "general"], `Notifying assisted hosting users of disconnection...`);
  for (var id in instances)
  {
    if (instances[id].server == null || instances[id].server.token !== server.token)
    {
      continue;
    }

    //instances[id].organizer.send(`The server that hosts this assisted hosting instance's got unexpectedly disconnected, probably due to an error. You will have to restart an assisted hosting by using the \`${config.prefix}host\` command.`);
    rw.log(["host", "general"], `${instances[id].organizer.user.username} notified; deleting instance <${id}>...`);
    deleteHostingInstance(id);
    rw.log(["host", "general"], `Instance deleted.`);
  }
};

//removes a game both from the game list and from the server object that contains it
module.exports.deleteGameData = function(name)
{
  delete games[name.toLowerCase()];

  //delete game from server object too
  slaveServersModule.deleteGame(name);
  rw.log(["host", "general"], `${name} game data deleted.`);
};

function createGame(instance, cb)
{
  //create game instance on the slave server
  gameHub.create(instance.name, instance.port, instance.organizer, instance.server, instance.gameType, instance.isBlitz, instance.getSettingsPack(), function(err, game)
  {
    if (err)
    {
      cb(err);
      return;
    }

    deleteHostingInstance(instance.organizer.id);

    //if a pending channel exists with this member's ID, it's because he created a game channel first.
    //Thus, assign the existing channel and create a role for it, then delete the game data
    //stored under the member's ID and assign the new one.
    if (pendingGameChannels[instance.organizer.id] != null)
    {
      game.channel = game.guild.channels.get(pendingGameChannels[instance.organizer.id]);

      channelFunctions.createGameRole(game.name + " Player", game.organizer, function(err, role)
      {
        if (err)
        {
          cb(err);
          return;
        }

        game.role = role;
        games[game.name.toLowerCase()] = game;
        delete pendingGameChannels[instance.organizer.id];

        rw.saveJSON(config.pathToPendingChannels, pendingGameChannels, function(err)
        {
          if (err)
          {
            cb(err);
          }

          else cb(null, game);
        });
      });
    }

    //if a game does NOT exist with this member's ID, it's because he chose to host the game directly.
    //Thus, the game will require both the channel and role to be created for it.
    else
    {
      channelFunctions.addGameChannelAndRole(game.name, game.organizer, game.isBlitz, function(err, channel, role)
      {
        if (err)
        {
          cb(err);
          return;
        }

        game.channel = channel;
        game.role = role;
        games[game.name.toLowerCase()] = game;
        cb(null, game);
      });
    }
  });
}

function newInstance(member, port, server)
{
  return {member: member, port: port, server: server};
}

function deleteHostingInstance(userID)
{
  if (instances[userID] != null)
  {
    //only release port after server was selected
    if (instances[userID].server != null)
    {
      instances[userID].server.socket.emit("releasePort", {port: instances[userID].port});
    }

    delete instances[userID];
  }
}

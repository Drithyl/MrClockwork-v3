
const rw = require("./reader_writer.js");
const tokens = require("./server_tokens.json").list;

/*********************************************************************************************************************************************
*		each slave server object will contain:                                                                                                   *
*                                                                                                                                            *
*   token:            String (unique token that identifies a server and authenticates it, must have the toekn list on the master server side)*
*		capacity:         Int (maximum capacity of games, the current capacity will be checked through the length of the hostedGameNames),       *
*		hostedGameNames:  Array (the names of all games hosted, the length property can be used to figure out the total games)                   *
*********************************************************************************************************************************************/

var servers = [];

module.exports.verifySlave = function(socket, data)
{
  if (data.token == null)
	{
		throw `The socket ${socket.id} tried to connect with an undefined token.`;
	}

	if (tokens.includes(data.token) === false)
	{
		throw `The socket ${socket.id} tried to connect with an invalid token: ${data.token}`;
	}

	if (isNaN(data.capacity) === true)
	{
		throw `The authenticated server with the token <${data.token}> has an invalid capacity: ${data.capacity}`;
	}

  if (typeof data.ip !== "string")
  {
    throw `The authenticated server's IP is incorrect: ${data.ip}`;
  }
}

module.exports.instanceSlave = function(socket, data, gameList)
{
  var slave = {};
  slave.name = data.name;
  slave.hostedGameNames = data.hostedGameNames;
  slave.capacity = data.capacity;
  slave.token = data.token;
  slave.socket = socket;
  slave.ip = data.ip;
  slave.games = {};

  for (var name in gameList)
  {
    if (gameList[name].serverToken === data.token)
    {
      slave.games[name] = gameList[name];
      //pings too annoying
      //gameList[name].organizer.send(`The server on which your game ${name} is hosted is online! The game was probably launched automatically, but if not, you can use the launch command.`);
    }
  }

  slave.addGame = addGame;
  slave.hostGames = hostGames;
  slave.disconnect = disconnect;
  slave.getCurrentCapacity = getCurrentCapacity;
  servers.push(slave);
	socket.emit("validated");
  return slave;
};

module.exports.getList = function()
{
  var str = "";

  servers.forEach(function(server)
  {
    str += `${server.name}`.width(30) + `Capacity: ${server.getCurrentCapacity()}.\n`;
  });

  return str;
}

module.exports.forEach = function(fn)
{
  servers.forEach(function(slave)
  {
    fn(slave);
  });
};

module.exports.getLength = function()
{
  return servers.length;
}

module.exports.getSlave = function(token)
{
  var slave;

  slave = servers.find(function(server)
  {
    if (server.socket.id === token)
    {
      return server;
    }
  });

  if (slave == null)
  {
    slave = servers.find(function(server)
    {
      if (server.token === token)
      {
        return server;
      }
    });
  }

  return slave;
};

module.exports.getFirst = function()
{
  return servers[0];
};

module.exports.getByName = function(name)
{
  return servers.find(function(server)
  {
    return server.name.toLowerCase() === name.trim().toLowerCase();
  });
};

module.exports.getByIndex = function(index)
{
  return servers[index];
};

module.exports.getLeastBusy = function()
{
  if (servers == null || servers.length < 1)
  {
    return null;
  }

  return servers.sort(function(serverA, serverB)
  {
    return (serverA.capacity - serverA.hostedGameNames.length) - (serverB.capacity - serverB.hostedGameNames.length);
  })[0];
};

module.exports.getAll = function()
{
  return servers;
}

module.exports.deleteGame = function(name)
{
  servers.find(function(server)
  {
    if (server.games[name.toLowerCase()] != null)
    {
      delete server.games[name.toLowerCase()];
    }
  });
}

function addGame(game)
{
  this.games[game.name.toLowerCase()] = game;
};

function hostGames()
{
  var that = this;
  loop(Object.keys(this.games));

  function loop(gameKeys)
  {
    //loop ends here
    if (gameKeys.length < 1)
    {
      return;
    }

    var game = that.games[gameKeys.shift()];
    game.setOnlineServer(that);

    //null argument means hosting the game with default options
    game.host(null, function(err)
    {
      if (err)
      {
        rw.logError(`Module: ${module.filename}\nCaller: module.exports.hostGames()\nFunction: game.host()\nGame: ${game.name}`, err);
        loop(gameKeys);
        return;
      }

      rw.log(null, `Hosted the game ${game.name}.`);
      loop(gameKeys);
    });
  }
}

function getCurrentCapacity()
{
  return this.capacity - Object.keys(this.games).length;
}

function disconnect()
{
  //must store the this context to be used within the .filter function,
  //otherwise this.token will return undefined
  var that = this;

  //update status of games hosted on that server
  for (var name in this.games)
  {
    this.games[name].setServerOffline();
  }

  //remove the server that disconnected from the array
  //(effectively filter it out)
  servers = servers.filter(function(server)
  {
    return server.token !== that.token;
  });
}

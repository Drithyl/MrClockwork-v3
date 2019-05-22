
const config = require("./config.json");
const rw = require("./reader_writer.js");
const hoster = require("./hoster.js");
const dom4game = require("./dom4game.js");
const coe4game = require("./coe4game.js");
const dom5game = require("./dom5game.js");
const emitter = require("./emitter.js");
const slaveServersModule = require("./slave_server.js");

module.exports.create = function(name, port, member, server, gameType, isBlitz, settings, cb)
{
  if (gameType === config.dom4GameTypeName)
  {
    dom4game.create(name, port, member, server, isBlitz, settings, cb);
  }

  else if (gameType === config.dom5GameTypeName)
  {
    dom5game.create(name, port, member, server, isBlitz, settings, cb);
  }

  else if (gameType === config.coe4GameTypeName)
  {
    coe4game.create(name, port, member, server, settings, cb);
  }

  else cb(`The game ${name} has an incorrect gameType, cannot create: ${gameType}.`, null);
};

module.exports.fromJSON = function(data, guild, cb)
{
  if (data.gameType === config.dom4GameTypeName)
  {
    dom4game.fromJSON(data, guild, cb);
  }

  else if (data.gameType === config.dom5GameTypeName)
  {
    dom5game.fromJSON(data, guild, cb);
  }

  else if (data.gameType === config.coe4GameTypeName)
  {
    coe4game.fromJSON(data, guild, cb);
  }

  else throw `The game ${data.name} has an incorrect game type, cannot revive: ${data.gameType}.`;
};

module.exports.shutDownGuildGames = function(guild)
{

};


/************************
*   TIME-BASED EVENTS   *
************************/
emitter.on("30 seconds", () =>
{
	//do a status check on all games of the online, authenticated servers
	slaveServersModule.forEach(function(server)
	{
		//Get an ordered array of the server's games
		var gameKeys = Object.keys(server.games);

    gameKeys.forEach(function(key, index)
    {
      let game = server.games[key];

      if (game.gameType === config.dom4GameTypeName || game.gameType === config.dom5GameTypeName)
			{
        if (game.isOnline === false)
        {
          return;
        }

        if (game.isServerOnline === false)
        {
          return;
        }

        if (game.server == null)
        {
          return rw.log("error", `Error when starting a statusCheck() for ${game.name}. The server field is null.`);
        }

        if (game.server.socket == null)
        {
          return rw.log("error", `Error when starting a statusCheck() for ${game.name}. The server's socket field is null.`);
        }

        game.runtime += 30; //seconds

        game.statusCheck(function(err)
  			{
  			});
			}
    });
	});
});

emitter.on("5 minutes", () =>
{
	//do a status check on all games of the online, authenticated servers
	/*slaveServersModule.forEach(function(server)
	{
    var gameKeys = Object.keys(server.games);

    gameKeys.forEachAsync(function(key, index, next)
    {
      let game = server.games[key];

      if (game.gameType !== config.dom4GameTypeName && game.gameType !== config.dom5GameTypeName)
			{
				next();
				return;
			}

			game.backupSavefiles(false, function(err)
			{
				next();
			});
    });
	});*/
});

emitter.on("hour", () =>
{
	//do a status check on all games of the online, authenticated servers
	slaveServersModule.forEach(function(server)
	{
    var gameKeys = Object.keys(server.games);

    gameKeys.forEachAsync(function(key, index, next)
    {
      let game = server.games[key];

      if (game.gameType === config.coe4GameTypeName)
			{
				next();
				return;
			}

			if (game.wasStarted === true)
			{
				next();
				return;
			}

			if (game.channel != null || game.role != null)
			{
				next();
				return;
			}

			if (game.getLocalCurrentTimer().turn !== 0)
			{
				next();
				return;
			}

			if (Date.now() - game.firstHosted <= 3600000)
			{
				next();
				return;
			}

			rw.log("general", `More than an hour has passed and ${game.name} has not started, neither does it have a channel. Cleaning it up.`);

			game.deleteGameSavefiles(function(err)
			{
				if (err)
				{
          rw.log("error", true, {Game: game.name}, `Could not delete game savefiles after an hour of it not starting.`);
					next();
					return;
				}

				rw.log("general", `${game.name}'s save was deleted.'`);

				game.deleteGameData(function(err)
				{
					if (err)
					{
						rw.log("error", true, {Game: game.name}, `Could not delete game data after an hour of it not starting.`);
						next();
						return;
					}

					game.organizer.send(`The game ${game.name} has been deleted and cleaned up. More than an hour passed, and it was not started, nor does it have a channel assigned.`);
          hoster.deleteGameData(game.name);
					rw.log("general", `${game.name}'s game data was deleted.'`);
					next();
				});
			});
    });
	});
});

//Only CoE games use this timer
emitter.on("5 seconds", () =>
{

});

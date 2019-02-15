
/******************************
*		REQUIRED DISCORD MODULE		*
******************************/
const Discord = require('discord.js');

/******************
*   BOT CLIENT    *
******************/
const bot = new Discord.Client();

/**************
*   MODULES   *
**************/
require("./prototype_functions.js");
const fs = require('fs');
const config = require("./config.json");
const emitter = require("./emitter.js");
const rw = require("./reader_writer.js");
const timer = require("./timer.js");
const timeEventsEmitter = require("./time_events_emitter.js");
const gameHub = require("./game_hub.js");
const commands = require("./process_commands.js");
const slaveServersModule = require("./slave_server.js");

var guildModule;		//to be initialized after bot is logged in.
var hoster;         //to be initialized after loading all data.


/**********************************
*		ESTABLISH AN EXPRESS SERVER		*
**********************************/
var express = require("express");
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

//Will switch to true when the on.ready event first triggers so that certain bits of code don't get re-executed when the bot reconnects and goes through on.ready again
var wasInitialized = false;
var didNotReconnect = false;

//server swapping occurs when a game's original server is not available, so it
//gets assigned a new server from the other ones. This feature is disabled for now
//as it still must be implemented (TODO)
var serverSwappingEnabled = false;

var masterOwner;
var games = {};

/****************************************
*   CALLED WHEN bot.login() RESOLVES    *
****************************************/
bot.on("ready", () =>
{
	didNotReconnect = false;
	guildModule = require("./guild_data").init(bot);
  reviveGames();
	rw.log(null, "Bot logged in.");
});


/******************
*   BOT EVENTS    *
******************/
//Triggers when the bot is added to a guild or when a guild becomes available (i.e. after a Discord outage)
bot.on("guildCreate", guild =>
{
	//guild already existed in the bot, so it means that it's available again after a Discord outage
	if (guildModule.botHasGuild(guild.id) === true)
	{
		rw.log(null, `The guild ${guild.name} is available again. Launching its games.`);
		guild.owner.send(`The guild ${guild.name} is available again. Launching its games.`).catch(console.error);

		for (var name in games)
		{
			rw.log(null, `name ${name}`);

			if (games[name].guild.id !== guild.id)
			{
				continue;
			}

			games[name].host(null, function(err)
			{
				if (err)
				{
					rw.logError({Game: name}, err);
					return;
				}

				if (games[name].organizer != null)
				{
					games[name].organizer.send(`${name} was launched, as the guild ${guild.name} became available again.`);
				}
			});
		}
	}

	else guild.owner.send("Thank you for using this bot. To get started, you must give me permissions to manage channels and roles, and then use the command `%deploy` in any of the guild's channels which the bot can see. It will create a few necessary roles and categories.");
});

bot.on("guildUnavailable", (guild) =>
{
	didNotReconnect = true;
	rw.log(null, `The guild ${guild.name} is unavailable, probably due to a Discord outage. Shutting down its games.`);
	guild.owner.send(`The guild ${guild.name} is unavailable, probably due to a Discord outage. Shutting down its games.`).catch(console.error);

	for (var name in games)
	{
		if (games[name].guild.id !== guild.id)
		{
			continue;
		}

		games[name].kill(function(err)
		{
			if (err)
			{
				rw.logError({Game: name}, err);
				return;
			}

			if (games[name].organizer != null)
			{
				games[name].organizer.send(`${name} was shut down due to the guild ${guild.name} becoming unavailable. This is probably caused by a Discord outage.`);
			}
		});
	}
});

bot.on("channelDelete", channel =>
{
	hoster.updateAndDeletePendingGameChannel(channel.id);
});

bot.on('message', message =>
{
	var isDM = (message.channel.type === "dm");
	var args = message.content.split(/ +/);
	var command = args.shift().toLowerCase();

	if (message.author.bot === true)
	{
		return;
	}

	if (isDM === true)
	{
		emitter.emit("DM", message);
		commands.tryCommand(message, command, args, games, null, isDM);
		return;
	}

	message.guild.fetchMember(message.author).then(function(member)
	{
		emitter.emit("guildMessage", {guild: message.guild, member: member, message: message});
		commands.tryCommand(message, command, args, games, member, isDM);
		//processChannelMessage(message, member);
	});
});

//only triggers on messages sent after the bot was started
bot.on("messageDelete", message =>
{
	if (message.channel.type === "text")
	{
		message.guild.fetchMember(message.author).then(function(member)
		{
			//handle deleted message
		});
	}
});

bot.on("disconnect", () =>
{
	didNotReconnect = true;
	rw.log(null, "I have been disconnected!");
	setTimeout (reconnect.bind(null, config.token), reconnectInterval);

	if (masterOwner)
	{
		masterOwner.send("I have been disconnected!").catch((err) => {rw.logError(err);});
	}
});

bot.on("reconnecting", () =>
{
	rw.log(null, "Trying to reconnect...");

	if (masterOwner)
	{
		//masterOwner.send("Trying to reconnect...").catch((err) => {rw.logError(err);});
	}
});

bot.on("debug", info =>
{
	//rw.log(null, "DEBUG: " + info);
});

bot.on("warn", warning =>
{
	rw.logError(`Warning:`, warning);
});

bot.on("error", (err) =>
{
	rw.logError(`Bot Error:`, err);

	if (masterOwner)
	{
		masterOwner.send(`Bot Error: \n\n${err}`).catch((error) => {rw.logError(`Could not send message:`, error);});
	}
});

function initializeServer()
{
  server.listen(3000);

  app.get("/", function (req, res)
  {

  });

  //app.use("/slaveServer", express.static(__dirname + "/slaveServer"));
}

function listenToSlaves()
{
  io.on("connection", function(socket)
  {
    rw.log(null, `Socket connected with id: ${socket.id}.`);
		socket.emit("init", null, function(data)
		{
			try
			{
				slaveServersModule.verifySlave(socket, data);
			}

			catch(err)
			{
				rw.log(config.generalLogPath, err);
				return;
			}

			slaveServersModule.instanceSlave(socket, data, games).hostGames();
			rw.log(null, `Server ${data.name} authenticated. Current capacity is ${data.hostedGameNames.length}/${data.capacity}.`);
		});

    // Disconnect listener
    socket.on("disconnect", function()
  	{
			var server = slaveServersModule.getSlave(socket.id);

			if (server != null)
			{
				rw.log(null, `Server ${server.name} (socket id ${socket.id}) disconnected.`);
				hoster.notifyAssistedHostingUsersOfDisconnection(server);
				server.disconnect();
			}

			else rw.log(null, `Unidentified server (socket id ${socket.id}) disconnected.`);
    });

		//emitted by a slave server when one of the hosted games shuts down (either manually or because the process ended)
		socket.on("gameClosedUnexpectedly", function(data)
		{
			if (data.name == null)
			{
				rw.log(null, `A game without name was reported to have shut down unexpectedly. Data received:\n\n${JSON.stringify(data, null, 2)}`);
				return;
			}

			if (games[data.name.toLowerCase()] == null)
			{
				rw.log(null, `The game ${data.name} was reported to have shut down unexpectedly, but cannot be found in the list.`);
				return;
			}

			rw.log(null, `The game ${data.name} has shut down unexpectedly.`);
			games[data.name.toLowerCase()].isOnline = false;
			games[data.name.toLowerCase()].organizer.send(`Your game ${data.name} has shut down unexpectedly.`);
		});

		//emitted by a slave server when one of the games shuts down due to an error (for example, wrong path to the dom5 exe)
		socket.on("gameError", function(data)
		{
			if (games[data.name.toLowerCase()] == null)
			{
				rw.log({"error": data.error}, `The game ${data.name} was reported to have shut down unexpectedly due to an error, but it cannot be found in the list of games.`);
				return;
			}

			rw.logError({"error": data.error}, `The game ${data.name} was reported to have shut down unexpectedly due to an error.`);
			games[data.name.toLowerCase()].isOnline = false;
			games[data.name.toLowerCase()].organizer.send(`Your game ${data.name} has shut down due to an error.`);
		});
  });
}

function reviveGames()
{
  var directories;

	fs.readdir(config.pathToGameData, function(err, filenames)
	{
		if (err)
		{
			rw.logError({path: config.pathToGameData}, err);
			throw `A file system related error occurred while reading the games directory in the reviveGames() function:\n\n${err}`;
		}

		//only grab the filenames that are directories
		directories = filenames.filter(function(name)
		{
			return fs.lstatSync(config.pathToGameData + "/" + name).isDirectory() === true;
		});

		directories.forEachAsync(function(dir, index, next)
		{
			rw.readJSON(`${config.pathToGameData}/${dir}/data.json`, null, function callback(err, gameData)
		  {
				var revivedGame;
				var hostServer;

				if (err)
				{
					rw.logError({Path: `${config.pathToGameData}/${dir}/data.json`}, err);
					next();
					return;
				}

				revivedGame = gameHub.fromJSON(gameData, guildModule.getGuildObject(gameData.guild));

				if (typeof revivedGame !== "object")
				{
					throw `An error occurred when reviving game ${gameData.name}.`;
				}

				games[revivedGame.name.toLowerCase()] = revivedGame;
				rw.log(null, `Revived the game ${revivedGame.name}.`);

				//continue loop
				next();
		  });

		}, function callback()
		{
			//reviving games finished
			finalizeInitialization();
		});
	});
}

function finalizeInitialization()
{
	bot.fetchUser(config.masterOwner).then(function(master)
	{
		masterOwner = master;
		hoster = require("./hoster.js").init(games, slaveServersModule, gameHub);

		//start tracking time
		timeEventsEmitter.start();

		/*******************************************************************
		*   START UP THE LISTENING SERVER AND LISTEN TO SLAVE CONNECTIONS  *
		*******************************************************************/
		initializeServer();
		listenToSlaves();

		wasInitialized = true;
		masterOwner.send("Initialization complete.").catch((err) => {rw.logError(`Error when sending message:`, err);});
		rw.log(null, "Initialization complete.");
	});
}

function reconnect (token)
{
	if (didNotReconnect == true)
	{
		bot.login(token);
		rw.log(null, "Manual attempt to reconnect...");
	}
}

//Login to the server, always goes at the end of the document, don't ask me why
bot.login(config.token);

//This simple piece of code catches those pesky unhelpful errors and gives you the line number that caused it!
process.on("unhandledRejection", err =>
{
  rw.log(null, "Uncaught Promise Error: \n" + err.stack);

	if (masterOwner)
	{
		masterOwner.send("Uncaught Promise Error: \n" + err.stack);
	}
});

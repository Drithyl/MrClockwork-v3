
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
	rw.log("general", "Bot logged in.");
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
		rw.log("general", `The guild ${guild.name} is available again. Launching its games.`);
		guild.owner.send(`The guild ${guild.name} is available again. Launching its games.`).catch(console.error);

		for (var name in games)
		{
			rw.log("general", `name ${name}`);

			if (games[name].guild.id !== guild.id)
			{
				continue;
			}

			games[name].host(null, function(err)
			{
				if (err)
				{
					rw.log("error", {Game: name, error: err});
					return;
				}

				if (games[name].organizer != null)
				{
					games[name].organizer.send(`${name} was launched, as the guild ${guild.name} became available again.`);
				}
			});
		}
	}

	else guild.owner.send(`Thank you for using this bot. To get started, you must give me permissions to manage channels and roles, and then use the command \`${config.prefix}deploy\` in any of the guild's channels which the bot can see. It will create a few necessary roles and categories.`);
});

bot.on("guildDelete", guild =>
{

})

bot.on("guildUnavailable", (guild) =>
{
	didNotReconnect = true;
	rw.log("general", `The guild ${guild.name} is unavailable, probably due to a Discord outage. Shutting down its games.`);
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
				rw.log("error", true, {Game: name}, err);
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
	rw.log("general", "I have been disconnected!");
	setTimeout (reconnect.bind(null, config.token), reconnectInterval);

	if (masterOwner)
	{
		masterOwner.send("I have been disconnected!").catch((err) => {rw.log("error", err);});
	}
});

bot.on("reconnecting", () =>
{
	rw.log("general", "Trying to reconnect...");

	if (masterOwner)
	{
		//masterOwner.send("Trying to reconnect...").catch((err) => {rw.log("error", err);});
	}
});

bot.on("debug", info =>
{
	//rw.log("general", "DEBUG: " + info);
});

bot.on("warn", warning =>
{
	rw.log("error", `Warning:`, warning);
});

bot.on("error", (err) =>
{
	if (err.error.code === "ECONNRESET")
	{
		rw.writeToGeneralLog(`ECONNRESET Error:`, err.error);
		return;
	}

	rw.log("error", `Bot Error:`, err);

	if (masterOwner)
	{
		masterOwner.send(`Bot Error: \n\n${rw.JSONStringify(err.error)}`).catch((error) => {rw.log("error", true, `Could not send message:`, error);});
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
    rw.log("general", `Socket connected with id: ${socket.id}.`);
		socket.emit("init", null, function(data)
		{
			try
			{
				slaveServersModule.verifySlave(socket, data);
			}

			catch(err)
			{
				rw.log("error", err);
				return;
			}

			slaveServersModule.instanceSlave(socket, data, games).hostGames();
			rw.log("general", `Server ${data.name} authenticated. Current capacity is ${data.hostedGameNames.length}/${data.capacity}.`);
		});

    // Disconnect listener
    socket.on("disconnect", function()
  	{
			var server = slaveServersModule.getSlave(socket.id);

			if (server != null)
			{
				rw.log("general", `Server ${server.name} (socket id ${socket.id}) disconnected.`);
				hoster.notifyAssistedHostingUsersOfDisconnection(server);
				server.disconnect();
			}

			else rw.log("general", `Unidentified server (socket id ${socket.id}) disconnected.`);
    });

		//emitted by a slave server when one of the hosted games' stdio is closed
		socket.on("stdioClosed", function(data)
		{
			if (games[data.name.toLowerCase()] == null)
			{
				rw.log("general", `The game ${data.name} reported to have closed its stdio with code ${data.code} and signal ${data.signal}, but it cannot be found in the list of active games.`);
			}

			else rw.log("general", `The game ${data.name} reported to have closed its stdio with code ${data.code} and signal ${data.signal}.`);
		});

		//emitted by a slave server when one of the hosted games exits itself
		//These do not receive a signal, only a code
		socket.on("gameExited", function(data)
		{
			if (games[data.name.toLowerCase()] == null)
			{
				rw.log("general", `The game ${data.name} reported to have exited with code ${data.code}, but it cannot be found in the list of active games.`);
				return;
			}

			rw.log("general", `The game ${data.name} reported to have exited with code ${data.code}.`);
			games[data.name.toLowerCase()].isOnline = false;
			games[data.name.toLowerCase()].organizer.send(`Your game ${data.name} has shut down by itself (perhaps a game-related crash occurred). You can try launching it again (see \`${config.prefix}help\` for the command).`);
		});

		//emitted by a slave server when one of the hosted games gets terminated unexpectedly (i.e. not by a kill command)
		socket.on("gameTerminated", function(data)
		{
			if (games[data.name.toLowerCase()] == null)
			{
				rw.log("general", `The game ${data.name} reported to have been abnormally terminated with signal ${data.signal}, but it cannot be found in the list of active games.`);
				return;
			}

			rw.log("general", `The game ${data.name} reported to have been abnormally terminated with signal ${data.signal}.`);
			games[data.name.toLowerCase()].isOnline = false;
			games[data.name.toLowerCase()].organizer.send(`Your game ${data.name}'s process has been abnormally terminated. You can try launching it again (see \`${config.prefix}help\` for the command).`);
		});

		socket.on("stderrData", function(data)
		{
			if (games[data.name.toLowerCase()] == null)
			{
				rw.log("general", `The game ${data.name} emitted stderr data, but it cannot be found in the list of active games:\n\n`, data.data);
			}

			else rw.log("general", `The game ${data.name}  emitted stderr data:\n\n`, data.data);
		});

		socket.on("stderrError", function(data)
		{
			if (games[data.name.toLowerCase()] == null)
			{
				rw.log("general", `The game ${data.name} emitted an stderr error, but it cannot be found in the list of active games:\n\n`, data.error);
			}

			else rw.log("general", `The game ${data.name}  emitted an stderr error:\n\n`, data.error);
		});

		socket.on("stdoutData", function(data)
		{
			if (games[data.name.toLowerCase()] == null)
			{
				rw.log("general", `The game ${data.name} emitted stdout data, but it cannot be found in the list of active games:\n\n`, data.data);
			}

			else rw.log("general", `The game ${data.name}  emitted stdout data:\n\n`, data.data);
		});

		socket.on("stdoutError", function(data)
		{
			if (games[data.name.toLowerCase()] == null)
			{
				rw.log("general", `The game ${data.name} emitted an stdout error, but it cannot be found in the list of active games:\n\n`, data.error);
			}

			else rw.log("general", `The game ${data.name}  emitted an stdout error:\n\n`, data.error);
		});

		socket.on("stdinError", function(data)
		{
			if (games[data.name.toLowerCase()] == null)
			{
				rw.log("general", `The game ${data.name} emitted an stdin error, but it cannot be found in the list of active games:\n\n`, data.error);
			}

			else rw.log("general", `The game ${data.name} emitted an stdin error:\n\n`, data.error);
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
			rw.log("error", true, {path: config.pathToGameData}, err);
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
					rw.log("error", true, {Path: `${config.pathToGameData}/${dir}/data.json`}, err);
					next();
					return;
				}

				revivedGame = gameHub.fromJSON(gameData, guildModule.getGuildObject(gameData.guild), (err, revivedGame) =>
				{
					if (err)
					{
						rw.log("error", `ERROR: ${gameData.name} could not be revived:`, err);
						next();
						return;
					}
					
					games[revivedGame.name.toLowerCase()] = revivedGame;
					rw.log("general", `Revived the game ${revivedGame.name}.`);
				});

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
		masterOwner.send("Initialization complete.").catch((err) => {rw.log("error", true, `Error when sending message:`, err);});
		rw.log("general", "Initialization complete.");
	});
}

function reconnect (token)
{
	if (didNotReconnect == true)
	{
		bot.login(token);
		rw.log("general", "Manual attempt to reconnect...");
	}
}

//Login to the server, always goes at the end of the document, don't ask me why
bot.login(config.token);

//This simple piece of code catches those pesky unhelpful errors and gives you the line number that caused it!
process.on("unhandledRejection", err =>
{
  rw.log("general", "Uncaught Promise Error: \n" + err.stack);

	if (masterOwner)
	{
		masterOwner.send("Uncaught Promise Error: \n" + err.stack);
	}
});

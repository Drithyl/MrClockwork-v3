
const config = require("../config.json");
const fs = require("fs");
const permissions = require("../permissions.js");
const rw = require("../reader_writer.js");
const serversModule = require("../slave_server.js");
const newsModule = require("../news_posting.js");
const regexp = new RegExp(`^${config.prefix}UPLOAD`, "i");
const dom4Regexp = new RegExp("(DOM4)|(DOMINIONS4)", "i");
const dom5Regexp = new RegExp("(DOM5)|(DOMINIONS5)", "i");
const mapRegexp = new RegExp("^MAP", "i");
const modRegexp = new RegExp("^MOD", "i");
const emitter = require("../emitter.js");
const userUploadLimitPerDay = 5;
var history;

if (fs.existsSync(config.pathToUploadHistory) === false)
{
  fs.writeFileSync(config.pathToUploadHistory, "{}");
}

history = require(config.pathToUploadHistory);

module.exports.enabled = true;

module.exports.getChannelRequiredToInvoke = "guild";

module.exports.getReadableCommand = function()
{
  return "upload";
};

module.exports.getCommandArguments = ["`dom4`/`dom5`", "`mod`/`map`", "`[a google drive file ID]`"];

module.exports.getHelpText = function()
{
  return `Allows you to upload a map or a mod to the server through google drive. To use it, you must specify whether it's a dominions 4 or 5 mod or map, and then add the google drive file sharing link at the end of the command (which can be found when you right click a file on the drive website and click on Get Shareable Link). The file must be a .zip file containing the mod or map as is meant to be extracted into the mods or maps folder. If files with the same name exist in the server, they will be overwritten if they are mod image files, but .dm and map-related files will *not* be overwritten so as to not have an impact on ongoing games using that mod or map. To upload an updated version of a mod, just make sure you change the name to add the version number to it so it does not conflict. Please keep in mind that for bandwith reasons, each user can only upload ${userUploadLimitPerDay} map and ${userUploadLimitPerDay} mod zipfiles every day. You can upload more than one map and mod in the same zipfile, just make sure they are all zipped in the same structure in which it'll be extracted to the maps or mods folder.`;
};

module.exports.isInvoked = function(message, command, args, isDirectMessage)
{
  if (regexp.test(command) === true && isDirectMessage === false)
  {
    return true;
  }

  else return false;
};

module.exports.invoke = function(message, command, options)
{
  let id;
  let action;

  if (permissions.equalOrHigher("trusted", options.member, message.guild.id) === false)
  {
    message.channel.send("Sorry, only trusted members can upload files.");
    return;
  }

  if (dom4Regexp.test(options.args[0]) === false && dom5Regexp.test(options.args[0]) === false)
  {
    message.channel.send("You must specify whether this file is for dominions 4 (`dom4`) or 5 (`dom5`) in the first argument of the command. See help for more details.");
    return;
  }

  if (mapRegexp.test(options.args[1]) === false && modRegexp.test(options.args[1]) === false)
  {
    message.channel.send("You must specify whether this file is a map or a mod in the second argument of the command. See help for more details.");
    return;
  }

  if (typeof options.args[2] !== "string")
  {
    message.channel.send("You must add a google drive file ID at the end of the command for the file to be uploaded. See help for where to find the ID.");
    return;
  }

  id = ensureFileId(options.args[2]);

  if (id == null)
  {
    message.channel.send("This google file ID or link seems incorrect. Try to send *just* the id within the link (\`https://drive.google.com/open?id=YOUR_FILE_ID_HERE\`).");
    return;
  }

  if (history[message.author.id] != null && history[message.author.id][options.args[1]] >= userUploadLimitPerDay &&
      permissions.isGuildOwner(message.author.id, message.guild.id) === false && permissions.isMasterOwner(message.author.id) === false)
  {
    message.channel.send(`You have reached your ${options.args[1]} upload limit for today. You can try again in ${23 - new Date().getHours()}hours and ${59 - new Date().getMinutes()} minutes or have someone else do it for you.`);
    return;
  }

  if (mapRegexp.test(options.args[1]) === true)
  {
    action = "downloadMap";
  }

  else if (modRegexp.test(options.args[1]) === true)
  {
    action = "downloadMod";
  }

  rw.log(["upload", "general"], `${message.author.username} requested an upload of the ${options.args[0]} ${options.args[1]} file with id ${id}.`);
  upload(options.args[0], action, id, message);
};

function upload(gameType, action, id, message)
{
  let errors = {};
  let serversThatResponded = [];
  let serverArr = serversModule.getAll();

  if (serverArr.length < 1)
  {
    message.channel.send(`No servers are currently online. The file cannot be uploaded at this time.`);
    return;
  }

  serverArr.forEach(function(server)
  {
    let progressMsgIntro = `${server.name}'s download progress: `;
    errors[server.name] = [];

    rw.log(["upload", "general"], `Sent upload request of file id ${id} to the server ${server.name}.`);

    message.channel.send(`${progressMsgIntro}Starting...`)
    .then((progressMsg) =>
    {
      server.socket.emit(action, {gameType: gameType, fileId: id}, function(err)
      {
        if (err)
        {
          rw.log("error", `Error occurred during file download:\n\n${err}`);
          progressMsg.edit(`${progressMsgIntro}Error! ${err}`);
          return;
        }

        rw.log(["upload", "general"], `Server ${server.name} confirmed the start of the download.`);
        progressMsg.edit(`${progressMsgIntro}Downloading...`);

        //add the listener for the progress and final response from the slave
        //once it confirms the start of the download
        server.socket.on(`downloadResponse`, responseHandler);
        //server.socket.on("downloadProgress", progressHandler);
      });

      //handle every new progress event received
      /*function progressHandler(response)
      {
        progressMsg.edit(`${progressMsgIntro}${response.progress}%`);
        console.log(`Progress: ${response.progress}%`);
      }*/

      //handle the final response received
      function responseHandler(response)
      {
        //remove the handlers that were added and add server to the responded list
        server.socket.removeListener(`downloadResponse`, responseHandler);
        //server.socket.removeListener("downloadProgress", progressHandler);
        serversThatResponded.push(server);

        //add errors that may be included in the response
        if (response.failedFileErrors != null)
        {
          errors[server.name] = errors[server.name].concat(response.failedFileErrors);
        }

        if (response.err != null)
        {
          progressMsg.edit(`${progressMsgIntro}Error! Check your PMs.`);
        }

        else if (response.isDone === true)
        {
          if (errors[server.name].length > 0)
          {
            progressMsg.edit(`${progressMsgIntro}Complete, but warnings occurred. Check your PMs.`);
          }

          else progressMsg.edit(`${progressMsgIntro}Success! No errors occurred!`);
        }

        else
        {
          errors[server.name].push(`Response received from ${server.name} for file download was invalid.`);
          rw.log(["upload", "error"], `Response received from ${server.name} for file download is invalid:\n\n`, response);
        }

        //All servers finished
        if (serversThatResponded.length >= serverArr.length)
        {
          sendErrors(message.author, errors);
          addUploadToHistory(message.author.id, action, errors);
        }
      }

      //handle the timeout of this server when it hasn't responded in a long time
      setTimeout(function()
      {
        //make sure that it didn't respond
        if (serversThatResponded.find(function(respondant) {  return server.name === respondant.name;  }) == null)
        {
          //remove the handlers that were added and add server to the responded list
          server.socket.removeListener(`downloadResponse`, responseHandler);
          //server.socket.removeListener("downloadProgress", progressHandler);
          serversThatResponded.push(server);
          progressMsg.edit(`${progressMsgIntro}Timed out! No response was received from this server.`);
          errors[server.name].push(`Timed out! No response was received from this server.`);

          //All servers finished
          if (serversThatResponded.length >= serverArr.length)
          {
            sendErrors(message.author, errors);
            addUploadToHistory(message.author.id, action, errors);
          }
        }

      }, 300000);
    });
  });
}

function sendErrors(user, errors)
{
  for (var serverName in errors)
  {
    //if at least an error is found, send them to the user
    if (errors[serverName].length > 0)
    {
      user.send(`Your upload completed, but some errors occurred. This upload won't count towards the daily limit due to the errors. Check the attached file for more details.`, {files: [{attachment: Buffer.from(printErrors(errors)), name: `errors.txt`}]}).catch(function(err)
      {
        rw.log("error", true, `Error when sending message with attachment:`, {User: user.username}, err);
        user.send(`The upload completed successfully, but some errors occurred. However, the error file could not be sent to you.`);
      });

      break;
    }
  }
}

function updateDownloadProgress(channel, server)
{
  let updateMsg;

  return function(percentageCompleted)
  {
    if (updateMsg == null)
    {
      channel.send(`${server.name}'s download progress: ${percentageCompleted}.`)
      .then((message) =>
      {
        updateMsg = message;
      });
    }

    else if (percentageCompleted === 100)
    {
      updateMsg.edit(`${server.name}'s download progress: Complete!`);
    }

    else updateMsg.edit(`${server.name}'s download progress: ${percentageCompleted}.`);
  }
}

function printErrors(errors)
{
  let header = "Uploading your file encountered the following errors, ordered by server:";
  let str = "";

  for (var serverName in errors)
  {
    str += `\n\n${serverName}:\n\n`;

    errors[serverName].forEach(function(err)
    {
      str += `\t${err}`;
    });
  }

  rw.log(["upload", "general"], `The following errors occurred when uploading the file:${str}`);
  return header + str;
}

function addUploadToHistory(userID, type)
{
  if (history[userID] == null)
  {
    history[userID] = {};
  }

  if (history[userID][type] == null)
  {
    history[userID][type] = 1;
  }

  else history[userID][type]++;

  rw.saveJSON(config.pathToUploadHistory, history, function(err)
  {
    if (err)
    {
      rw.log("error", `Could not add ${userID}'s upload to history:\n\n${err.message}`);
    }
  });
}

function resetUploadHistory(cb)
{
  for (var id in history)
  {
    delete history[id];
  }

  rw.saveJSON(config.pathToUploadHistory, history, function(err)
  {
    if (err)
    {
      cb(err);
      return;
    }

    cb();
  });
}

//a day has passed, reset upload limit
emitter.on("day", () =>
{
  resetUploadHistory(function(err)
  {
    //error logged somewhere else
  });
});

function ensureFileId(id)
{
  let linkRegExp = new RegExp("^(https?:\\/\\/)?(drive.google.com)?(/file/d/)?(/drive/folders/)?(/open\\?id=)?([a-z0-9\\-_]+)(\\/?\\??.+)?", "i");

  if (typeof id !== "string")
  {
    return null;
  }

  id = id.trim();

  if (linkRegExp.test(id) === true)
  {
    return id.replace(linkRegExp, "$6");
  }

  else return null;
}

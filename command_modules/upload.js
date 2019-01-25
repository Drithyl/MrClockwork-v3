
const config = require("../config.json");
const fs = require("fs");
const permissions = require("../permissions.js");
const rw = require("../reader_writer.js");
const serversModule = require("../slave_server.js");
const regexp = new RegExp(`^${config.prefix}UPLOAD`, "i");
const dom4Regexp = new RegExp("(DOM4)|(DOMINIONS4)", "i");
const dom5Regexp = new RegExp("(DOM5)|(DOMINIONS5)", "i");
const mapRegexp = new RegExp("^MAP", "i");
const modRegexp = new RegExp("^MOD", "i");
const emitter = require("../emitter.js");
const userUploadLimitPerDay = 1;
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
  return `Allows you to upload a map or a mod to the server through google drive. To use it, you must specify whether it's a dominions 4 or 5 mod or map, and then add the google drive file ID at the end of the command (which can be found when you right click a file on the drive website and click on Get Shareable Link, example: \`https://drive.google.com/open?id=YOUR_FILE_ID_HERE\`). The file must be a .zip file containing the mod or map as is meant to be extracted into the mods or maps folder. If files with the same name exist in the server, they will be overwritten (to allow for mod updates), so make sure the files you are uploading are correct. Please keep in mind that for bandwith reasons, each user can only upload one map and one mod zipfile every day.`;
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
  let action;
  let index = 0;
  let errors = {};
  let errorsString;

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

  if (history[message.author.id] != null && history[message.author.id][options.args[1]] >= userUploadLimitPerDay &&
      permissions.isGuildOwner(message.author.id, message.guild.id) === false && permissions.isMasterOwner(message.author.id) === false)
  {
    message.channel.send(`You have reached your ${options.args[1]} upload limit for today. You can try again in${23 - new Date().getHours()}hours and ${59 - new Date().getMinutes()} minutes or have someone else do it for you.`);
    return;
  }

  if (serversModule.length < 1)
  {
    message.channel.send(`No servers are currently online. The file cannot be uploaded at this time.`);
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

  rw.log(config.uploadLogPath, `${message.author.username} requested an upload of the ${options.args[0]} ${options.args[1]} file with id ${options.args[2]}.`);
  message.channel.send("The upload for your file has started. You will receive a private message when it finished (this can take a while).");

  serversModule.getAll().forEachAsync(function(server, index, next)
  {
    rw.log(config.uploadLogPath, `Sent upload request of file id ${options.args[2]} to the server ${server.name}.`);

    server.socket.emit(action, {gameType: options.args[0], fileId: options.args[2]}, function(err, failedFileErrors)
    {
      if (err)
      {
        if (errors[server.name] == null)
        {
          errors[server.name] = [];
        }

        errors[server.name].push(err);
      }

      if (Array.isArray(failedFileErrors) === true && failedFileErrors.length > 0)
      {
        if (errors[server.name] == null)
        {
          errors[server.name] = [];
        }

        errors[server.name].concat(failedFileErrors);
      }

      next();
    });

  }, function callback()
  {
    errorsString = printErrors(errors);

    if (errorsString == null)
    {
      addUploadToHistory(message.author.id, options.args[1], function(err)
      {
        //error logged somewhere else
        message.author.send(`Your upload completed successfully. No errors were found.`);
      });
    }

    else message.author.send(`Your upload completed, but some errors occurred. This upload won't count towards the daily limit due to the errors. Check the attached file for more details.`, {files: [{attachment: Buffer.from(errorsString), name: `errors.txt`}]}).catch(function(err)
    {
      rw.logError({User: message.author.username}, `Error when sending message with attachment:`, err);
      message.author.send(`The upload completed successfully, but some errors occurred. However, the error file could not be sent to you.`);
    });
  });
};

function printErrors(errors)
{
  let header = "Uploading your file encountered the following errors, ordered by server:";
  let str = "";

  if (Object.keys(errors).length < 1)
  {
    return null;
  }

  for (var serverName in errors)
  {
    str += `\n\n${serverName}:\n\n`;

    errors[serverName].forEach(function(err)
    {
      str += `\t${err}`;
    });
  }

  rw.log(config.uploadLogPath, `The following errors occurred when uploading the file:${str}`);
  return header + str;
}

function addUploadToHistory(userID, type, cb)
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
      cb(err);
      return;
    }

    cb();
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

const fs = require("fs");
const config = require("./config.json");

module.exports.copyFileSync = function(source, target)
{
	try
	{
		let data = fs.readFileSync(source);
	  module.exports.checkAndCreateDir(target);
		fs.writeFileSync(target, data);
	}

	catch(err)
	{
		module.exports.log("error", true, {source: source, target: target, err: err});
		throw err;
	}
};

module.exports.copyFile = function(source, target, cb)
{
	return new Promise((resolve, reject) =>
	{
		module.exports.checkAndCreateDir(target);

		fs.readFile(source, function(err, buffer)
		{
			if (err)
			{
				module.exports.log("error", true, {source: source, target: target, err: err});

				if (typeof cb === "function") return cb(err);
				else return reject(err);
			}

			fs.writeFile(target, buffer, function(err)
			{
				if (err)
				{
					module.exports.log("error", true, {source: source, target: target, err: err});

					if (typeof cb === "function") return cb(err);
					else return reject(err);
				}

				if (typeof cb === "function") cb();
				else resolve(err);
			});
		});
	});
};

module.exports.copyDir = function(source, target, deepCopy, extensionFilter, cb)
{
	let filenames;

	return new Promise((resolve, reject) =>
	{
		if (fs.existsSync(source) === false)
		{
			let err = `The source path ${source} does not exist.`;
			if (typeof cb === "function") return cb(err);
			else return reject(err);
		}

		fs.readdir(source, (err, filenames) =>
		{
			if (err)
			{
				module.exports.log("error", true, {source: source, target: target, deepCopy: deepCopy, extensionFilter: extensionFilter, err: err});

				if (typeof cb === "function") return cb(err);
				else return reject(err);
			}

			filenames.forEachAsync((file, index, next) =>
			{
				//if there's a directory inside our directory and no extension filter, copy its contents too
				if (deepCopy === true && fs.lstatSync(`${source}/${file}`).isDirectory() === true)
				{
					module.exports.copyDir(`${source}/${file}`, `${target}/${file}`, deepCopy, extensionFilter, function(err)
					{
						if (err)
						{
							module.exports.log("error", true, {source: source, target: target, deepCopy: deepCopy, extensionFilter: extensionFilter, err:err});

							if (typeof cb === "function") return cb(err);
							else return reject(err);
						}

						else next();
					});
				}

				//run code if no extension filter was designated or if there was one and the file extension is included
				//or if there is an extension filter that includes empty extensions "" (files without extensions)
				else if (Array.isArray(extensionFilter) === false ||
								 (Array.isArray(extensionFilter) === true && extensionFilter.includes(file.slice(file.lastIndexOf(".")).toLowerCase()) === true) ||
								 (Array.isArray(extensionFilter) === true && extensionFilter.includes("") === true) && file.includes(".") === false)
				{
					module.exports.copyFile(`${source}/${file}`, `${target}/${file}`, function(err)
					{
						if (err)
						{
							if (typeof cb === "function") return cb(err);
							else return reject(err);
						}

						else next();
					});
				}

				//ignore file and loop
				else next();

			}, function finalCallback()
			{
				if (typeof cb === "function") cb();
				else resolve();
			});
		});
	});
};

module.exports.deleteDirContents = function(path, extensionFilter, cb)
{
	let filenames = fs.readdirSync(path);

	//will use promise whenever the cb is null, so that the function supports both
	//promises and callbacks
	return new Promise((resolve, reject) =>
	{
		filenames.forEachAsync((file, index, next) =>
		{
			//if there's a directory inside our directory and no extension filter, delete its contents too
			if (fs.lstatSync(`${path}/${file}`).isDirectory() === true)
			{
				return next();
			}

			if (Array.isArray(extensionFilter) === true &&
					extensionFilter.includes(file.slice(file.lastIndexOf(".")).toLowerCase()) === false &&
					(extensionFilter.includes("") === false && file.includes(".") === false))
			{
				return next();
			}

			//run code if no extension filter was designated or if there was one and the file extension is included
			//or if there is an extension filter that includes empty extensions "" (files without extensions)
			fs.unlink(`${path}/${file}`, function(err)
			{
				if (err)
				{
					module.exports.logError({path: path, extensionFilter: extensionFilter}, `fs.unlink Error:`, err);

					if (typeof cb === "function") cb(err);
					else reject(err);
				}

				else next();
			});

			//async loop ends so run the last callback/promise
		}, function finalCallback()
		{
			if (typeof cb === "function") cb();
			else resolve();
		});
	});
};

module.exports.deleteDir = function(path, cb)
{
	return new Promise((resolve, reject) =>
	{
		fs.readdir(path, (err, filenames) =>
		{
			if (err)
			{
				module.exports.log("error", true, {path: path, extensionFilter: extensionFilter, err: err});

				if (typeof cb === "function") return cb(err);
				else return reject(err);
			}

			filenames.forEachAsync((filename, index, next) =>
			{
				//delete contained dir through recursion as well
				if (fs.lstatSync(`${path}/${filename}`).isDirectory() === true)
				{
					module.exports.deleteDir(`${path}/${filename}`, () =>
					{
						if (err)
						{
							if (typeof cb === "function") return cb(err);
							else return reject(err);
						}

						else next();
					});
				}

				else
				{
					fs.unlink(`${path}/${filename}`, function(err)
					{
						if (err)
						{
							module.exports.log("error", true, {path: path, extensionFilter: extensionFilter, err: err});

							if (typeof cb === "function") return cb(err);
							else return reject(err);
						}

						else next();
					});
				}

				//final callback, remove the dir specified after having removed all files within
			}, function removeDir()
			{
				rmdir(path, (err) =>
				{
					if (err)
					{
						module.exports.log("error", true, {path: path, extensionFilter: extensionFilter, err: err});
						if (typeof cb === "function") return cb(err);
						else return reject(err);
					}

					if (typeof cb === "function") cb();
					else resolve();
				});
			});
		});
	});
};

//If a directory does not exist, this will create it
module.exports.checkAndCreateDir = function(filepath)
{
	var splitPath = filepath.split("/");
	var compoundPath = splitPath.shift();

	//It's length >= 1 because we don't want the last element of the path, which will be a file, not a directory
	while (splitPath.length != null && splitPath.length >= 1)
	{
		//prevent empty paths from being created
		if (fs.existsSync(compoundPath) === false && /[\w]/.test(compoundPath) === true)
	  {
	    fs.mkdirSync(compoundPath);
	  }

		compoundPath += "/" + splitPath.shift();
	}
};

module.exports.readJSON = function(path, reviver, cb)
{
	var obj = {};

	return new Promise((resolve, reject) =>
	{
		fs.readFile(path, "utf8", (err, data) =>
	 	{
			if (err)
			{
				let errStr = `There was an error while trying to read the JSON file ${path}:\n\n${err.message}`;
				module.exports.log("error", true, {path: path, reviver: reviver, err: err});

				if (typeof cb === "function") return cb(errStr);
				else return reject(errStr);
			}

			if (/[\w\d]/.test(data) === false)
			{
				let err = `No data in ${path}.`;
				module.exports.log("error", true, `File contains only whitespace`, {path: path});

				if (typeof cb === "function") return cb(err);
				else return reject(err);
			}

			if (reviver == null) obj = JSON.parse(data);
			else obj = JSON.parse(data, reviver);

			if (typeof cb === "function") cb(null, obj);
			else resolve(null, obj);
		});
	});
};

module.exports.saveJSON = function(path, obj, cb)
{
	return new Promise((resolve, reject) =>
	{
		fs.writeFile(path, module.exports.JSONStringify(obj), (err) =>
		{
			if (err)
			{
				module.exports.log("error", true, {path: path, obj: obj, err: err});

				if (typeof cb === "function") return cb(err);
				else return reject(err);
			}

			if (typeof cb === "function") cb();
			else resolve();
		});
	});
};

module.exports.getDirFilenames = function(path, extensionFilter, cb)
{
	var filenames = [];

	return new Promise((resolve, reject) =>
	{
		if (fs.existsSync(path) === false)
		{
			let err = "This directory was not found on the server.";

			if (typeof cb === "function") return cb(err);
			else return reject(err);
		}

		fs.readdir(path, "utf8", (err, files) =>
		{
			if (err)
			{
				module.exports.log("error", true, {path: path, extensionFilter: extensionFilter, err: err});

				if (typeof cb === "function") return cb(err);
				else return reject(err);
			}

			for (var i = 0; i < files.length; i++)
			{
				if (extensionFilter == null)
				{
					filenames.push(files[i]);
				}

				else if (files[i].slice(files[i].lastIndexOf(".")).toLowerCase() === extensionFilter.toLowerCase())
				{
					filenames.push(files[i]);
				}
			}

			if (typeof cb === "function") cb(null, filenames);
			else reject(null, filenames);
		});
	});
};

module.exports.readDirContent = function(path, extensionFilter, cb)
{
	var data = {};

	return new Promise((resolve, reject) =>
	{
		if (fs.existsSync(path) === false)
		{
			let err = "This directory was not found on the server.";

			if (typeof cb === "function") return cb(err);
			else return reject(err);
		}

		fs.readdir(path, "utf8", function(err, files)
		{
			if (err)
			{
				module.exports.log("error", true, {path: path, extensionFilter: extensionFilter, err: err});

				if (typeof cb === "function") return cb(err);
				else return reject(err);
			}

			for (var i = 0; i < files.length; i++)
			{
				if (extensionFilter == null)
				{
					data[files[i]] = fs.readFileSync(path + "/" + files[i], "utf8");
				}

				else if (files[i].slice(files[i].lastIndexOf(".")).toLowerCase() === extensionFilter.toLowerCase())
				{
					data[files[i]] = fs.readFileSync(path + "/" + files[i], "utf8");
				}
			}

			if (typeof cb === "function") cb(null, data);
			else reject(null, data);
		});
	});
};

module.exports.log = function(tags, trace, ...inputs)
{
	var msg = module.exports.timestamp() + "\n";

	if (Array.isArray(tags) === false)
	{
		tags = [tags];
	}

	//no trace argument was provided
	if (typeof trace !== "boolean")
	{
		if (Array.isArray(trace) === false)
		{
			trace = [trace];
		}

		inputs = trace.concat(inputs);
	}

	inputs.forEach(function(input)
	{
		if (typeof input === "string")
		{
			//add tab characters to each line so that they are all indented relative to the timestamp
			input.split("\n").forEach(function(line)
			{
				msg += `\t${line}\n`;
			});
		}

		else
		{
			msg += `\t${module.exports.JSONStringify(input)}\n`;
		}
	});

	console.log(`${msg}\n`);

	if (trace === true)
	{
		console.log("\n\n");
		console.trace();
		console.log("\n\n");
	}

	tags.forEachAsync(function(tag, index, next)
	{
		if (typeof tag !== "string")
		{
			next();
			return;
		}

		fs.appendFile(`${config.pathToLogs}/${tag}.txt`, `${msg}\r\n\n`, function (err)
		{
			if (err)
			{
				console.log(err);
			}

			next();
		});
	});
};

module.exports.timestamp = function()
{
	var now = new Date();
	var hours = now.getHours();
	var minutes = now.getMinutes();
	var seconds = now.getSeconds();
	var ms = now.getMilliseconds();

	if (hours < 10)
	{
		hours = `0${hours}`;
	}

	if (minutes < 10)
	{
		minutes = `0${minutes}`;
	}

	if (seconds < 10)
	{
		seconds = `0${seconds}`;
	}

	if (ms < 10)
	{
		ms = `00${ms}`;
	}

	else if (ms < 100)
	{
		ms = `0${ms}`;
	}

	return `${hours}:${minutes}:${seconds}:${ms}, ${now.toDateString()}`;
};

module.exports.throwAndLogError = function(input)
{
	module.exports.log(input);
	throw input;
};

module.exports.logMemberJoin = function(username, inviteUsed, inviter)
{
	var d = new Date().toString().replace(" (W. Europe Standard Time)", "");
	d = d.replace(" (Central European Standard Time)", "");
	var str = `${username} joined the Guild using the invite ${inviteUsed}, which was created by ${inviter}.`;

	fs.appendFile("memberJoin.log", d + "\r\n\n-- " + str + "\r\n\n", function (err)
	{
		if (err)
		{
			module.exports.log("error", true, {username: username, inviteUsed: inviteUsed, inviter: inviter, err: err});
		}
	});
};

//Stringify that prevents circular references taken from https://antony.fyi/pretty-printing-javascript-objects-as-json/
module.exports.JSONStringify = function(object, spacing = 2)
{
	var cache = [];

	//custom replacer function gets around the circular reference errors by discarding them
	var str = JSON.stringify(object, function(key, value)
	{
		if (typeof value === "object" && value != null)
		{
			//value already found before, discard it
			if (cache.indexOf(value) !== -1)
			{
				return;
			}

			//not found before, store this value for reference
			cache.push(value);
		}

		return value;

	}, spacing);

	//enable garbage collection
	cache = null;
	return str;
};

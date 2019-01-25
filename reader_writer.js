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
		module.exports.logError({source: source, target: target}, `An Error occurred with copyFileSync:`, err);
		throw err;
	}
};

module.exports.copyFile = function(source, target, cb)
{
	module.exports.checkAndCreateDir(target);

	fs.readFile(source, function(err, buffer)
	{
		if (err)
		{
			module.exports.logError({source: source, target: target}, `readFile Error:`, err);
			cb(err);
			return;
		}

		fs.writeFile(target, buffer, function(err)
		{
			if (err)
			{
				module.exports.logError({source: source, target: target}, `writeFile Error:`, err);
				cb(err);
			}

			else cb(null);
		});
	});
};

module.exports.copyDir = function(source, target, deepCopy, extensionFilter, cb)
{
	let filenames = fs.readdirSync(source);

	filenames.forEachAsync(function(name, index, next)
	{
		//if there's a directory inside our directory and no extension filter, copy its contents too
		if (deepCopy === true && fs.lstatSync(`${source}/${name}`).isDirectory() === true)
		{
			module.exports.copyDir(`${source}/${name}`, `${target}/${name}`, deepCopy, extensionFilter, function(err)
			{
				if (err)
				{
					module.exports.logError({source: source, target: target, deepCopy: deepCopy, extensionFilter: extensionFilter}, `copyDir Error:`, err);
					cb(err);
				}

				else next();
			});
		}

		//run code if no extension filter was designated or if there was one and the file extension is included
		//or if there is an extension filter that includes empty extensions "" (files without extensions)
		else if (Array.isArray(extensionFilter) === false ||
						 (Array.isArray(extensionFilter) === true && extensionFilter.includes(name.slice(name.lastIndexOf(".")).toLowerCase()) === true) ||
						 (Array.isArray(extensionFilter) === true && extensionFilter.includes("") === true) && name.includes(".") === false)
		{

			module.exports.copyFile(`${source}/${name}`, `${target}/${name}`, function(err)
			{
				if (err)
				{
					cb(err);
				}

				else next();
			});
		}

		//ignore file
		else next();

	}, cb);
};

//If a directory does not exist, this will create it
module.exports.checkAndCreateDir = function(filepath)
{
	var splitPath = filepath.split("/");
	var compoundPath = splitPath.shift();

	//It's length >= 1 because we don't want the last element of the path, which will be a file, not a directory
	while (splitPath.length != null && splitPath.length >= 1)
	{
		if (fs.existsSync(compoundPath) === false)
	  {
	    fs.mkdirSync(compoundPath);
	  }

		compoundPath += "/" + splitPath.shift();
	}
};

module.exports.getFilenames = function(path, extensionFilter = null)
{
	var filenames = [];

	if (fs.existsSync(path) === false)
	{
		throw new Error("This directory was not found on the server.");
	}

	fs.readdir(path, "utf8", (err, files) =>
	{
		if (err)
		{
			module.exports.logError({path: path, extensionFilter: extensionFilter}, `readdir Error:`, err);
			throw err;
		}

		for (var i = 0; i < files.length; i++)
		{
			if (extensionFilter != null && files[i].slice(files[i].lastIndexOf(".")).toLowerCase() === extensionFilter.toLowerCase())
			{
				filenames.push(files[i]);
			}

			else filenames.push(files[i]);
		}

		return filenames;
	});
};

module.exports.readDirectoryFiles = function(path, extensionFilter = null, cb)
{
	var data = {};

	if (fs.existsSync(path) === false)
	{
		cb("This directory was not found on the server.", null);
		return
	}

	fs.readdir(path, "utf8", (err, files) =>
	{
		if (err)
		{
			module.exports.logError({path: path, extensionFilter: extensionFilter}, `readdir Error:`, err);
			cb(err, null);
		}

		for (var i = 0; i < files.length; i++)
		{
			if (extensionFilter != null && files[i].slice(files[i].lastIndexOf(".")).toLowerCase() === extensionFilter.toLowerCase())
			{
				data[files[i]] = fs.readFileSync(path + "/" + files[i], "utf8");
			}

			else data[files[i]] = fs.readFileSync(path + "/" + files[i], "utf8");
		}

		cb(null, data);
	});
};

module.exports.readJSON = function(path, reviver, callback)
{
	var obj = {};

	fs.readFile(path, "utf8", (err, data) =>
 	{
		if (err)
		{
			module.exports.logError({path: path, reviver: extensionFilter, callback: callback}, `readFile Error:`, err);
			callback(`There was an error while trying to read the JSON file ${path}:\n\n${err}`, null);
			return;
		}

		if (/[\w\d]/.test(data) === false)
		{
			callback(`No data in ${path}.`, null);
			return;
		}

		if (reviver == null)
		{
			obj = JSON.parse(data);
		}

		else
		{
			obj = JSON.parse(data, reviver);
		}

		callback(null, obj);
	});
};

module.exports.saveJSON = function(path, obj, cb)
{
	fs.writeFile(path, JSONStringify(obj), (err) =>
	{
		if (err)
		{
			module.exports.logError({path: path, obj: obj}, `writeFile Error:`, err);
			cb(err);
			return;
		}

		cb(null);
	});
};

module.exports.writeToGeneralLog = function(...inputs)
{
	module.exports.log(config.generalLogPath, ...inputs);
};

module.exports.writeToUploadLog = function(...inputs)
{
	module.exports.log(config.uploadLogPath, ...inputs);
};

module.exports.writeToHostLog = function(...inputs)
{
	module.exports.log(config.hostLogPath, ...inputs);
};

module.exports.log = function(paths, ...inputs)
{
	var msg = module.exports.timestamp() + "\n";

	if (Array.isArray(paths) === false)
	{
		if (paths == null)
		{
			paths = [];
		}

		else if (typeof paths === "string")
		{
			paths = [paths];
		}

		else console.log(`Cannot log ${inputs}: paths is not an array nor a string.`);
	}

	paths.push(config.generalLogPath);

	if (typeof options )

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

		else msg += `\t${JSONStringify(input)}\n`;
	});

	console.log(`${msg}\n`);

	paths.forEachAsync(function(path, index, next)
	{
		fs.appendFile(path, `${msg}\r\n\n`, function (err)
		{
			if (err)
			{
				console.log(err);
				next();
				return;
			}

			next();
		});

	});
};

module.exports.logError = function(values, ...inputs)
{
	var errMsg = `${module.exports.timestamp()}\n`;

	if (typeof values === "object")
	{
		errMsg += `Values: \n\t${JSONStringify(values)}\n\n`;
	}

	//assume first parameter is just more inputs instead of values to print
	else inputs.unshift(values);

	inputs.forEach(function(input)
	{
		if (typeof input === "string")
		{
			//add tab characters to each line so that they are all indented relative to the timestamp
			input.split("\n").forEach(function(line)
			{
				errMsg += `\t${line}\n`;
			});
		}

		else errMsg += `\t${JSONStringify(input)}\n`;
	});

	console.log(`${errMsg}\n`);
	console.trace();
	console.log("\n");

	[config.errorLogPath, config.generalLogPath].forEachAsync(function(path, index, next)
	{
		fs.appendFile(path, `${errMsg}\r\n\n`, function (err)
		{
			if (err)
			{
				console.log(err);
				next();
				return;
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

	return `${hours}:${minutes}:${seconds}, ${now.toDateString()}`;
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
	var str = username + " joined the Guild using the invite " + inviteUsed + ", which was created by " + inviter + ".";

	fs.appendFile("memberJoin.log", d + "\r\n\n-- " + str + "\r\n\n", function (err)
	{
		if (err)
		{
			module.exports.log(`Module: ${module.filename}\nCaller: module.exports.logMemberJoin()\nFunction: fs.appendFile()\nFile: memberJoin.log\n`, err);
		}
	});
};

//Stringify that prevents circular references taken from https://antony.fyi/pretty-printing-javascript-objects-as-json/
function JSONStringify(object, spacing = 2)
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
}

/*************************
*		AUXILIARY FUNCTIONS		*
**************************/

//find the total times that a check passes. An example use would be to
//find the total number of online games in a game list, as such:
//games.total( function(game) {return game.isOnline;});
Object.total = function(testFn)
{
  var total = 0;

  for (var key in this)
  {
    if (testFn(this[key]) === true)
    {
      total++;
    }
  }

  return total;
}

//Refer to https://blog.lavrton.com/javascript-loops-how-to-handle-async-await-6252dd3c795
//the modern for, of loop allows to process an array with asynchronous functions within it,
//such as data requests to every server available, and callback when they are all finished
//The function applied to every array item *must* be defined as async function!
Array.prototype.asyncLoop = async function(asyncFn, callback)
{
	for (const item of this)
	{
    //do asynchronous stuff on this particular item and await its result
		await asyncFn(item);
	}

	//all items asynchronously processed, do the final callback!
	callback();
};

Array.prototype.forEachAsync = function(asyncFn, callback)
{
  var index = 0;

  //the context of 'this' will change in the loop
  var array = this;

  (function loop()
  {
    if (index >= array.length)
    {
      if (callback != null)
      {
        callback();
      }

      return;
    }

    asyncFn(array[index], index++, function()
    {
      loop();
    });
  })();
};

//Displays the items in an array of strings as a list, with each item
//separated by a linebreak and an identical total width
Array.prototype.listStrings = function(width)
{
	var list = "";

	this.forEach(function(string)
	{
		list += string.width(width) + "\n";
	});

	return this;
};

//Displays the items in an array of strings as a numbered list, with each item
//separated by a linebreak and an identical total width
Array.prototype.numberedList = function(width, postIndexChar = ".")
{
	var list = "";

	this.forEach(function(string, index)
	{
		list += index + postIndexChar + " " + string.width(width) + "\n";
	});

	return list;
};

Number.isFloat = function(n)
{
	return Number(n) === n && n % 1 !== 0;
};

//Sets a limit for a number; if it would go above it,
//it sets it at the limit
Number.prototype.cap = function(limit)
{
	if (this > limit)
	{
		return limit;
	}

	else return this;
};

//Sets a lower limit for a number; if it would go below it,
//it sets it at the limit
Number.prototype.lowerCap = function(limit)
{
	if (this < limit)
	{
		return limit;
	}

	else return this;
};

String.prototype.capitalize = function()
{
	return this.charAt(0).toUpperCase() + this.slice(1);
};

//Spaces out evenly an item. If the width is set to 50, the entire string
//will have 50 characters, as long as the item is less than 50.
String.prototype.width = function (space, spaceFirst = false, spacingChar = " ")
{
	var arrL = space - this.length + 1;

	if (arrL < 1)	arrL = 1;

	if (spaceFirst) return Array(arrL).join(spacingChar) + this;
	else 						return this + Array(arrL).join(spacingChar);
};

//``` ``` is the markup that Discord uses to send messages as a code box,
//this is just a short-hand way of doing that
String.prototype.toBox = function()
{
	if (this !== "" && this != null && this.length && /\S+/.test(this))
	{
		return "```" + this + "```";
	}

	else return this;
};

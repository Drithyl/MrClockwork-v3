# Mr. Clockwork

This repository is OBSOLETE. It is kept here for archiving purposes. The newest, updated version can be found here: https://github.com/Drithyl/MrClockwork-v4

A bot that allows users to host multiplayer instances of the grand strategy turn-based games Dominions 4 and 5, with added features built on top of it for convenience, like turn reminders, turn announcements, turn backups, etc. 
The latest iteration of it, v3, has been scaled up to service multiple Discord guilds, as well as the ability to host across multiple servers, rather than just the one on which it is running. This has been achieved by decoupling
the code related to Discord itself, and the code related to the games themselves. The latter is part of a node application that each slave server (i.e. the server on which a game is hosted) must run to function: https://github.com/Drithyl/Hosting-slave 

Technologies used include Node, Express, Socket.io, Discord.js and Google Drive’s REST API (which allows users to upload their own mods and maps to each slave server).

TO-DO list:

- Add preferences for game organizers to set up automated unrequested extensions, with the
option to make them per player.

- Alter the %pretenders command to be less spammy, without needing to re-use it for every
interaction.

- Make it so it's possible to skip most of the settings that are not usually changed, like
gold percentage and such.

- Add more logging.

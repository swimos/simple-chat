# Swim Simple Chat Example
This example aims to show the basics of how a chat application could be build using Swim at its core. In the spirit of simplicity, this example will not cover issues like authentication or compressive user state tracking and instead takes the simplest approach possible but just using the users local IP to handle it. Within the Swim server we have single Swim Plane called ChatPlane and that manages the routing for two WebAgents. In a real world scenario you would have additional routes and agents to handle things like authentication, user data, etc. but for this example we are keeping it as minimal as possible while still be useful.

The first WebAgent is called *Rooms* and is responsible for managing the list of rooms available on the server. A server will only have one instance of a Rooms WebAgent and on server startup that WeBAgent will automatically create the default public room which all users first start out in.

The second WebAgent is called just *Room*. This agent manages the list of chat messages as well as the list of users currently in that particular room. The Room WebAgent is dynamically created for each room created on the server so any one server can have many Room Agents. Likewise, when a room is removed it's agent is also destroyed. For more specific information about the server and its agents see the README found in the /server folder of this project. The codebase itself is thoroughly commented and does its best to describe all the important methods and variables used in the code.

In this example we are also using Swim as our http server and the UI is done using vanilla Javascript, HTML and CSS. In the real world you would more then likely have a separate HTTP server and be using React, Vue, Angular, etc to drive the UI. This is quite simple to do and mostly just requires a configuration change in your swim resource file to turn off the http server in swim. The main JS file which drives the UI is chat.js and is found in /ui/assets/js/chat/.js. More information about how the UI works can be found in the README under /ui and in the comments of chat.js.

## Setup, Build, and Run:

You need java9+ to run the application and these instructions only cover running in a unix like environment. Gradle is not required as the project provides a gradle wrapper to use instead.

1. `git clone https://github.com/swimos/simple-chat.git`

2. `cd swim-chat/server`

3. `./gradlew run`

4. Navigate to `http://127.0.0.1:9001` and you should see the chat application and be defaulted to the 'public' room


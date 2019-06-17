# Swim-Chat Server

### Prerequisites

- [Java](https://www.java.com/en/download/help/download_options.xml) 9+
- [Gradle](https://gradle.org/install/) 5+

### Compile and Run

- `gradle run`: builds and executes a SWIM server loaded with our chat application's logic
- hostUri: `swim://localhost:9001`

## Server high level structure overview

This example is not an exhaustive example of how to implement a full featured chat application. Instead this example aims to demonstrate several common patterns used to build applications based upon the Swim Platform and how Swim makes building something like a chat application fairly simple. On a high level this example is just a single Swim Plane which creates two routes to be used by Swim clients to drive a chat UI. The two routes each have a specific WebAgent which handles the calls to that route. The goal of this document is to provide detailed information as to how the two WebAgents work and in some places communicate with each other. For more information about how the UI interfaces with these WebAgents see the README found in the /ui folder of this project.

## `Rooms` WebAgent

The first route inside of the Chat Plane exposes the `Rooms` WebAgent with the url of just '/rooms'. This WebAgent is created automatically on server startup and the routing ensures there this WebAgent acts as a singleton on the server. All users will connect to the `list` lane inside the `Rooms` agent when the UI loads in order to get the list of room available on the server. 

The Rooms WebAgent itself has a single MapLane which holds the room list data. In this example we are using a timestamp as the unique key for each room. This ensures the rooms list in the ui will always be shorted by oldest room first. The unique key for each room can be anything, we just use timestamp for simplicity. The value for each room entry is a URI value. This URI is what gets used by the clients to link to the room data inside the RoomAgent. Without this URL the client would not know the address of the room lane on the server to get the room date from.

In order for a swim client to be able to update the list of available rooms inside the `Rooms` WebAgent the agent provides two commands lanes which allow the client to add and remove rooms from the list. The `addRoom` command lanes expects a string value to be passed into it. We use a string instead of a URI value because in tis example we know the new value is coming from javascript and assuming string values make communication easier. In the real world you would want to have some data validation and error checking before creating the room, but for simplicity we are skipping that here. The `removeRoom` command lane expects the timestamp we are using as a unique key for the room. No other values are needed for remove. Any client linked to the list lane will get updated automatically by Swim when the data inside the lane changes.

## `Room` WebAgent

The second route defined in the ChatPlane is for the `Room` WebAgent and sets it up so that each room gets it own Room agent that is dynamically is created the first time a user accesses the room. The route for these webagents is '/room/:id' which sets it up so that each unique [id] is a room and room agent. Swim clients will use that URL when connecting to the server to get both message and user data about that specific room. Most all the important data to drive the Chat UI lives in the various lanes of the Room WebAgent. Below is a detailed description of what the lanes do.

### Users and UserCount Lanes
Inside the `Room` WebAgent we have 2 lanes for storing data about the users in that room. The first lanes is a simple `ValueLane` to hold the total number of users currently in the room. Likewise the 'users' lane is a `MapLane` used to hold the userID of each user. Again we use a timestamp for the unique keys in the map. This ensures the users link is sorted by oldest first. The users and userCount lanes do not provide a way for the client to change the values in those lanes. Instead both lanes are automatically updated when a client links or unlinks to the messageList lane.

## MessageList lane
The messageList lane is probably the most important lane in the app. This lane stores the actual chat message list for the room. Like the other lanes, this lane uses a timestamp of when the messages was sent as the unique key in the mapLane so messages always appear oldest first. Along with holding chat messages, this lane also provides a couple of automated actions based on how clients interact with the lane which we use for tracking the user's presence.

First we have a listener for when the chat message list changes. In the callback hanlder for this listener we call `purgeOldMessages` which will go over all the chat messages and remove anything older then the threshold defined by `THRESHOLD_MILLIS`. Normally this would be on a timer of some sort but for simplicity we just purge when the list changes.

Next is a important bit of code. We setup a `didLink` listener on the messageList lane. This will get called when a client first links to the lane and the user's uplink is passed into the callback handler. Inside that callback handler we use the uplink value to get the IP of the client which created the link. For simplicity we are going to use this IP as the username of the user who created the link. 

From there we create a listener on that new uplink which listens for when the link itself changes. Then we add callback handler for when the link and unlink actually happen. Inside each of those callbacks we do four things. First we create a timestamp to be used next. With the timestamp and the userId we create a new 'system' message in the room notifying that the user entered or left the room. Next we and or remove the user from the `users` map lane and then finally we update the `userCount` value lane. With this setup we basically have all of our user tracking.

Chat messages themselves are stored as strings in the map lane. These strings store a simple JSON object in string form. The values inside the JSON object are only used by the UI and so are also defined by the UI. This makes adding or changing the chat messages data in the UI trivial since it would not require any server changes. Currently the chat message JSON just contains the userId of the sender and the message content.

## PostMessage lane

This is a command lane used by clients as well as the swim server to add new messages to the chat room. The command taks a string and its expect that string is a JSON object in string form which holds all the data the UI wants in order to render the message on the page. Every new messages is added by current timestamp to ensure proper order in the UI. The actions in messageList lane described above will call this command to add new system messages. This command is the only way to add messages and this example does not surface the ability to delete or edit messages but they could be added without too much work.

## WillStop Override
This public override method gets called when stop() is called on the room. This method sends a command to the `Rooms` Webagent telling that agent to remove this room from the rooms list based on the URI of the room.

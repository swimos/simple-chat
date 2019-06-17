/**
 * Simple javascript class to handle updating the UI for the Simple Swim Chat Example
 */
class ChatClass {

    /**
     * class constructor
     */
    constructor() {
       
        this.swimUrl = `warp://${window.location.host}`;

        this.currentUserName = 'anonymous'; // for simplicity the username is just their IP
        this.activeRoomName = 'public'      // name of room user will start in.
        this.activeRoomUri = '/room/public' // url to use to get room info from swim

        // rooms list member vars
        this.roomListNodeRef = null;    // swim node used to connect to the list of rooms in the Rooms WebAgent
        this.roomListLink = null;       // swim downlink used to get room list data
        this.roomListElement = null;    // dom element to hold room list in UI
        this.roomsList = [];            // array to hold room list data

        // room member vars
        this.roomNodeRef = null;        // swim node used to connect to the Room WebAgent
        this.messageListLink = null;    // swim downlink used to get chat messages for the room
        this.messageListElement = null; // DOM element in UI to hold chat message list
        this.messageInputElement = null;// DOM element used for message input in UI
        this.messageList = [];

        // member vars for tracking users. These reuse this.roomNodeRef to talk to Room WebAgent
        this.userListLink = null;       // swim link to get user list for room
        this.userListElement = null;    // DOM element to hold user list in UI
        this.userList = [];             // array to holder user data

    }

    /**
     * called to start chat UI on page
     */
    start() {
        // grab and clear room list element
        this.roomListElement = document.getElementById('roomsList');
        this.roomListElement.innerHTML = "";

        // grab and clear message list element
        this.messageListElement = document.getElementById('messageList');
        this.messageListElement.innerHTML = "";

        // grab and clear user list element
        this.userListElement = document.getElementById('userList');
        this.userListElement.innerHTML = "";

        // grab message input and add event listener for when user hits enter
        this.messageInputElement = document.getElementById('messageInput');
        this.messageInputElement.onkeyup = (keyEvent) => {
            if(keyEvent.keyCode === 13) {
                this.postMessage(); // send message when user hits enter
            }
        };

        // add event listener for message send button
        document.getElementById('sendButton').onmouseup = () => {
            this.postMessage()
        }

        // get the users IP to be used for username
        getUserIP((ip) => {
            // alert("Got IP! :" + ip);
            this.currentUserName = ip;
            document.getElementById('userName').innerText = ip;
        });        

        // create swim node to talk to Rooms WebAgent on server
        this.roomListNodeRef = swim.nodeRef(this.swimUrl, '/rooms');

        // create map downlink to get the list of room on the server
        this.roomListLink = this.roomListNodeRef.downlinkMap().laneUri('list')
            // when the list is updated
            .didUpdate((key, newValue) => {
                // add the new room to our roomList array
                this.roomsList[key.value.toString()] = newValue.value;
                // re-render room list in UI
                this.renderRoomList(); 

            // when a room is removed
            }).didRemove((removeKey)=> {
                let newArr = [];
                // create new array without the key to be removed
                for(const key in listItems) {
                    if(key !== removeKey.value.toString()) {
                        newArr[key] = listItems[key];
                    }
                }
                // set rooms array 
                this.roomsList = newArr;
                // re-render room list in UI
                this.renderRoomList();
            })
            // open the link to get rooms list data
            .open();          

        // set the active room to the default public room on the server
        this.setActiveRoom('public');

        // set cursor focus on the input field
        this.messageInputElement.focus();
    }

    // Method to stop chat on the page
    // close the link to the room WebAgent
    // this will be called by the page onBeforeUnload
    // and helps us with user tracking in chat rooms
    stop() {
        this.roomNodeRef.close();
    }

    /**
     * Add room handler. Posts a swim command on the roomList webAgent
     *  with the name of the room which the user enters in the Prompt dialog
     */
    addRoom() {
        let newRoomName = prompt("Enter a room name");
        newRoomName = newRoomName.replace(/ /g,'');
        this.roomListNodeRef.command('addRoom', `/room/${newRoomName}`);
    }

    /**
     * method used to set the active chat room.
     * Called on start and when user selects a room in the UI
     * @param {*} roomName 
     */
    setActiveRoom(roomName) {

        // set active room name and url
        this.activeRoomName = roomName;
        this.activeRoomUri = `/room/${roomName}`;
        
        // update room list in UI
        this.renderRoomList();

        // if user is already connect, close that connection first
        if(this.roomNodeRef !== null) {
            this.roomNodeRef.close();
            this.roomNodeRef = null;
        }

        // clear message list array so we don't end up with messages from the wrong room
        this.messageList = [];

        // create swim node to WebAgent for active room
        this.roomNodeRef = swim.nodeRef(this.swimUrl, this.activeRoomUri)

        // create map downlink to the message list
        this.messageListLink = this.roomNodeRef.downlinkMap().laneUri('messageList')
            // when the message list changes
            .didUpdate((key, newValue) => {
                // make sure there is a message value
                if(newValue.value) {
                    // add new message to messageList array
                    this.messageList[key.value] = JSON.parse(newValue.value);

                    // update room list in UI
                    this.renderMessageList();
                }

            // when a message gets removed
            }).didRemove((removeKey)=> {
                // create a new array without the removed message
                let newArr = [];
                for(const key in this.messageList) {
                    if(key !== removeKey.value.toString()) {
                        newArr[key] = this.messageList[key];
                    }
                }
                // set message list to new filtered array
                this.messageList = newArr;

                // update room list in UI
                this.renderMessageList();
            }).willSync(() => {
                // clear message list with server says we are about to sync message data
                this.messageList = [];
            }).willUnlink(() => {
                // in case of timeout or other disconnect call stop to remove user
                this.stop();
            })
            // open link
            .open();   

        // use the room node to create a new map downlink to the user list for the room
        this.userListLink = this.roomNodeRef.downlinkMap().laneUri('users')
            // when a user is added to the user list
            .didUpdate((key, newValue) => {
                // add new user to userList array
                this.userList[key.value] = key.value;

                // render user list in UI
                this.renderUserList();

            // when a room is removed from the list
            }).didRemove((removeKey)=> {
                let newArr = [];
                // if there are users
                if(this.userList.length > 0) {
                    // create a new array without removed user
                    for(const key in this.userList) {
                        if(key !== removeKey.value.toString()) {
                            newArr[key] = this.userList[key];
                        }
                    }
                    // update userList array with filtered array
                    this.userList = newArr;
                } else {
                    // if there are no users, clear userList array
                    this.userList = [];
                }
                
                // render user list in UI
                this.renderUserList();

            }).willSync(() => {
                 // in case of timeout or other disconnect clear userList array
                this.userList = [];
            })
            // open link
            .open();   

        
    }

    /**
     * Method used to render the list of room into the UI
     */
    renderRoomList() {
        // clear room list element
        this.roomListElement.innerHTML = "";

        // for each room ID in roomsList array
        for(const roomId in this.roomsList) {
            // get room name from array
            const roomName = this.roomsList[roomId].replace('/room/','');

            // create LI element to hold room name in the list
            const newListItem = document.createElement("li");

            // set text of LI to room name
            newListItem.innerText = roomName;

            //if current room is also the active room, add .active css class
            if(this.activeRoomName === roomName) {
                newListItem.className = "active";
            } else {
                newListItem.className = "";
            }

            // add event listener for selecting a room in the list
            newListItem.onmouseup = () => {
                console.info('select room', roomName)
                this.setActiveRoom(roomName);
            }

            // append new LI to room list element
            this.roomListElement.appendChild(newListItem);
            
            // create swim node to WebAgent for current room
            const tempNodeRef = swim.nodeRef(this.swimUrl, `/room/${roomName}`);

            // create a value downlink to userCount lane of room webAgent
            tempNodeRef.downlinkValue().laneUri('userCount')
                // when user count changes
                .didSet((newValue) => {
                    // update the room count value shown next to room name in UI
                    if(newValue.value) {
                        newListItem.innerText = `${roomName} (${newValue.value})`;
                    } else {
                        newListItem.innerText = `${roomName} (0)`;
                    }
                    
                })
                // open link
                .open();               
        }
    }

    /**
     * method used to post new message to chat
     * uses command lane on the room node to post the message
     */
    postMessage() {
        // create object to hold message data
        const newMsg = {
            userId: this.currentUserName,
            msg: this.messageInputElement.value
        };

        // convert newMsg to JSON string and send it with the postMessage command
        this.roomNodeRef.command('postMessage', JSON.stringify(newMsg));

        // reset message input field and set focus
        this.messageInputElement.value = '';
        this.messageInputElement.focus();
    }

    /**
     * method to render the chat message list
     * based on the data in this.roomsList
     */
    renderMessageList() {
        // clean message list element of any existing messages
        this.messageListElement.innerHTML = "";
        // for each message in messageList array
        for(const messageKey in this.messageList) {
            // get current message
            const currMessage = this.messageList[messageKey];
            // call prependMessage to render new message into UI
            this.prependMessage(currMessage.userId, currMessage.msg, currMessage.userId === this.currentUserName);
        }
    }

    /**
     * method to render list of users in room
     * based on data in this.userList
     */
    renderUserList() {
        // clear user list element
        this.userListElement.innerHTML = "";

        // for each user in userList
        for(const userKey in this.userList) {
            // get current user
            const currUser = this.userList[userKey];
            // create LI element for user
            const userDiv = document.createElement("li");
            // user LI text to user name
            userDiv.innerText = currUser
            // append LI to user list element
            this.userListElement.appendChild(userDiv);
        }
    }    

    /**
     * Method used to render an individual message in the chat message list
     * @param {*} initial - initials of user. in this example its the last 3 digits of their IP
     * @param {*} message - chat message itself
     * @param {*} isUser - if the message is from current user
     */
    prependMessage(initial, message, isUser) {
        // create an LI element to hold the message
        const liElement = document.createElement('li');

        // if current message is sent by current user, 
        // add CSS class to format message properly
        if (isUser) {
            liElement.classList.add('reverse')
        }

        // initial == 0 means this is a system message
        // system messages do not get the circle icon
        if(initial != 0) {
            // create element for circle icon
            const icon = document.createElement('div');
            icon.classList.add('icon')
            
            // create span for user initials and append it to the icon
            const name = document.createElement('span');
            name.classList.add('circle');
            name.innerText = initial.substr(initial.length-3, initial.length);
            icon.append(name);

            // append icon to li element
            liElement.append(icon);
        }

        // create DIV element to hold chat message
        const content = document.createElement('div');

        // make sure we format for system vs user messages
        if(initial != 0) {
            content.classList.add('content');
        } else {
            content.classList.add('system');
        }

        // update div with chat message content
        content.innerText = message;

        // append content div to LI element
        liElement.append(content);

        // append new LI element to chat message list element
        this.messageListElement.prepend(liElement);
    }
}

/**
 * Get the user IP through the webkitRTCPeerConnection
 * @param onNewIP {Function} listener function to expose the IP locally
 * @return undefined
 */
function getUserIP(onNewIP) { //  onNewIp - your listener function for new IPs
    //compatibility for firefox and chrome
    var myPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
    var pc = new myPeerConnection({
        iceServers: []
    }),
    noop = function() {},
    localIPs = {},
    ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3}|[a-f0-9]{1,4}(:[a-f0-9]{1,4}){7})/g,
    key;

    function iterateIP(ip) {
        if (!localIPs[ip]) onNewIP(ip);
        localIPs[ip] = true;
    }

     //create a bogus data channel
    pc.createDataChannel("");

    // create offer and set local description
    pc.createOffer().then(function(sdp) {
        sdp.sdp.split('\n').forEach(function(line) {
            if (line.indexOf('candidate') < 0) return;
            line.match(ipRegex).forEach(iterateIP);
        });
        
        pc.setLocalDescription(sdp, noop, noop);
    }).catch(function(reason) {
        // An error occurred, so handle the failure to connect
    });

    //listen for candidate events
    pc.onicecandidate = function(ice) {
        if (!ice || !ice.candidate || !ice.candidate.candidate || !ice.candidate.candidate.match(ipRegex)) return;
        ice.candidate.candidate.match(ipRegex).forEach(iterateIP);
    };
}

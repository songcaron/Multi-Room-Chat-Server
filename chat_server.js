// Require the packages we will use:
var http = require("http"),
	socketio = require("socket.io"),
	fs = require("fs");
 
// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html:
var app = http.createServer(function(req, resp){
	// This callback runs when a new connection is made to our HTTP server.
 
	fs.readFile("publicclient.html", function(err, data){
		// This callback runs when the client.html file has been read from the filesystem.
 
		if(err) return resp.writeHead(500);
		resp.writeHead(200);
		resp.end(data);
	});
});
app.listen(3456);
 
users = {};
chatRooms = [{name:'main',password: ''}]; //main chatroom will always be there

// Do the Socket.IO magic:
var io = socketio.listen(app);

// This callback runs when a new Socket.IO connection is established.
io.sockets.on("connection", function(socket){
		
	//callback when user successfully enters username
	socket.on('login', function(data) {
		
		var userInfo = {};
		//**CHECK** now that I've changed users to dictionary so cant tell of duplicates
		//if(!inDictionary(data.username,users)) {
			
			//userInfo[socket.id] = data.username; //add name to dictionary
			users[socket.id] = data.username;	
						
			//console.log("Users Logged In: "+Object.keys(users));
			
			//default room when first signing in
			joinInitialRoom(socket);
		
			//reveals list of current rooms available to user
			console.log(chatRooms);
			socket.emit('updateRooms',{rooms: chatRooms});
			
			socket.emit('loginSucess',{username: data.username,client_id:socket.id});
		//}
	});
	
	
	
	//when user disconnects 
	socket.on('disconnect',function(data) {
		leaveRoom(socket,data);
	});
	
	
	//when user sends a message 
	socket.on('message_to_server', function(data) {
		//console.log("I got here" + data.username+ ":"+ data.room);
		io.sockets.in(data.room).emit("message_to_client",{message:data["message"],username: data.username}) // broadcast the message to other users
	});
	
	
	//when user leaves chatroom 
	socket.on('leaveRoom',function(data) {
		leaveRoom(socket,data);
	});
	
	//when user joins chatroom
	socket.on('joinRoom',function(data) {
		joinRoom(socket,data);
	});
	
	//when want to temp ban someone 
	// socket.on('kickout',function(data)) {
		// var usersList = io.sockets.adapter.rooms[data.room];
	
		// var socketIds = Object.keys(usersList.sockets);

		// for(var count = 0;count<socketIds.length;count++) {
			// var name = socketIds[count];
			// if(name == data.target) {
				// socket.leave
			// }
		// }	
	// }
});

function joinRoom(socket,data) {
	//check if room already exits or if user added a new room
	var roomName = data.room; 
	var previousName = data.currentRoom;

	
	//remove self from previous room
	
	console.log(inArray(roomName,chatRooms));
	if(inArray(roomName,chatRooms)) {//room exists
		socket.join(data.room);
		//leaveRoom(socket,data.currentRoom);
		//io.sockets.in(previousName).emit('updateUsers',{users: usersInRoom(data.room)});
	}
	else {//room doesn't exist->create new room and add to array
		
		console.log("I got inside here");
		
		chatRooms.push({name: data.room,password:data.password}); //adds room to local array
		socket.join(data.room); //students joins new room that was created
		console.log(chatRooms);
		//leaveRoom(socket,data.currentRoom);
		//io.sockets.in(previousName).emit('updateUsers',{users: usersInRoom(data.room)});
	}
	//let other users know that new member has joined the chat room

	socket.emit('changeRoom',{room:data.room,password: data.password});
	socket.broadcast.to(data.room).emit('status', { user: socket.id, state: 'joined', room: data.room });
	io.sockets.in(data.room).emit('updateUsers',{users: usersInRoom(socket,data.room)});
}

function joinInitialRoom(socket) {
	socket.join('main');
	
	//let other users know that new member has joined the chat room
	socket.broadcast.to('main').emit('status', { user: socket.id, state: 'joined', room: 'main' });
	io.sockets.in('main').emit('updateUsers',{users: usersInRoom(socket,'main')});
	
	socket.emit('changeRoom',{room:'main',password: '' });
}
function usersInRoom(socket,room) {
	
	var usersList = io.sockets.adapter.rooms[room];
	console.log(usersList); //get names of people (not just id)
	
	var socketIds = Object.keys(usersList.sockets);
	//console.log(socketIds);
	var userInRoomList = [];

	//console.log("Users in current room: "+socketIds);
	//console.log("Number of people in current room: " + socketIds.length);
	for(var count = 0;count<socketIds.length;count++) {
		var name = socketIds[count];
		userInRoomList.push(users[name]);
	}

	return userInRoomList; 
}
 
function leaveRoom(socket,data) {
	//remove client from room 
	socket.leave(data.room);
	
	
	//let other users know that new member has left the chat room
	socket.broadcast.to(data.room).emit('status', { user: socket.id, state: 'left', room: data.room });
}

function inArray(item,array) {
	
	for(var i=0; i<array.length;i++) {
		if(array[i].name == item) {
			return true;
		}
	}
	return false;
}

//function to help with searching of item in array 
function inDictionary(item,array) {
	var values = [];

	//console.log("Array"+ array);
	
	for(var key in array) {
		//console.log(array[key]);
	}
	
	var value = values.indexOf(item);
	//console.log("Item: "+item);
	//console.log("Dictionary: "+value);
	
	if(value != -1) {
		return true;
	}
	else {
		return false; 
	}
}

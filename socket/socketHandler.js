const { Server } = require('socket.io');
const http = require('http');
const express = require('express');
const Message = require('../models/message');
const Conversation = require('../models/conversation');

const app = express()
const server = http.createServer(app)
const io = new Server(server, {
    cors: {
        origin: 'http://localhost:3000',
        methods: ['GET', 'POST'],
    }
})

const getRecipientSocketId = (recipientId) => {
	return userSocketMap[recipientId];
};



const userSocketMap = {}
io.on('connection', (socket) => {
  console.log("user connected", socket.id)  
  const userId = socket.handshake.query.userId
  console.log("UserId from frontend", userId)
  if(userId != "undefined") userSocketMap[userId] = socket.id
  console.log("User map", userSocketMap)
  io.emit("getOnlineUsers", userSocketMap)

  socket.on("markMessagesAsSeen", async ({ conversationId, userId }) => {
    try {
        await Message.update({ conversationId: conversationId, seen: false }, { $set: { seen: true } });
        await Conversation.updateOne({ _id: conversationId }, { $set: { "lastMessage.seen": true } });
        io.to(userSocketMap[userId]).emit("messagesSeen", { conversationId });
    } catch (error) {
        console.log(error);
    }
});

socket.on('typing', (data) => {
  const socketId = getRecipientSocketId(data.recipientId)
  
  socket.to(socketId).emit('typing', data);
});

socket.on('stopTyping', (data) => {
  const socketId = getRecipientSocketId(data.recipientId)
  
  socket.to(socketId).emit('stopTyping', data);
});

  socket.on('disconnect', () => {
    
   console.log("user disconnected", socket.id)  
   delete userSocketMap[userId] 
   io.emit("getOnlineUsers", Object.keys(userSocketMap))
  })
})

module.exports = {io, server, app, getRecipientSocketId}

// const Message = require('../models/message');
// const Conversation = require('../models/conversation');
// const User = require('../models/user');
// const { Op } = require('sequelize');
// const { getRecipientSocketId } = require('../socket/socketHandler');

// // Get chat messages for a room
// exports.getMessages = (req, res) => {
//   const conversationId = req.params.conversationId; // Use conversationId from the URL
//   const limit = parseInt(req.query.limit) || 50; // Limit the number of messages, default to 50

//   // Fetch messages based on the conversationId
//   Message.findAll({
//     where: { conversationId },
//     limit,
//     order: [['createdAt', 'ASC']], // Fetch messages in order of creation
//     include: [{
//       model: User,
//       as: 'sender',  // Assuming 'sender' is an alias for the User model
//       attributes: ['id', 'username', 'avatar'],
//     }],
//   })
//     .then(messages => {
//       if (messages.length === 0) {
//         return res.render('chat', {
//           noMessages: true,
//           message: "No chat history found. Start a new conversation!"
//         });
//       }
//       res.render('chat', {
//         noMessages: false,
//         title: 'Chat Dashboard',
//         messages: messages.reverse(), // Reverse to display the oldest messages first
//         user: req.session.user, // The logged-in user
//       });
//     })
//     .catch(error => {
//       console.error('Error fetching messages:', error);
//       res.status(500).json({ error: 'Failed to fetch messages' });
//     });
// };

// // Render chat page
// exports.renderChat = (req, res) => {
//   const userId = req.session.user.id;

//   Conversation.findAll({
//     where: {
//       [Op.or]: [{ senderId: userId }, { recipientId: userId }],
//     },
//     include: [{
//       model: User,
//       as: 'participants', // Assuming the 'participants' are part of the 'Conversation' model
//       attributes: ['id', 'username', 'avatar'],
//     }],
//   })
//     .then(conversations => {
//       // Filter out the current user from the participants list
//       conversations.forEach(conversation => {
//         conversation.participants = conversation.participants.filter(
//           participant => participant.id !== userId
//         );
//       });

//       res.render('chat', {
//         user: req.session.user,
//         conversations: conversations,
//       });
//     })
//     .catch(error => {
//       console.error('Error fetching conversations:', error);
//       res.status(500).json({ error: 'Failed to fetch conversations' });
//     });
// };

// // Send a message
// exports.sendMessage = async (req, res) => {
//   try {
//     const { recipientId, message, img } = req.body;
//     const senderId = req.session.user.id;

//     // Find or create the conversation
//     let conversation = await Conversation.findOne({
//       where: {
//         [Op.and]: [
//           { senderId },
//           { recipientId }
//         ]
//       }
//     });

//     if (!conversation) {
//       // If no conversation exists, create one
//       conversation = await Conversation.create({
//         senderId,
//         recipientId,
//         lastMessage: message
//       });
//     }

//     // Handle image upload (Assuming you already have an image upload mechanism like Cloudinary)
//     let imageUrl = "";
//     if (img) {
//       // Upload image and get URL (example using Cloudinary)
//       const uploadedResponse = await cloudinary.uploader.upload(img);
//       imageUrl = uploadedResponse.secure_url;
//     }

//     // Save the new message
//     const newMessage = await Message.create({
//       conversationId: conversation.id,
//       senderId,
//       text: message,
//       img: imageUrl || null,
//     });

//     // Emit a real-time event to the recipient (you need a socket connection setup for this)
//     const recipientSocketId = getRecipientSocketId(recipientId);
//     if (recipientSocketId) {
//       io.to(recipientSocketId).emit("newMessage", newMessage);
//     }

//     res.status(201).json(newMessage);
//   } catch (error) {
//     console.error('Error sending message:', error);
//     res.status(500).json({ error: 'Failed to send message' });
//   }
// };

  


const Message = require('../models/message');
const Conversation = require('../models/conversation');
const User = require('../models/user');
const { Op } = require('sequelize');
const { getRecipientSocketId,io } = require('../socket/socketHandler');

// Get chat messages for a conversation
// exports.getMessages = (req, res) => {
//   const conversationId = req.params.conversationId; // Use conversationId from the URL
//   const limit = parseInt(req.query.limit) || 50; // Limit the number of messages, default to 50
//   console.log('dvcdsyucgjsdgugb');
  

//   // Fetch messages based on the conversationId
//   Message.findAll({
//     where: { conversationId },
//     limit,
//     order: [['createdAt', 'ASC']], // Fetch messages in order of creation
//     include: [{
//       model: User,
//       as: 'sender',  // Assuming 'sender' is an alias for the User model
//       attributes: ['id', 'username', 'avatar'],
//     }],
//   })
//     .then(messages => {
//       console.log('msg',messages);
      
//       if (messages.length === 0) {
//         return res.render('chat', {
//           noMessages: true,
//           message: "No chat history found. Start a new conversation!"
//         });
//       }
//       res.render('chat', {
//         noMessages: false,
//         title: 'Chat Dashboard',
//         messages: messages.reverse(), // Reverse to display the oldest messages first
//         user: req.session.user, // The logged-in user
//       });
      
//     })
//     .catch(error => {
//       console.error('Error fetching messages:', error);
//       res.status(500).json({ error: 'Failed to fetch messages' });
//     });
// };


exports.getMessages = (req, res) => {
  const conversationId = req.params.conversationId; // Use conversationId from the URL
  const limit = parseInt(req.query.limit) || 50; // Limit the number of messages, default to 50

  // Fetch messages based on the conversationId
  Message.findAll({
    where: { conversationId },
    limit,
    order: [['createdAt', 'ASC']], // Fetch messages in order of creation
    include: [{
      model: User,
      as: 'sender',  // Assuming 'sender' is an alias for the User model
      attributes: ['id', 'username', 'avatar'],
    }],
  })
  .then(messages => {
    if (messages.length === 0) {
      return res.json({
        noMessages: true,
        message: "No chat history found. Start a new conversation!"
      });
    }
    res.json({
      noMessages: false,
      messages: messages, // Reverse to display the oldest messages first
    });
  })
  .catch(error => {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  });
};


// Render chat page
exports.renderChat = (req, res) => {
  const userId = req.session.user.id;
  console.log(userId);
  

  Conversation.findAll({
    where: {
      [Op.or]: [{ senderId: userId }, { recipientId: userId }],
    },
    include: [{
      model: User,
      as: 'participants', // Assuming the 'participants' are part of the 'Conversation' model
      attributes: ['id', 'username', 'avatar'],
    }],
  })
    .then(conversations => {
      console.log(conversations);
      
      // Filter out the current user from the participants list
      conversations.forEach(conversation => {
        conversation.participants = conversation.participants.filter(
          participant => participant.id !== userId
        );
      });

      res.render('chat', {
        user: req.session.user,
        conversations: conversations,
        title: 'Chat Dashboard',  // Set a title for the page
      });
    })
    .catch(error => {
      console.error('Error fetching conversations:', error);
      res.status(500).json({ error: 'Failed to fetch conversations' });
    });
};

// Send a message
exports.sendMessage = async (req, res) => {
  try {
    const { recipientId, message, img } = req.body;
    const senderId = req.session.user.id;

    // Find or create the conversation
    let conversation = await Conversation.findOne({
      where: {
        [Op.or]: [
          { senderId, recipientId },
          { senderId: recipientId, recipientId: senderId }
        ]
      },
      include: [{
        model: User,
        as: 'participants',
        attributes: ['id', 'username', 'avatar'],
      }],
    });

    if (!conversation) {
      // If no conversation exists, create one
      conversation = await Conversation.create({
        senderId,
        recipientId,
        lastMessageText: message, // Store the last message text
      });
    } else {
      // Update the last message text in the conversation
      await conversation.update({ lastMessageText: message });
    }

    // Handle image upload (Assuming you already have an image upload mechanism like Cloudinary)
    let imageUrl = "";
    if (img) {
      // Upload image and get URL (example using Cloudinary)
      const uploadedResponse = await cloudinary.uploader.upload(img);
      imageUrl = uploadedResponse.secure_url;
    }

    // Save the new message
    const newMessage = await Message.create({
      conversationId: conversation.id,
      senderId,
      text: message,
      img: imageUrl || null,
    });

    // Emit a real-time event to the recipient (you need a socket connection setup for this)
    const recipientSocketId = getRecipientSocketId(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};



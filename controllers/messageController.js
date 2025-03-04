const Message = require("../models/message");
const User = require("../models/user");
const { Op } = require("sequelize");
const { getRecipientSocketId, io } = require("../socket/socketHandler");

exports.getMessages = (req, res) => {
  console.log(req.params);
  console.log(req.session.user);

  const currentUserId = req.session.user.id;
  const { recipientId, senderId } = req.params;
  const limit = parseInt(req.query.limit) || 50;
  if (!recipientId) {
    return res.status(400).json({ error: "Recipient ID is required." });
  }

  Message.findAll({
    where: {
      [Op.or]: [
        { senderId, recipientId },
        { senderId: recipientId, recipientId: senderId },
      ],
    },
    limit,
    order: [["createdAt", "ASC"]],
    include: [
      {
        model: User,
        as: "sender",
        attributes: ["id", "username", "avatar"],
      },
      {
        model: User,
        as: "recipient",
        attributes: ["id", "username", "avatar"],
      },
    ],
  })
    .then((messages) => {
      if (messages.length === 0) {
        return res.json({
          noMessages: true,
          message: "No chat history found. Start a new conversation!",
        });
      }

      const formattedMessages = messages.map((msg) => ({
        id: msg.id,
        senderId: msg.senderId,
        recipientId: msg.recipientId,
        text: msg.text,
        createdAt: msg.createdAt,
        type: msg.senderId === currentUserId ? "sent" : "received",
      }));
      console.log("Formatted response", formattedMessages);

      res.json({
        noMessages: false,
        messages: formattedMessages,
      });
    })
    .catch((error) => {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    });
};

exports.renderChat = (req, res) => {
  const userId = req.session.user.id;
  console.log(userId);

  User.findAll({
    where: {
      id: { [Op.ne]: userId },
    },
    attributes: ["id", "username", "avatar"],
  })
    .then((users) => {
      return Promise.all(
        users.map((user) => {
          return Message.findOne({
            where: {
              [Op.or]: [
                { senderId: userId, recipientId: user.id },
                { senderId: user.id, recipientId: userId },
              ],
            },
            order: [["createdAt", "DESC"]],
            attributes: ["text", "senderId"],
          }).then((lastMessage) => {
            return {
              userId: user.id,
              username: user.username,
              avatar: user.avatar,
              lastMessage: lastMessage ? lastMessage.text : "New chat",
            };
          });
        })
      );
    })
    .then((usersWithLastMessage) => {
      console.log("usersWithLastMessage", usersWithLastMessage);
      res.render("chat", {
        user: req.session.user,
        conversations: usersWithLastMessage,
        title: "Chat Dashboard",
      });
    })
    .catch((error) => {
      console.error("Error fetching users and messages:", error);
      res.status(500).json({ error: "Failed to fetch users and messages" });
    });
};

exports.sendMessage = (req, res) => {
  const { recipientId, message, img } = req.body;
  const senderId = req.session.user.id;

  let imageUrl = "";
  const uploadPromise = img ? cloudinary.uploader.upload(img) : Promise.resolve(null);

  uploadPromise
    .then((uploadedResponse) => {
      if (uploadedResponse) {
        imageUrl = uploadedResponse.secure_url;
      }
      return Message.create({
        senderId,
        recipientId,
        text: message,
        img: imageUrl || null,
      });
    })
    .then((newMessage) => {
      const recipientSocketId = getRecipientSocketId(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("newMessage", newMessage);
      }
      res.status(201).json(newMessage);
    })
    .catch((error) => {
      console.error("Error sending message:", error);
      res.status(500).json({ error: "Failed to send message" });
    });
};
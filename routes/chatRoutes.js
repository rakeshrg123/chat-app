const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// Chat routes
router.get('/', (req, res) => {
  res.redirect('/chat');
});

router.get('/chat', isAuthenticated, messageController.renderChat);
router.post('/send-message', isAuthenticated, messageController.sendMessage);
router.get('/messages/:conversationId?', isAuthenticated, messageController.getMessages);

module.exports = router;

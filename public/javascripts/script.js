const user = JSON.parse(document.getElementById("userData").value);

// Store only necessary user information in localStorage
const userForStorage = {
  id: user.id,
  username: user.username,
  avatar: user.avatar,
  email: user.email,
  // Add other non-sensitive fields as needed
};

// Store the limited user object in localStorage
localStorage.setItem("user", JSON.stringify(userForStorage));
const storedId = JSON.parse(localStorage.getItem("user"));
// Socket.io initialization
const socket = io("/", {
  query: {
    userId: storedId.id,
  },
});
let currentRecipientId = null;
let currentConversationId = null;
const userId = "<%= user.id %>";

const messageInput = document.getElementById("message-input");
let typingTimeout;

// Emit "typing" when user starts typing
messageInput.addEventListener("input", () => {
  socket.emit("typing", {
    senderId: userId,
    recipientId: currentRecipientId,
    conversationId: currentConversationId,
  });

  // Clear the previous timeout and set a new one
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", {
      senderId: userId,
      recipientId: currentRecipientId,
      conversationId: currentConversationId,
    });
  }, 1000); // Stop typing after 2 seconds of inactivity
});

socket.on("typing", (data) => {
  console.log("typing", data);

  if (data.conversationId.toString() === currentConversationId.toString()) {
    // Check if the "Typing..." message already exists
    let existingTypingElement = document.getElementById("typing-message");

    if (!existingTypingElement) {
      // Create new "Typing..." message only if it doesn't exist
      const messageElement = document.createElement("div");
      messageElement.className = "message received";
      messageElement.id = "typing-message"; // Unique ID for easy removal

      messageElement.innerHTML = `
            <div class="message-content">
                <div class="message-text">Typing...</div>
            </div>
        `;

      console.log("🟢 Created typing message element:", messageElement);

      // Append the "Typing..." message
      const messageContainer = document.getElementById("message-container");
      messageContainer.appendChild(messageElement);

      // 🔹 Scroll to show "Typing..." at the bottom 🔹
      setTimeout(() => {
        messageContainer.scrollTop = messageContainer.scrollHeight;
      }, 50); // Small delay to ensure rendering
    }
  }
});

// Listen for "stopTyping" event
socket.on("stopTyping", (data) => {
  if (data.conversationId.toString() === currentConversationId.toString()) {
    // Remove the "Typing..." message
    const typingElement = document.getElementById("typing-message");
    if (typingElement) {
      typingElement.remove();
      console.log("🛑 Removed typing message.");
    }
  }
});

// When a conversation is clicked
document.querySelectorAll(".conversation-item").forEach((item) => {
  item.addEventListener("click", function () {
    const conversationId = this.getAttribute("data-conversation-id");
    const recipientId = this.getAttribute("data-recipient-id");
    const username = this.querySelector(".username").textContent;

    // Update UI to show the selected conversation
    document
      .querySelectorAll(".conversation-item")
      .forEach((i) => i.classList.remove("active"));
    this.classList.add("active");
    document.getElementById("current-chat-user").textContent = username;
    document.getElementById("recipient-id").value = recipientId;
    document.getElementById("conversation-id").value = conversationId;
    document.getElementById("message-input").disabled = false;
    document.getElementById("send-message").disabled = false;

    // Store the current conversation
    currentRecipientId = recipientId;
    currentConversationId = conversationId;

    // Fetch messages for this conversation
    fetchMessages(conversationId);
  });
});

// Fetch messages for a conversation
function fetchMessages(conversationId) {
  fetch(`/messages/${conversationId}`)
    .then((response) => response.json())
    .then((data) => {
      const messageContainer = document.getElementById("message-container");

      if (data.noMessages) {
        messageContainer.innerHTML = `<div class="no-messages"><p>${data.message}</p></div>`;
      } else {
        let messagesHTML = "";

        data.messages.forEach((message) => {
          const messageClass =
            message.senderId === parseInt(userId) ? "sent" : "received";
          let imageHTML = "";

          if (message.img) {
            imageHTML = `<div class="message-image"><img src="${message.img}" alt="Shared image"></div>`;
          }

          messagesHTML += `
                            <div class="message ${messageClass}">
                                <div class="message-content">
                                    ${imageHTML}
                                    <div class="message-text">${
                                      message.text
                                    }</div>
                                    <div class="message-time">${new Date(
                                      message.createdAt
                                    ).toLocaleTimeString()}</div>
                                </div>
                            </div>
                        `;
        });

        messageContainer.innerHTML = messagesHTML;
        messageContainer.scrollTop = messageContainer.scrollHeight;
      }
    })
    .catch((error) => {
      console.error("Error fetching messages:", error);
    });
}

// Send message form handling
document
  .getElementById("message-form")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    const messageInput = document.getElementById("message-input");
    const message = messageInput.value.trim();
    const recipientId = document.getElementById("recipient-id").value;

    if (!message || !recipientId) return;

    // Send the message
    fetch("/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipientId,
        message,
        img: null, // Handle image upload separately
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        // Clear input field
        messageInput.value = "";

        // If the current conversation is active, append the message to the UI
        if (recipientId === currentRecipientId) {
          // Add message to the UI
          const messageContainer = document.getElementById("message-container");
          const messageElement = document.createElement("div");
          messageElement.className = "message sent";
          messageElement.innerHTML = `
                    <div class="message-content">
                        <div class="message-text">${data.text}</div>
                        <div class="message-time">${new Date(
                          data.createdAt
                        ).toLocaleTimeString()}</div>
                    </div>
                `;
          messageContainer.appendChild(messageElement);
          messageContainer.scrollTop = messageContainer.scrollHeight;
        }
      })
      .catch((error) => {
        console.error("Error sending message:", error);
      });
  });

// Image upload handling
document.getElementById("attach-image").addEventListener("click", function () {
  document.getElementById("image-upload").click();
});

document
  .getElementById("image-upload")
  .addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    // Handle file upload logic here
    // This would typically involve FormData and a separate upload endpoint
    console.log("File selected:", file.name);
  });

// Socket.io event listeners for real-time messaging
socket.on("connect", () => {
  console.log("Connected to socket server");
});

socket.on("newMessage", (message) => {
  console.log("🟢 New message received:", message);
  console.log("Message Conversation ID:", message.conversationId);
  console.log("Current Conversation ID:", currentConversationId);

  const messageContainer = document.getElementById("message-container");
  if (!messageContainer) {
    console.error("🔴 Message container not found! Stopping execution.");
    return;
  }
  console.log("🟢 Message container found!");
  console.log(message.conversationId);
  console.log(currentConversationId);

  // Ensure the message belongs to the current conversation
  if (message.conversationId.toString() !== currentConversationId.toString()) {
    console.warn(
      "🟠 Message does not belong to the current conversation. Ignoring."
    );
    return;
  }
  console.log("🟢 Message belongs to the current conversation!");

  // Create the message element
  const messageElement = document.createElement("div");
  messageElement.className = "message received";

  let imageHTML = message.img
    ? `<div class="message-image"><img src="${message.img}" alt="Shared image"></div>`
    : "";

  messageElement.innerHTML = `
    <div class="message-content">
        ${imageHTML}
        <div class="message-text">${message.text}</div>
        <div class="message-time">${new Date(
          message.createdAt
        ).toLocaleTimeString()}</div>
    </div>
`;

  console.log("🟢 Created message element:", messageElement);

  // Append message
  messageContainer.appendChild(messageElement);
  console.log("🟢 Message appended!");

  // 🔹 Force DOM Update 🔹
  messageContainer.offsetHeight; // Trigger a reflow to force UI update
  messageContainer.scrollTop = messageContainer.scrollHeight;
  console.log("🟢 Forced DOM update & scrolled to bottom!");
});

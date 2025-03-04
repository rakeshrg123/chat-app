const user = JSON.parse(document.getElementById("userData").value);

const userForStorage = {
  id: user.id,
  username: user.username,
  avatar: user.avatar,
  email: user.email,
};

localStorage.setItem("user", JSON.stringify(userForStorage));
const storedId = JSON.parse(localStorage.getItem("user"));

const socket = io("/", {
  query: {
    userId: storedId.id,
  },
});
let currentRecipientId = null;
let currentConversationId = null;
const userId = storedId.id;

const messageInput = document.getElementById("message-input");
let typingTimeout;

messageInput.addEventListener("input", () => {
  socket.emit("typing", {
    senderId: userId,
    recipientId: currentRecipientId,
    conversationId: currentConversationId,
  });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping", {
      senderId: userId,
      recipientId: currentRecipientId,
      conversationId: currentConversationId,
    });
  }, 1000);
});

socket.on("typing", (data) => {
  console.log("typing", data);
  if (data.senderId.toString() !== activeChatUserId.toString() && data.recipientId.toString() !== activeChatUserId.toString()) {
    console.log("🚫 Typing does not belong to the active chat. Ignoring.");
    return;
  }

  let existingTypingElement = document.getElementById("typing-message");

  if (!existingTypingElement) {
    const messageElement = document.createElement("div");
    messageElement.className = "message received";
    messageElement.id = "typing-message";

    messageElement.innerHTML = `
            <div class="message-content">
                <div class="message-text">Typing...</div>
            </div>
        `;

    console.log("🟢 Created typing message element:", messageElement);

    const messageContainer = document.getElementById("message-container");
    messageContainer.appendChild(messageElement);

    setTimeout(() => {
      messageContainer.scrollTop = messageContainer.scrollHeight;
    }, 50);
  }
});

socket.on("stopTyping", (data) => {
  const typingElement = document.getElementById("typing-message");
  if (typingElement) {
    typingElement.remove();
    console.log("🛑 Removed typing message.");
  }
});

document.querySelectorAll(".conversation-item").forEach((item) => {
  item.addEventListener("click", function () {
    const conversationId = this.getAttribute("data-conversation-id");
    const recipientId = this.getAttribute("data-recipient-id");
    const username = this.querySelector(".username").textContent;

    document
      .querySelectorAll(".conversation-item")
      .forEach((i) => i.classList.remove("active"));
    this.classList.add("active");
    document.getElementById("current-chat-user").textContent = username;
    document.getElementById("recipient-id").value = recipientId;
    document.getElementById("conversation-id").value = conversationId;
    document.getElementById("message-input").disabled = false;
    document.getElementById("send-message").disabled = false;

    currentRecipientId = recipientId;
    currentConversationId = conversationId;

    fetchMessages(currentRecipientId);
  });
});

document.addEventListener("DOMContentLoaded", () => {
  fetch("/chat")
    .then((response) => response.json())
    .then((data) => {
      console.log("Data", data);
      if (!data.conversations || data.conversations.length === 0) {
        document.getElementById("message-container").innerHTML =
          "<p>No conversations found.</p>";
        return;
      }

      const conversationList = document.getElementById("conversation-list");
      conversationList.innerHTML = "";

      data.conversations.forEach((conversation) => {
        const listItem = document.createElement("div");
        listItem.classList.add("conversation-item");
        listItem.setAttribute("data-conversation-id", conversation.id);
        listItem.setAttribute("data-recipient-id", conversation.userId);
        listItem.innerHTML = `
          <div class="avatar">
            <img src="${conversation.avatar}" alt="${conversation.username}">
          </div>
          <div class="chat-info">
            <div class="username">${conversation.username}</div>
            <div class="last-message">${
              conversation.lastMessage || "No messages yet"
            }</div>
          </div>
        `;

        listItem.addEventListener("click", function () {
          const conversationId = this.getAttribute("data-conversation-id");
          const recipientId = this.getAttribute("data-recipient-id");
          const username = this.querySelector(".username").textContent;

          document
            .querySelectorAll(".conversation-item")
            .forEach((i) => i.classList.remove("active"));
          this.classList.add("active");
          document.getElementById("current-chat-user").textContent = username;
          document.getElementById("recipient-id").value = recipientId;
          document.getElementById("conversation-id").value = conversationId;
          document.getElementById("message-input").disabled = false;
          document.getElementById("send-message").disabled = false;

          currentRecipientId = recipientId;
          currentConversationId = conversationId;

          fetchMessages(conversationId);
        });

        conversationList.appendChild(listItem);
      });
    })
    .catch((error) => {
      console.error("Error fetching chat data:", error);
    });
});
let activeChatUserId = null; // Store the currently active chat user

function openChat(userId) {
  activeChatUserId = userId; // Set active chat user when opening a conversation
}

function fetchMessages(recipientId) {
  fetch(`/messages/${storedId.id}/${recipientId}`)
    .then((response) => response.json())
    .then((data) => {
      const messageContainer = document.getElementById("message-container");
      openChat(recipientId)
      if (data.noMessages) {
        messageContainer.innerHTML = `<div class="no-messages"><p>${data.message}</p></div>`;
      } else {
        let messagesHTML = "";

        data.messages.forEach((message) => {
          const messageClass = message.type;
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

document
  .getElementById("message-form")
  .addEventListener("submit", function (e) {
    e.preventDefault();

    const messageInput = document.getElementById("message-input");
    const message = messageInput.value.trim();
    const recipientId = document.getElementById("recipient-id").value;

    if (!message || !recipientId) return;

    fetch("/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        recipientId,
        message,
        img: null,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        messageInput.value = "";

        if (recipientId === currentRecipientId) {
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
        const context ={
          text:data.text,
          senderId:storedId.id,
          recipientId: recipientId
        }
        updateLastMessageInConversation(context)
      })
      .catch((error) => {
        console.error("Error sending message:", error);
      });
  });

document.getElementById("attach-image").addEventListener("click", function () {
  document.getElementById("image-upload").click();
});

document
  .getElementById("image-upload")
  .addEventListener("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;
    console.log("File selected:", file.name);
  });

socket.on("connect", () => {
  console.log("Connected to socket server");
});

function updateLastMessageInConversation(message) {
  console.log("🟢 Updating last message in conversation list...");

  const conversationItem = document.querySelector(
    `.conversation-item[data-recipient-id="${message.senderId}"], 
     .conversation-item[data-recipient-id="${message.recipientId}"]`
  );

  if (!conversationItem) {
    console.warn("🟠 Conversation not found, skipping last message update.");
    return;
  }

  console.log("🟢 Conversation found, updating last message...");

  const lastMessageDiv = conversationItem.querySelector(".last-message");
  if (lastMessageDiv) {
    lastMessageDiv.textContent = message.text;
    console.log("✅ Last message updated successfully!");
  } else {
    console.warn("🟠 Last message div not found!");
  }
}


socket.on("newMessage", (message) => {
  console.log("🟢 New message received:", message);
  console.log("Message Conversation ID:", message.conversationId);
  console.log("Current Conversation ID:", currentConversationId);
  
  console.log("activeChatUserId", activeChatUserId)
  console.log("message.senderId", message.senderId)
  console.log("message.recipientId ", message.recipientId )

  if (message.senderId.toString() !== activeChatUserId.toString() && message.recipientId.toString() !== activeChatUserId.toString()) {
    console.log("🚫 Message does not belong to the active chat. Ignoring.");
    return;
  }

  console.log("✅ Message belongs to the active conversation!");

  const messageContainer = document.getElementById("message-container");
  if (!messageContainer) {
    console.error("🔴 Message container not found! Stopping execution.");
    return;
  }

  console.log("🟢 Message container found!");
  console.log(message.conversationId);
  console.log(currentConversationId);

  console.log("🟢 Message belongs to the current conversation!");

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

  messageContainer.appendChild(messageElement);
  console.log("🟢 Message appended!");

  messageContainer.offsetHeight;
  messageContainer.scrollTop = messageContainer.scrollHeight;
  console.log("🟢 Forced DOM update & scrolled to bottom!");
  updateLastMessageInConversation(message);
});

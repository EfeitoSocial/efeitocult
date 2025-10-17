// Chat Widget Script
window.ChatWidgetConfig = {
    webhook: {
        url: 'https://efeitosocial.app.n8n.cloud/webhook/4cac4a7e-c9ab-4b24-8a0d-97a4f4e66717/chat',
        route: 'general'
    }
};

// Function to generate or retrieve a unique chat ID
function getChatId() {
    let chatId = sessionStorage.getItem("chatId");
    if (!chatId) {
        chatId = "chat_" + Math.random().toString(36).substr(2, 9); // Unique ID
        sessionStorage.setItem("chatId", chatId);
    }
    return chatId;
}

// Send message to n8n webhook
document.getElementById("chat-widget-send").addEventListener("click", function() {
    let message = document.getElementById("chat-widget-input").value;
    if (message.trim() === "") return;

    let chatBody = document.getElementById("chat-widget-body");
    let newMessage = document.createElement("p");
    newMessage.textContent = message;
    newMessage.style.color = "#333";
    newMessage.style.background = "#f1f1f1";
    chatBody.appendChild(newMessage);

    let chatId = getChatId(); // Retrieve the session chat ID

    fetch(window.ChatWidgetConfig.webhook.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chatId: chatId,  // Attach chat ID for memory tracking
            message: message,
            route: window.ChatWidgetConfig.webhook.route
        })
    })
    .then(response => response.json())
    .then(data => {
        let botMessage = document.createElement("p");
        botMessage.innerHTML = data.output || "Sorry, I couldn't understand that.";
        botMessage.style.color = "#fff";
        botMessage.style.background = "#0B1A4A";
        botMessage.style.marginTop = "10px";
        chatBody.appendChild(botMessage);
    })
    .catch(error => console.error("Error:", error));

    document.getElementById("chat-widget-input").value = "";
});
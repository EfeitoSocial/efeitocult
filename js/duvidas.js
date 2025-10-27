import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const logoutButton = document.getElementById('logout-button');
const accordionItems = document.querySelectorAll('.accordion-item');
const contactForm = document.getElementById('contact-form');
const adminLink = document.getElementById('admin-link');
const crmLink = document.getElementById('crm-link');

// --- AUTHENTICATION ---
onAuthStateChanged(auth, (user) => {
    if (user) {
        fetchUserData(user.uid);
    } else {
        window.location.href = 'login.html';
    }
});

const fetchUserData = async (uid) => {
    try {
        const userDocRef = doc(db, "users", uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
            const userData = docSnap.data();
            if (userData.isAdmin === true) {
                adminLink.style.display = 'block';
                crmLink.style.display = 'block';
            }
        }
    } catch (error) {
        console.error("Error fetching user profile data:", error);
    }
};

logoutButton.addEventListener('click', (e) => {
    e.preventDefault();
    signOut(auth).catch((error) => console.error('Sign out error:', error));
});

// --- CONTACT FORM LOGIC ---
contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) {
        alert('Você precisa estar logado para enviar uma mensagem.');
        return;
    }

    const assunto = document.getElementById('assunto').value;
    const mensagem = document.getElementById('mensagem').value;

    try {
        await addDoc(collection(db, "contactMessages"), {
            userId: user.uid,
            email: user.email,
            subject: assunto,
            message: mensagem,
            createdAt: new Date()
        });
        alert('Mensagem enviada com sucesso!');
        contactForm.reset();
    } catch (error) {
        console.error("Error sending message: ", error);
        alert('Ocorreu um erro ao enviar sua mensagem. Tente novamente.');
    }
});



//Chat Logic

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
function sendMessage(message){
    document.getElementById("chat-widget-input").readOnly = true;
    document.getElementById("chat-widget-input").placeholder = "Pensando...";
    if (message.trim() === "") return;

    let chatBody = document.getElementById("chat-widget-body");
    let newMessage = document.createElement("p");
    newMessage.textContent = message;
    newMessage.style.color = "#003A60";
    newMessage.style.background = "#ffffff";
    newMessage.style.boxShadow = "0 4px 12px 0 rgba(0, 58, 96, 0.10)";
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
        botMessage.style.background = "#003A60";
        botMessage.style.marginTop = "10px";
        chatBody.appendChild(botMessage);
        document.getElementById("chat-widget-input").readOnly = false;
        document.getElementById("chat-widget-input").placeholder = "Pergunte alguma coisa";
    })
    .catch(error => console.error("Error:", error));

    document.getElementById("chat-widget-input").value = "";
};
document.getElementById("chat-widget-send").addEventListener("click", function(){ sendMessage(document.getElementById("chat-widget-input").value); });
document.getElementById("chat-widget-input").addEventListener("keydown", function(e){ 
    if(e.key == "Enter"){
        sendMessage(document.getElementById("chat-widget-input").value); 
    }
});
document.getElementById("what-are").addEventListener("click", function(){ sendMessage("O que são leis de incentivo fiscal?"); })
document.getElementById("who-can").addEventListener("click", function(){ sendMessage("Quem pode destinar imposto de renda para projetos sócio-culturais?"); })
document.getElementById("what-percentage").addEventListener("click", function(){ sendMessage("Qual percentual do meu imposto de renda posso investir para cultura?"); })
document.getElementById("can-i-destine").addEventListener("click", function(){ sendMessage("Posso destinar para mais de um projeto?"); })

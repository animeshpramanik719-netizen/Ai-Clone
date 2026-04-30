const promptInput = document.getElementById('prompt-input');
const sendBtn = document.getElementById('send-btn');
const chatContainer = document.getElementById('chat-container');
const welcomeScreen = document.getElementById('welcome-screen');
const newChatBtn = document.getElementById('new-chat-btn');
const imageUpload = document.getElementById('image-upload');
const uploadBtn = document.getElementById('upload-btn');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const removeImageBtn = document.getElementById('remove-image-btn');

// Sidebar Elements
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');
const menuOpenBtn = document.getElementById('menu-open-btn');
const menuCloseBtn = document.getElementById('menu-close-btn');
const newChatSidebarBtn = document.getElementById('new-chat-sidebar-btn');
const historyItemsContainer = document.getElementById('history-items');

let currentImageData = null;
let currentImageMimeType = null;

// Configure marked.js to use highlight.js for code blocks
marked.setOptions({
    highlight: function(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'plaintext';
        return hljs.highlight(code, { language }).value;
    },
    langPrefix: 'hljs language-'
});

const API_KEY = 'AIzaSyDdGA33ML6QtSNKCdLRRY16u4QNinZPujM';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`;

// --- State Management ---
// Load all chats from localStorage
let allChats = JSON.parse(localStorage.getItem('gemini_clone_chats')) || [];
let currentChatId = null;

// The current active session's API format history
let chatHistory = [];
// The current active session's UI format history
let uiMessages = [];

// Initialize
init();

function init() {
    renderSidebar();
    
    // Close sidebar on mobile by default
    if (window.innerWidth <= 768) {
        sidebar.classList.add('closed');
    }
    
    // Toggle sidebar
    menuOpenBtn.addEventListener('click', () => {
        sidebar.classList.remove('closed');
        if (sidebarOverlay) sidebarOverlay.classList.add('active');
    });
    
    menuCloseBtn.addEventListener('click', () => {
        sidebar.classList.add('closed');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    });

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.add('closed');
            sidebarOverlay.classList.remove('active');
        });
    }
    
    // Create new chat
    newChatBtn.addEventListener('click', startNewChat);
    newChatSidebarBtn.addEventListener('click', startNewChat);
    
    // If there are existing chats, we don't automatically load the first one unless the user clicks it.
    // Instead, we start on a new empty chat screen by default.
}

function saveChatsToLocal() {
    localStorage.setItem('gemini_clone_chats', JSON.stringify(allChats));
}

function saveCurrentChat() {
    if (uiMessages.length === 0) return; // Don't save empty chats

    if (!currentChatId) {
        // Create new chat session
        currentChatId = 'chat_' + Date.now();
        // Generate title from first user message
        const firstUserMsg = uiMessages.find(m => m.sender === 'user');
        const title = firstUserMsg ? firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '') : 'New Chat';
        
        const newChatSession = {
            id: currentChatId,
            title: title,
            history: chatHistory,
            uiMessages: uiMessages,
            timestamp: Date.now()
        };
        
        allChats.unshift(newChatSession); // Add to beginning
    } else {
        // Update existing chat
        const chatIndex = allChats.findIndex(c => c.id === currentChatId);
        if (chatIndex !== -1) {
            allChats[chatIndex].history = chatHistory;
            allChats[chatIndex].uiMessages = uiMessages;
        }
    }
    
    saveChatsToLocal();
    renderSidebar();
}

function startNewChat() {
    currentChatId = null;
    chatHistory = [];
    uiMessages = [];
    
    // Reset UI
    chatContainer.innerHTML = '';
    chatContainer.appendChild(welcomeScreen);
    welcomeScreen.style.display = 'flex';
    promptInput.value = '';
    promptInput.style.height = 'auto';
    clearImage();
    sendBtn.disabled = true;
    
    renderSidebar();
}

function loadChat(id) {
    const chatSession = allChats.find(c => c.id === id);
    if (!chatSession) return;
    
    currentChatId = chatSession.id;
    chatHistory = [...chatSession.history];
    uiMessages = [...chatSession.uiMessages];
    
    // Render UI
    chatContainer.innerHTML = '';
    welcomeScreen.style.display = 'none';
    
    uiMessages.forEach(msg => {
        renderMessageToUI(msg.content, msg.sender, msg.imageUrl);
    });
    
    renderSidebar();
    
    // Close sidebar on mobile after selection
    if (window.innerWidth <= 768) {
        sidebar.classList.add('closed');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }
}

function renderSidebar() {
    historyItemsContainer.innerHTML = '';
    
    allChats.forEach(chat => {
        const item = document.createElement('div');
        item.classList.add('history-item');
        if (chat.id === currentChatId) {
            item.classList.add('active');
        }
        
        item.innerHTML = `
            <i class="fa-regular fa-message"></i>
            <span>${chat.title}</span>
        `;
        
        item.addEventListener('click', () => loadChat(chat.id));
        historyItemsContainer.appendChild(item);
    });
}
// --- End State Management ---

// Auto-resize textarea
promptInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
    
    // Enable/disable send button
    if(this.value.trim().length > 0 || currentImageData) {
        sendBtn.disabled = false;
        sendBtn.style.color = 'var(--text-primary)';
    } else {
        sendBtn.disabled = true;
        sendBtn.style.color = 'var(--text-secondary)';
    }
});

// Handle Enter key (Shift+Enter for new line)
promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if(!sendBtn.disabled) {
            handleSend();
        }
    }
});

sendBtn.addEventListener('click', handleSend);

uploadBtn.addEventListener('click', () => {
    imageUpload.click();
});

imageUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            imagePreview.src = event.target.result;
            imagePreviewContainer.style.display = 'block';
            
            // Extract base64 and mime type
            const base64String = event.target.result.split(',')[1];
            currentImageData = base64String;
            currentImageMimeType = file.type;
            
            // Enable send button
            sendBtn.disabled = false;
            sendBtn.style.color = 'var(--text-primary)';
        };
        reader.readAsDataURL(file);
    }
});

removeImageBtn.addEventListener('click', () => {
    clearImage();
});

function clearImage() {
    imageUpload.value = '';
    currentImageData = null;
    currentImageMimeType = null;
    imagePreviewContainer.style.display = 'none';
    imagePreview.src = '';
    
    if(promptInput.value.trim().length === 0) {
        sendBtn.disabled = true;
        sendBtn.style.color = 'var(--text-secondary)';
    }
}

async function handleSend() {
    const message = promptInput.value.trim();
    if (!message && !currentImageData) return;

    // Hide welcome screen on first message
    if (welcomeScreen.style.display !== 'none') {
        welcomeScreen.style.display = 'none';
    }

    const imageDataToPass = currentImageData;
    const imageMimeTypeToPass = currentImageMimeType;
    const imageUrlToPass = imagePreview.src;

    // Clear input
    promptInput.value = '';
    promptInput.style.height = 'auto';
    clearImage();
    sendBtn.disabled = true;

    // Save to state
    uiMessages.push({ content: message, sender: 'user', imageUrl: imageUrlToPass });
    // Append to UI
    renderMessageToUI(message, 'user', imageUrlToPass);

    // Save chat immediately so it appears in the sidebar even before bot replies
    saveCurrentChat();

    // Append loading indicator
    const loadingId = appendLoading();

    // Call API
    try {
        const responseText = await fetchGeminiResponse(message, imageDataToPass, imageMimeTypeToPass);
        removeLoading(loadingId);
        
        // Save bot response to state
        uiMessages.push({ content: responseText, sender: 'bot', imageUrl: null });
        saveCurrentChat();
        
        // Append to UI
        renderMessageToUI(responseText, 'bot');
    } catch (error) {
        console.error('Error fetching from Gemini:', error);
        removeLoading(loadingId);
        
        const errorMessage = "Sorry, I encountered an error. Please check your API key and connection.";
        uiMessages.push({ content: errorMessage, sender: 'bot', imageUrl: null });
        saveCurrentChat();
        
        renderMessageToUI(errorMessage, 'bot');
    }
}

function renderMessageToUI(content, sender, imageUrl = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);

    let avatar = null;
    if (sender === 'user') {
        avatar = document.createElement('div');
        avatar.classList.add('avatar');
        // Updated to a "man" logo
        avatar.innerHTML = '<i class="fa-solid fa-user-tie"></i>';
    }

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    
    if (imageUrl && imageUrl !== '') {
        const img = document.createElement('img');
        img.src = imageUrl;
        img.classList.add('message-image');
        messageContent.appendChild(img);
    }

    if (content) {
        const textDiv = document.createElement('div');
        if (sender === 'bot') {
            textDiv.innerHTML = marked.parse(content);
        } else {
            textDiv.textContent = content;
        }
        messageContent.appendChild(textDiv);
    }

    if (avatar) {
        messageDiv.appendChild(avatar);
    }
    messageDiv.appendChild(messageContent);
    chatContainer.appendChild(messageDiv);

    // Scroll to bottom
    scrollToBottom();
}

function appendLoading() {
    const id = 'loading-' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', 'bot');
    messageDiv.id = id;

    // No avatar for bot

    const messageContent = document.createElement('div');
    messageContent.classList.add('message-content');
    
    const typingIndicator = document.createElement('div');
    typingIndicator.classList.add('custom-loader');
    
    // Create 8 spokes for the animated icon
    for (let i = 0; i < 8; i++) {
        const spoke = document.createElement('div');
        spoke.classList.add('spoke');
        typingIndicator.appendChild(spoke);
    }

    messageContent.appendChild(typingIndicator);
    messageDiv.appendChild(messageContent);
    
    chatContainer.appendChild(messageDiv);
    scrollToBottom();
    
    return id;
}

function removeLoading(id) {
    const loadingEl = document.getElementById(id);
    if (loadingEl) {
        loadingEl.remove();
    }
}

function scrollToBottom() {
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

async function fetchGeminiResponse(prompt, imageData, mimeType) {
    const userParts = [];
    if (imageData) {
        userParts.push({
            inlineData: {
                data: imageData,
                mimeType: mimeType
            }
        });
    }
    if (prompt) {
        userParts.push({ text: prompt });
    }

    // Add to API history
    chatHistory.push({
        role: "user",
        parts: userParts
    });

    const requestBody = {
        contents: chatHistory
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0) {
        const textResponse = data.candidates[0].content.parts[0].text;
        
        // Add bot response to API history
        chatHistory.push({
            role: "model",
            parts: [{ text: textResponse }]
        });
        
        return textResponse;
    } else {
        throw new Error('Invalid response structure from Gemini API');
    }
}

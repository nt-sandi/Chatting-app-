// Firebase configuration put your own
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const auth = firebase.auth();

// DOM Elements
const loginPage = document.getElementById('loginPage');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');
const registerName = document.getElementById('registerName');
const registerEmail = document.getElementById('registerEmail');
const registerPassword = document.getElementById('registerPassword');
const registerConfirmPassword = document.getElementById('registerConfirmPassword');
const registerBtn = document.getElementById('registerBtn');
const registerError = document.getElementById('registerError');
const registerSuccess = document.getElementById('registerSuccess');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');
const logoutButton = document.getElementById('logoutButton');
const dropdownMenu = document.getElementById('dropdownMenu');
const dropdownToggle = document.querySelector('.dropdown-toggle');

const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const emojiButton = document.getElementById('emojiButton');
const emojiPickerContainer = document.getElementById('emojiPickerContainer');
const emojiPicker = document.getElementById('emojiPicker');
const currentChatName = document.getElementById('currentChatName');
const currentChatStatus = document.getElementById('currentChatStatus');
const typingIndicator = document.getElementById('typingIndicator');
const typingUser = document.getElementById('typingUser');
const micButton = document.getElementById('micButton');
const voiceRecordingContainer = document.getElementById('voiceRecordingContainer');
const recordingTime = document.getElementById('recordingTime');
const sendRecordingBtn = document.getElementById('sendRecordingBtn');
const cancelRecordingBtn = document.getElementById('cancelRecordingBtn');
const aboutButton = document.getElementById('aboutButton');
const aboutModal = document.getElementById('aboutModal');
const modalClose = document.getElementById('modalClose');
const notification = document.getElementById('notification');
const notificationTitle = document.getElementById('notificationTitle');
const notificationMessage = document.getElementById('notificationMessage');
const notificationClose = document.getElementById('notificationClose');

// Set default chat to public chat
const defaultChatId = 'public-chat';
let currentUser = null;
let currentUserId = null;

// Voice recording variables
let mediaRecorder;
let audioChunks = [];
let recordingStartTime;
let recordingTimer;
let isRecording = false;

// Typing indicator variables
let typingTimeout;
let isTyping = false;
let isAppFocused = true;

// Emoji picker functionality
let isEmojiPickerVisible = false;

// Dropdown menu functionality
let isDropdownVisible = false;

// Scroll management variables
let isUserScrolling = false;
let scrollTimer;
let shouldAutoScroll = true;
let lastScrollTop = 0;

// Loading state
let isLoadingMessages = false;

// Message reply and reaction variables
let replyingToMessage = null;
let activeReactionPicker = null;
let activeMessageOptions = null;
const availableReactions = ['❤️', '😂', '🔥', '👍🏽', '😮', '😢', '👏'];

// Toggle between login and register forms
showRegister.addEventListener('click', () => {
  loginForm.style.display = 'none';
  registerForm.style.display = 'block';
  clearMessages();
});

showLogin.addEventListener('click', () => {
  registerForm.style.display = 'none';
  loginForm.style.display = 'block';
  clearMessages();
});

function clearMessages() {
  loginError.classList.remove('show');
  registerError.classList.remove('show');
  registerSuccess.classList.remove('show');
}

// Show loading animation
function showLoadingAnimation() {
  chatMessages.innerHTML = `
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">Loading messages...</div>
    </div>
  `;
  isLoadingMessages = true;
}

// Hide loading animation
function hideLoadingAnimation() {
  isLoadingMessages = false;
  // Messages will be loaded by the loadMessages function
}

// Dropdown menu functionality
dropdownToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  isDropdownVisible = !isDropdownVisible;
  dropdownMenu.classList.toggle('show', isDropdownVisible);
});

// Close dropdown when clicking outside
document.addEventListener('click', () => {
  if (isDropdownVisible) {
    isDropdownVisible = false;
    dropdownMenu.classList.remove('show');
  }
});

// Handle user registration
registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const name = registerName.value.trim();
  const email = registerEmail.value.trim();
  const password = registerPassword.value;
  const confirmPassword = registerConfirmPassword.value;
  
  // Validation
  if (password.length < 6) {
    showError(registerError, 'Password must be at least 6 characters long');
    return;
  }
  
  if (password !== confirmPassword) {
    showError(registerError, 'Passwords do not match');
    return;
  }
  
  // Disable button and show loading state
  registerBtn.disabled = true;
  registerBtn.textContent = 'Creating Account...';
  
  // Create user with Firebase Authentication
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // User created successfully
      const user = userCredential.user;
      
      // Update user profile with display name
      return user.updateProfile({
        displayName: name
      }).then(() => {
        // Save additional user data to database
        return database.ref('users/' + user.uid).set({
          name: name,
          email: email,
          createdAt: firebase.database.ServerValue.TIMESTAMP
        });
      });
    })
    .then(() => {
      // Show success message
      showSuccess(registerSuccess, 'Account created successfully!');
      
      // Reset form
      registerForm.reset();
      
      // Switch to login form after a delay
      setTimeout(() => {
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
        clearMessages();
      }, 2000);
    })
    .catch((error) => {
      // Handle errors
      let errorMessage = 'An error occurred. Please try again.';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'This email is already in use.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
        case 'auth/weak-password':
          errorMessage = 'Password is too weak.';
          break;
      }
      
      showError(registerError, errorMessage);
    })
    .finally(() => {
      // Re-enable button
      registerBtn.disabled = false;
      registerBtn.textContent = 'Create Account';
    });
});

// Handle user login
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  
  // Disable button and show loading state
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging In...';
  
  // Sign in with Firebase Authentication
  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // User signed in successfully
      currentUser = userCredential.user;
      currentUserId = currentUser.uid;
      
      // Hide login page and show main app
      loginPage.style.display = 'none';
      mainApp.style.display = 'flex';
      
      // Initialize chat
      initChat();
    })
    .catch((error) => {
      // Handle errors
      let errorMessage = 'An error occurred. Please try again.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Invalid email address.';
          break;
      }
      
      showError(loginError, errorMessage);
    })
    .finally(() => {
      // Re-enable button
      loginBtn.disabled = false;
      loginBtn.textContent = 'Log In';
    });
});

// Handle logout
logoutButton.addEventListener('click', () => {
  auth.signOut()
    .then(() => {
      // User signed out successfully
      currentUser = null;
      currentUserId = null;
      
      // Show login page and hide main app
      mainApp.style.display = 'none';
      loginPage.style.display = 'flex';
      
      // Reset forms
      loginForm.reset();
      registerForm.reset();
      clearMessages();
    })
    .catch((error) => {
      console.error('Error signing out:', error);
    });
});

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
  if (user) {
    // User is signed in
    currentUser = user;
    currentUserId = user.uid;
    
    // Hide login page and show main app
    loginPage.style.display = 'none';
    mainApp.style.display = 'flex';
    
    // Initialize chat
    initChat();
  } else {
    // User is signed out
    currentUser = null;
    currentUserId = null;
    
    // Show login page and hide main app
    mainApp.style.display = 'none';
    loginPage.style.display = 'flex';
  }
});

// Helper functions for showing messages
function showError(element, message) {
  element.textContent = message;
  element.classList.add('show');
}

function showSuccess(element, message) {
  element.textContent = message;
  element.classList.add('show');
}

// Initialize chat after login
function initChat() {
  // Show loading animation
  showLoadingAnimation();
  
  // Load messages
  loadMessages();
  
  // Set chat header to public chat
  currentChatName.textContent = 'Public Chat';
  currentChatStatus.textContent = 'Online';
  
  // Initialize scroll management
  initScrollManagement();
}

// Initialize scroll management
function initScrollManagement() {
  // Add scroll event listener to detect user scrolling
  chatMessages.addEventListener('scroll', handleScroll);
}

// Handle scroll events
function handleScroll() {
  // Clear previous timer
  clearTimeout(scrollTimer);
  
  // Set flag that user is scrolling
  isUserScrolling = true;
  
  // Check if user is at the bottom of the chat
  const isAtBottom = isChatAtBottom();
  
  // If user is at the bottom, enable auto-scroll
  shouldAutoScroll = isAtBottom;
  
  // Set a timer to reset the scrolling flag after user stops scrolling
  scrollTimer = setTimeout(() => {
    isUserScrolling = false;
    
    // If user stopped scrolling near the bottom, enable auto-scroll
    if (isChatNearBottom()) {
      shouldAutoScroll = true;
      scrollToBottom();
    }
  }, 300);
}

// Check if chat is at the bottom
function isChatAtBottom() {
  const scrollTop = chatMessages.scrollTop;
  const scrollHeight = chatMessages.scrollHeight;
  const clientHeight = chatMessages.clientHeight;
  
  return scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
}

// Check if chat is near the bottom
function isChatNearBottom() {
  const scrollTop = chatMessages.scrollTop;
  const scrollHeight = chatMessages.scrollHeight;
  const clientHeight = chatMessages.clientHeight;
  
  return scrollTop + clientHeight >= scrollHeight - 100; // 100px from bottom
}

// Scroll to bottom of chat
function scrollToBottom() {
  if (shouldAutoScroll) {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}

// About modal functionality
aboutButton.addEventListener('click', () => {
  aboutModal.classList.add('show');
  isDropdownVisible = false;
  dropdownMenu.classList.remove('show');
});

modalClose.addEventListener('click', () => {
  aboutModal.classList.remove('show');
});

aboutModal.addEventListener('click', (e) => {
  if (e.target === aboutModal) {
    aboutModal.classList.remove('show');
  }
});

// Notification functionality
notificationClose.addEventListener('click', () => {
  notification.classList.remove('show');
});

function showNotification(title, message) {
  if (!isAppFocused) {
    notificationTitle.textContent = title;
    notificationMessage.textContent = message;
    notification.classList.add('show');
    
    // Auto hide after 5 seconds
    setTimeout(() => {
      notification.classList.remove('show');
    }, 5000);
  }
}

// Check if app is focused
window.addEventListener('focus', () => {
  isAppFocused = true;
  notification.classList.remove('show');
});

window.addEventListener('blur', () => {
  isAppFocused = false;
});

// Toggle emoji picker
emojiButton.addEventListener('click', (e) => {
  e.stopPropagation();
  isEmojiPickerVisible = !isEmojiPickerVisible;
  emojiPickerContainer.classList.toggle('show', isEmojiPickerVisible);
});

// Handle emoji selection
emojiPicker.addEventListener('emoji-click', (event) => {
  const emoji = event.detail.unicode;
  const input = messageInput;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  
  // Insert emoji at cursor position
  input.value = input.value.substring(0, start) + emoji + input.value.substring(end);
  
  // Move cursor to after the inserted emoji
  input.selectionStart = input.selectionEnd = start + emoji.length;
  
  // Focus back on input
  input.focus();
});

// Close emoji picker when clicking outside
document.addEventListener('click', (e) => {
  if (isEmojiPickerVisible && !emojiPickerContainer.contains(e.target) && e.target !== emojiButton) {
    isEmojiPickerVisible = false;
    emojiPickerContainer.classList.remove('show');
  }
});

// Close emoji picker when pressing Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && isEmojiPickerVisible) {
    isEmojiPickerVisible = false;
    emojiPickerContainer.classList.remove('show');
  }
});

// Typing indicator functionality
messageInput.addEventListener('input', () => {
  if (!isTyping) {
    isTyping = true;
    // Update typing status in Firebase
    database.ref('chats/' + defaultChatId + '/typing/' + currentUserId).set({
      user: currentUser.displayName || 'User',
      timestamp: Date.now()
    });
  }
  
  // Clear existing timeout
  clearTimeout(typingTimeout);
  
  // Set timeout to stop typing indicator after 2 seconds of inactivity
  typingTimeout = setTimeout(() => {
    isTyping = false;
    database.ref('chats/' + defaultChatId + '/typing/' + currentUserId).remove();
  }, 2000);
});

// Listen for typing indicators from other users
database.ref('chats/' + defaultChatId + '/typing').on('value', (snapshot) => {
  const typingData = snapshot.val();
  
  if (typingData) {
    // Get the most recent typing user
    const users = Object.keys(typingData);
    let mostRecentUser = null;
    let mostRecentTime = 0;
    
    users.forEach(userId => {
      if (userId !== currentUserId && typingData[userId].timestamp > mostRecentTime) {
        mostRecentUser = typingData[userId].user;
        mostRecentTime = typingData[userId].timestamp;
      }
    });
    
    if (mostRecentUser && Date.now() - mostRecentTime < 3000) {
      typingUser.textContent = mostRecentUser;
      typingIndicator.style.display = 'flex';
    } else {
      typingIndicator.style.display = 'none';
    }
  } else {
    typingIndicator.style.display = 'none';
  }
});

// Voice recording functionality
micButton.addEventListener('mousedown', startRecording);
micButton.addEventListener('touchstart', (e) => {
  e.preventDefault();
  startRecording();
});

micButton.addEventListener('mouseup', stopRecording);
micButton.addEventListener('touchend', (e) => {
  e.preventDefault();
  stopRecording();
});

sendRecordingBtn.addEventListener('click', sendRecording);
cancelRecordingBtn.addEventListener('click', cancelRecording);

async function startRecording() {
  if (isRecording) return;
  
  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Initialize MediaRecorder
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];
    
    // Collect audio data
    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };
    
    // Start recording
    mediaRecorder.start();
    isRecording = true;
    
    // Show recording UI
    voiceRecordingContainer.classList.add('show');
    
    // Start timer
    recordingStartTime = Date.now();
    updateRecordingTime();
    recordingTimer = setInterval(updateRecordingTime, 1000);
    
    // Change mic button appearance
    micButton.style.fill = '#ff3b30';
    
  } catch (error) {
    console.error('Error accessing microphone:', error);
    alert('Could not access microphone. Please check your permissions.');
  }
}

function stopRecording() {
  if (!isRecording) return;
  
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    
    // Stop all tracks
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
    
    isRecording = false;
    clearInterval(recordingTimer);
    
    // Reset mic button appearance
    micButton.style.fill = '';
  }
}

function updateRecordingTime() {
  const elapsedTime = Math.floor((Date.now() - recordingStartTime) / 1000);
  const minutes = Math.floor(elapsedTime / 60).toString().padStart(2, '0');
  const seconds = (elapsedTime % 60).toString().padStart(2, '0');
  recordingTime.textContent = `${minutes}:${seconds}`;
}

function sendRecording() {
  if (audioChunks.length === 0) {
    alert('No recording to send');
    voiceRecordingContainer.classList.remove('show');
    return;
  }
  
  // Create audio blob
  const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
  
  // Convert blob to base64 for Firebase storage
  const reader = new FileReader();
  reader.readAsDataURL(audioBlob);
  reader.onloadend = () => {
    const base64Audio = reader.result;
    const timestamp = Date.now();
    
    // Save audio message to Firebase
    const messageRef = database.ref('chats/' + defaultChatId + '/messages').push();
    messageRef.set({
      type: 'audio',
      audio: base64Audio,
      sender: currentUser.displayName || 'User',
      senderId: currentUserId,
      timestamp: timestamp,
      duration: Math.floor((Date.now() - recordingStartTime) / 1000)
    });
    
    // Hide recording UI
    voiceRecordingContainer.classList.remove('show');
    
    // Reset recording variables
    audioChunks = [];
  };
}

function cancelRecording() {
  // Stop recording if still active
  if (isRecording) {
    stopRecording();
  }
  
  // Hide recording UI
  voiceRecordingContainer.classList.remove('show');
  
  // Reset recording variables
  audioChunks = [];
}

// Format date for display
function formatDate(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Check if the date is today
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  }
  
  // Check if the date is yesterday
  if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  }
  
  // Check if the date is within the last week
  const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
  if (daysDiff < 7) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  
  // Otherwise, return the full date
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Format time for display
function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Load messages when page loads
function loadMessages() {
  // Show loading animation
  showLoadingAnimation();
  
  // Get messages from Firebase
  const messagesRef = database.ref('chats/' + defaultChatId + '/messages');
  
  messagesRef.on('value', (snapshot) => {
    // Hide loading animation
    hideLoadingAnimation();
    
    chatMessages.innerHTML = '';
    const messages = snapshot.val();
    
    if (messages) {
      // Group messages by date
      const messagesByDate = {};
      
      Object.keys(messages).forEach(key => {
        const message = messages[key];
        // Skip deleted messages
        if (message.isDeleted) return;
        
        const date = formatDate(message.timestamp);
        
        if (!messagesByDate[date]) {
          messagesByDate[date] = [];
        }
        
        messagesByDate[date].push({
          id: key,
          ...message
        });
      });
      
      // Sort dates chronologically
      const sortedDates = Object.keys(messagesByDate).sort((a, b) => {
        // Convert dates to timestamps for comparison
        const dateA = new Date(messagesByDate[a][0].timestamp);
        const dateB = new Date(messagesByDate[b][0].timestamp);
        return dateA - dateB;
      });
      
      // Display messages grouped by date
      sortedDates.forEach(date => {
        // Add date header
        const dateHeader = document.createElement('div');
        dateHeader.className = 'chat__main-date';
        dateHeader.textContent = date;
        chatMessages.appendChild(dateHeader);
        
        // Add messages for this date
        messagesByDate[date].forEach(message => {
          const isMe = message.senderId === currentUserId;
          if (message.type === 'audio') {
            addAudioMessageToChat(message, isMe);
          } else {
            addMessageToChat(message, isMe);
          }
        });
      });
    } else {
      // Show welcome message if no messages
      chatMessages.innerHTML = '<div class="chat__main-date">Today</div><div class="welcome-message">Welcome to the public chat! Start typing to send messages. 😊</div>';
    }
    
    // Scroll to bottom only if user is not actively scrolling
    if (!isUserScrolling) {
      scrollToBottom();
    }
  });
  
  // Listen for new messages to show notifications
  messagesRef.on('child_added', (snapshot) => {
    const message = snapshot.val();
    
    // Skip deleted messages
    if (message.isDeleted) return;
    
    // Only show notification for new messages (not when loading initial messages)
    if (message.timestamp > Date.now() - 1000 && message.senderId !== currentUserId) {
      if (message.type === 'audio') {
        showNotification('New Voice Message', `${message.sender} sent a voice message`);
      } else {
        showNotification('New Message', `${message.sender}: ${message.text.length > 50 ? message.text.substring(0, 50) + '...' : message.text}`);
      }
    }
    
    // Scroll to bottom if user is near the bottom
    if (isChatNearBottom()) {
      scrollToBottom();
    }
  });
  
  // Listen for message updates (like deletion)
  messagesRef.on('child_changed', (snapshot) => {
    const message = snapshot.val();
    const messageId = snapshot.key;
    
    if (message.isDeleted) {
      // Remove the message from UI
      const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
      if (messageElement) {
        messageElement.remove();
      }
    }
  });
  
  // Listen for message removal
  messagesRef.on('child_removed', (snapshot) => {
    const messageId = snapshot.key;
    // Remove the message from UI
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageElement) {
      messageElement.remove();
    }
  });
}

function addMessageToChat(message, isMe) {
  const messageEl = document.createElement('div');
  messageEl.className = `chat__main-msg ${isMe ? 'chat__main-msg-me' : 'chat__main-msg-user'}`;
  messageEl.dataset.messageId = message.id;
  
  const timeString = formatTime(message.timestamp);
  const dateString = formatDate(message.timestamp);
  
  let replySection = '';
  if (message.replyTo) {
    replySection = `
      <div class="reply-container" data-reply-id="${message.replyTo.id}">
        <div class="reply-sender">${message.replyTo.sender}</div>
        <div class="reply-text">${message.replyTo.text}</div>
      </div>
    `;
  }
  
  let reactionsSection = '';
  if (message.reactions && Object.keys(message.reactions).length > 0) {
    reactionsSection = createReactionsSection(message.reactions);
  }
  
  messageEl.innerHTML = `
    ${!isMe ? `<div style="font-size: 1.2rem; font-weight: 600; margin-bottom: 0.5rem;">${message.sender}</div>` : ''}
    ${replySection}
    ${message.text}
    ${reactionsSection}
    <div class="message-time">${timeString}</div>
    <div class="message-date">${dateString}</div>
  `;
  
  // Add event listeners for message options
  addMessageEventListeners(messageEl, message, isMe);
  
  chatMessages.appendChild(messageEl);
}

function addAudioMessageToChat(message, isMe) {
  const audioMessageEl = document.createElement('div');
  audioMessageEl.className = `audio-message ${isMe ? 'me' : ''}`;
  audioMessageEl.dataset.messageId = message.id;
  
  const timeString = formatTime(message.timestamp);
  const dateString = formatDate(message.timestamp);
  
  let reactionsSection = '';
  if (message.reactions && Object.keys(message.reactions).length > 0) {
    reactionsSection = createReactionsSection(message.reactions);
  }
  
  audioMessageEl.innerHTML = `
    <audio controls>
      <source src="${message.audio}" type="audio/webm">
      Your browser does not support the audio element.
    </audio>
    <div class="audio-duration">${formatDuration(message.duration)} • ${timeString}</div>
    ${reactionsSection}
    <div class="message-date">${dateString}</div>
  `;
  
  // Add event listeners for message options
  addMessageEventListeners(audioMessageEl, message, isMe);
  
  chatMessages.appendChild(audioMessageEl);
}

function addMessageEventListeners(messageEl, message, isMe) {
  // Long press for message options
  let pressTimer;
  
  messageEl.addEventListener('mousedown', (e) => {
    pressTimer = setTimeout(() => {
      showMessageOptions(messageEl, message, isMe, e.clientX, e.clientY);
    }, 500);
  });
  
  messageEl.addEventListener('mouseup', () => {
    clearTimeout(pressTimer);
  });
  
  messageEl.addEventListener('mouseleave', () => {
    clearTimeout(pressTimer);
  });
  
  // Touch events for mobile
  messageEl.addEventListener('touchstart', (e) => {
    pressTimer = setTimeout(() => {
      const touch = e.touches[0];
      showMessageOptions(messageEl, message, isMe, touch.clientX, touch.clientY);
    }, 500);
  });
  
  messageEl.addEventListener('touchend', () => {
    clearTimeout(pressTimer);
  });
  
  messageEl.addEventListener('touchmove', () => {
    clearTimeout(pressTimer);
  });
  
  // Click on reply to scroll to original message
  const replyContainer = messageEl.querySelector('.reply-container');
  if (replyContainer) {
    replyContainer.addEventListener('click', () => {
      const replyId = replyContainer.dataset.replyId;
      const originalMessage = document.querySelector(`[data-message-id="${replyId}"]`);
      if (originalMessage) {
        originalMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Highlight the original message briefly
        originalMessage.style.backgroundColor = 'rgba(4, 149, 136, 0.2)';
        setTimeout(() => {
          originalMessage.style.backgroundColor = '';
        }, 2000);
      }
    });
  }
}

function showMessageOptions(messageEl, message, isMe, x, y) {
  // Close any existing message options
  closeMessageOptions();
  
  // Create message options menu
  activeMessageOptions = document.createElement('div');
  activeMessageOptions.className = 'message-options show';
  activeMessageOptions.style.left = `${x}px`;
  activeMessageOptions.style.top = `${y}px`;
  
  // Add options
  const replyOption = document.createElement('button');
  replyOption.className = 'message-option';
  replyOption.textContent = 'Reply';
  replyOption.addEventListener('click', () => {
    replyToMessage(message);
    closeMessageOptions();
  });
  
  const reactOption = document.createElement('button');
  reactOption.className = 'message-option';
  reactOption.textContent = 'React';
  reactOption.addEventListener('click', () => {
    showReactionPicker(messageEl, message, x, y);
    closeMessageOptions();
  });
  
  activeMessageOptions.appendChild(replyOption);
  activeMessageOptions.appendChild(reactOption);
  
  // Add delete option for own messages
  if (isMe) {
    const deleteOption = document.createElement('button');
    deleteOption.className = 'message-option';
    deleteOption.textContent = 'Delete';
    deleteOption.addEventListener('click', () => {
      deleteMessage(message.id);
      closeMessageOptions();
    });
    activeMessageOptions.appendChild(deleteOption);
  }
  
  document.body.appendChild(activeMessageOptions);
  
  // Close menu when clicking outside
  setTimeout(() => {
    document.addEventListener('click', closeMessageOptionsOnClick);
  }, 10);
}

function closeMessageOptions() {
  if (activeMessageOptions) {
    activeMessageOptions.remove();
    activeMessageOptions = null;
  }
  document.removeEventListener('click', closeMessageOptionsOnClick);
}

function closeMessageOptionsOnClick(e) {
  if (activeMessageOptions && !activeMessageOptions.contains(e.target)) {
    closeMessageOptions();
  }
}

function showReactionPicker(messageEl, message, x, y) {
  // Close any existing reaction picker
  closeReactionPicker();
  
  // Create reaction picker
  activeReactionPicker = document.createElement('div');
  activeReactionPicker.className = 'reaction-picker show';
  activeReactionPicker.style.left = `${x}px`;
  activeReactionPicker.style.top = `${y}px`;
  
  // Add reaction options
  availableReactions.forEach(reaction => {
    const reactionOption = document.createElement('div');
    reactionOption.className = 'reaction-option';
    reactionOption.textContent = reaction;
    reactionOption.addEventListener('click', () => {
      addReaction(message.id, reaction);
      closeReactionPicker();
    });
    activeReactionPicker.appendChild(reactionOption);
  });
  
  document.body.appendChild(activeReactionPicker);
  
  // Close picker when clicking outside
  setTimeout(() => {
    document.addEventListener('click', closeReactionPickerOnClick);
  }, 10);
}

function closeReactionPicker() {
  if (activeReactionPicker) {
    activeReactionPicker.remove();
    activeReactionPicker = null;
  }
  document.removeEventListener('click', closeReactionPickerOnClick);
}

function closeReactionPickerOnClick(e) {
  if (activeReactionPicker && !activeReactionPicker.contains(e.target)) {
    closeReactionPicker();
  }
}

function replyToMessage(message) {
  replyingToMessage = message;
  
  // Show reply indicator
  const replyIndicator = document.createElement('div');
  replyIndicator.className = 'reply-indicator';
  replyIndicator.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
      <path d="M8.309 189.836L184.313 37.851C199.719 24.546 224 35.347 224 56.015v80.053c160.629 1.839 288 34.032 288 186.258 0 61.441-39.581 122.309-83.333 154.132-13.653 9.931-33.111-2.533-28.077-18.631 45.344-145.012-21.507-183.51-176.59-185.742V360c0 20.7-24.3 31.453-39.687 18.164l-176.004-152c-11.071-9.562-11.086-26.753 0-36.328z"/>
    </svg>
    Replying to ${message.sender}
  `;
  
  const closeButton = document.createElement('button');
  closeButton.textContent = '×';
  closeButton.style.background = 'none';
  closeButton.style.border = 'none';
  closeButton.style.fontSize = '1.6rem';
  closeButton.style.cursor = 'pointer';
  closeButton.style.marginLeft = 'auto';
  closeButton.addEventListener('click', () => {
    cancelReply();
  });
  
  replyIndicator.appendChild(closeButton);
  
  // Remove any existing reply indicator
  const existingIndicator = document.querySelector('.reply-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }
  
  // Add reply indicator before message input
  const chatAction = document.querySelector('.chat__action');
  chatAction.insertBefore(replyIndicator, messageInput);
  
  // Focus on message input
  messageInput.focus();
}

function cancelReply() {
  replyingToMessage = null;
  const replyIndicator = document.querySelector('.reply-indicator');
  if (replyIndicator) {
    replyIndicator.remove();
  }
}

function addReaction(messageId, reaction) {
  const messageRef = database.ref('chats/' + defaultChatId + '/messages/' + messageId + '/reactions/' + currentUserId);
  
  // Check if user already reacted with this emoji
  messageRef.once('value').then(snapshot => {
    if (snapshot.exists() && snapshot.val() === reaction) {
      // User already reacted with this emoji, remove the reaction
      messageRef.remove();
    } else {
      // Add or update the reaction
      messageRef.set(reaction);
    }
  });
}

// Delete message function - UPDATED TO WORK PROPERLY
function deleteMessage(messageId) {
  if (confirm('Are you sure you want to delete this message?')) {
    // Instead of removing from database, mark it as deleted
    // This preserves the message structure for replies
    database.ref('chats/' + defaultChatId + '/messages/' + messageId).update({
      isDeleted: true,
      text: '[This message was deleted]',
      type: 'deleted'
    }).then(() => {
      console.log('Message deleted successfully');
      // The message will be automatically removed from UI due to the listener in loadMessages
    }).catch((error) => {
      console.error('Error deleting message:', error);
      alert('Error deleting message. Please try again.');
    });
  }
}

function createReactionsSection(reactions) {
  // Count reactions by type
  const reactionCounts = {};
  Object.values(reactions).forEach(reaction => {
    reactionCounts[reaction] = (reactionCounts[reaction] || 0) + 1;
  });
  
  // Create reaction elements
  let reactionsHTML = '<div class="reactions-container">';
  Object.keys(reactionCounts).forEach(reaction => {
    const count = reactionCounts[reaction];
    reactionsHTML += `
      <div class="reaction">
        <span>${reaction}</span>
        <span class="reaction-count">${count}</span>
      </div>
    `;
  });
  reactionsHTML += '</div>';
  
  return reactionsHTML;
}

function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function sendMessage() {
  if (!messageInput.value.trim()) {
    alert('Please enter a message');
    return;
  }
  
  const messageText = messageInput.value.trim();
  const timestamp = Date.now();
  
  // Prepare message data
  const messageData = {
    text: messageText,
    sender: currentUser.displayName || 'User',
    senderId: currentUserId,
    timestamp: timestamp
  };
  
  // Add reply data if replying to a message
  if (replyingToMessage) {
    messageData.replyTo = {
      id: replyingToMessage.id,
      sender: replyingToMessage.sender,
      text: replyingToMessage.text || 'Voice message'
    };
  }
  
  // Save message to Firebase
  const messageRef = database.ref('chats/' + defaultChatId + '/messages').push();
  messageRef.set(messageData);
  
  // Clear input and reply state
  messageInput.value = '';
  cancelReply();
  
  // Clear typing indicator
  if (isTyping) {
    isTyping = false;
    database.ref('chats/' + defaultChatId + '/typing/' + currentUserId).remove();
  }
  
  // Scroll to bottom
  scrollToBottom();
}

// Event listeners for sending messages
sendButton.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

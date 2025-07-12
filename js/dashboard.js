// Dashboard functionality
import { auth, onAuthStateChanged } from './auth.js';
import { db } from './firebase-config.js';
import { collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, query, orderBy } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { updateProfile, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// Global variables
let currentUser = null;
let userTexts = [];

// DOM elements
const sidebar = document.getElementById('sidebar');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileMenuOverlay = document.getElementById('mobileMenuOverlay');
const darkModeToggle = document.getElementById('darkModeToggle');
const pageTitle = document.getElementById('pageTitle');

// Tab elements
const dashboardTab = document.getElementById('dashboardTab');
const uploadsTab = document.getElementById('uploadsTab');
const filesTab = document.getElementById('filesTab');
const sidebarSettingsBtn = document.getElementById('sidebarSettingsBtn');

// Content elements
const dashboardContent = document.getElementById('dashboardContent');
const uploadsContent = document.getElementById('uploadsContent');
const filesContent = document.getElementById('filesContent');
const settingsContent = document.getElementById('settingsContent');

// Text paste elements
const textPasteForm = document.getElementById('textPasteForm');
const textTitle = document.getElementById('textTitle');
const textContent = document.getElementById('textContent');
const charCount = document.getElementById('charCount');
const wordCount = document.getElementById('wordCount');
const saveTextBtn = document.getElementById('saveTextBtn');
const saveStatus = document.getElementById('saveStatus');
const saveStatusContent = document.getElementById('saveStatusContent');
const saveStatusIcon = document.getElementById('saveStatusIcon');
const saveStatusText = document.getElementById('saveStatusText');

// File list elements
const filesList = document.getElementById('filesList');
const refreshFiles = document.getElementById('refreshFiles');

// Quick action buttons
const quickUploadBtn = document.getElementById('quickUploadBtn');
const viewFilesBtn = document.getElementById('viewFilesBtn');
const settingsBtn = document.getElementById('settingsBtn');

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
    loadDarkModePreference();
});

// Authentication state observer
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        updateUserInfo(user);
        loadUserTexts();
        updateStats();
    } else {
        window.location.href = 'index.html';
    }
});

function initializeDashboard() {
    // Set initial active tab
    showTab('dashboard');
}

function setupEventListeners() {
    // Mobile menu toggle
    mobileMenuBtn?.addEventListener('click', toggleMobileMenu);
    mobileMenuOverlay?.addEventListener('click', closeMobileMenu);

    // Dark mode toggle
    darkModeToggle?.addEventListener('click', toggleDarkMode);

    // Navigation tabs
    dashboardTab?.addEventListener('click', () => showTab('dashboard'));
    uploadsTab?.addEventListener('click', () => showTab('uploads'));
    filesTab?.addEventListener('click', () => showTab('files'));
    sidebarSettingsBtn?.addEventListener('click', () => showTab('settings'));

    // Quick action buttons
    quickUploadBtn?.addEventListener('click', () => showTab('uploads'));
    viewFilesBtn?.addEventListener('click', () => showTab('files'));
    settingsBtn?.addEventListener('click', () => showTab('settings'));

    // Settings functionality
    setupSettingsEventListeners();

    // Text paste form
    textPasteForm?.addEventListener('submit', handleTextSubmit);
    textContent?.addEventListener('input', updateTextCounts);

    // Refresh files
    refreshFiles?.addEventListener('click', () => {
        console.log('Refresh button clicked');
        loadUserTexts();
    });
}

function toggleMobileMenu() {
    sidebar?.classList.toggle('-translate-x-full');
    mobileMenuOverlay?.classList.toggle('hidden');
}

function closeMobileMenu() {
    sidebar?.classList.add('-translate-x-full');
    mobileMenuOverlay?.classList.add('hidden');
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('darkMode', document.documentElement.classList.contains('dark'));
}

function loadDarkModePreference() {
    if (localStorage.getItem('darkMode') === 'true') {
        document.documentElement.classList.add('dark');
    }
}

function showTab(tabName) {
    // Hide all content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active', 'bg-blue-100', 'dark:bg-blue-900', 'text-blue-700', 'dark:text-blue-300');
    });

    // Show selected content and update nav
    switch(tabName) {
        case 'dashboard':
            dashboardContent?.classList.remove('hidden');
            dashboardTab?.classList.add('active', 'bg-blue-100', 'dark:bg-blue-900', 'text-blue-700', 'dark:text-blue-300');
            pageTitle.textContent = 'Dashboard';
            break;
        case 'uploads':
            uploadsContent?.classList.remove('hidden');
            uploadsTab?.classList.add('active', 'bg-blue-100', 'dark:bg-blue-900', 'text-blue-700', 'dark:text-blue-300');
            pageTitle.textContent = 'Paste Text';
            break;
        case 'files':
            filesContent?.classList.remove('hidden');
            filesTab?.classList.add('active', 'bg-blue-100', 'dark:bg-blue-900', 'text-blue-700', 'dark:text-blue-300');
            pageTitle.textContent = 'My Texts';
            loadUserTexts();
            break;
        case 'settings':
            settingsContent?.classList.remove('hidden');
            pageTitle.textContent = 'Settings';
            loadSettingsData();
            break;
    }

    // Close mobile menu if open
    closeMobileMenu();
}

function updateUserInfo(user) {
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    const userInitials = document.getElementById('userInitials');

    if (userName) userName.textContent = user.displayName || 'User';
    if (userEmail) userEmail.textContent = user.email;
    if (userInitials) {
        const name = user.displayName || user.email;
        userInitials.textContent = name.charAt(0).toUpperCase();
    }
}

// Text paste functionality
function handleTextSubmit(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showSaveStatus('Please log in to save text', 'error');
        return;
    }

    const title = textTitle.value.trim();
    const content = textContent.value.trim();

    if (!title || !content) {
        showSaveStatus('Please fill in both title and content', 'error');
        return;
    }

    saveText(title, content);
}

function updateTextCounts() {
    const content = textContent.value;
    const charCountValue = content.length;
    const wordCountValue = content.trim() ? content.trim().split(/\s+/).length : 0;
    
    charCount.textContent = `${charCountValue} characters`;
    wordCount.textContent = `${wordCountValue} words`;
}

function saveText(title, content) {
    if (!currentUser) return;

    // Disable save button
    saveTextBtn.disabled = true;
    saveTextBtn.innerHTML = `
        <svg class="animate-spin w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                </svg>
        Saving...
    `;

    const textData = {
        title: title,
        content: content,
        charCount: content.length,
        wordCount: content.trim() ? content.trim().split(/\s+/).length : 0,
                uploadTime: Date.now(),
                userId: currentUser.uid
            };

    // Save text data to Firestore
    const textsRef = collection(db, 'texts');
    addDoc(textsRef, textData)
        .then((docRef) => {
            console.log('Text saved successfully with ID:', docRef.id);
            showSaveStatus('Text saved successfully!', 'success');
            
            // Clear form
            textPasteForm.reset();
            updateTextCounts();
            
            // Refresh texts list and stats
            loadUserTexts();
            updateStats();
            addRecentActivity(`Saved text: ${title}`);
        })
        .catch((error) => {
            console.error('Error saving text to Firestore:', error);
            showSaveStatus('Error saving text. Please try again.', 'error');
        })
        .finally(() => {
            // Re-enable save button
            saveTextBtn.disabled = false;
            saveTextBtn.innerHTML = `
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Save Text
            `;
        });
}

function showSaveStatus(message, type) {
    saveStatus.className = `mt-6 p-4 rounded-lg ${type === 'success' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'}`;
    
    saveStatusIcon.innerHTML = type === 'success' 
        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>';
    
    saveStatusText.textContent = message;
    saveStatus.classList.remove('hidden');

    // Hide status after 3 seconds
    setTimeout(() => {
        saveStatus.classList.add('hidden');
    }, 3000);
}

function loadUserTexts() {
    console.log('loadUserTexts called, currentUser:', currentUser);
    if (!currentUser) {
        console.log('No current user, returning');
        return;
    }

    const textsRef = collection(db, 'texts');
    console.log('Created texts collection reference');
    
    const q = query(textsRef, orderBy('uploadTime', 'desc'));
    console.log('Created query with ordering');
    
    onSnapshot(q, (snapshot) => {
        console.log('Snapshot received, docs count:', snapshot.docs.length);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log('All texts from Firestore:', data);
        
        // Filter texts for current user
        userTexts = data.filter(text => text.userId === currentUser.uid);
        console.log('Filtered texts for current user:', userTexts);
        console.log('Current user ID:', currentUser.uid);
        
        displayTexts();
        updateStats();
    }, (error) => {
        console.error('Error loading texts:', error);
        // If permission denied, try without ordering
        if (error.code === 'permission-denied') {
            console.log('Trying without ordering...');
            const simpleQuery = query(textsRef);
            onSnapshot(simpleQuery, (snapshot) => {
                console.log('Simple query snapshot, docs count:', snapshot.docs.length);
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                console.log('All texts from simple query:', data);
                userTexts = data.filter(text => text.userId === currentUser.uid);
                console.log('Filtered texts from simple query:', userTexts);
                displayTexts();
                updateStats();
            });
        }
    });
}

function displayTexts() {
    console.log('displayTexts called, filesList element:', filesList);
    console.log('userTexts array:', userTexts);
    
    if (!filesList) {
        console.error('filesList element not found!');
        return;
    }

    if (userTexts.length === 0) {
        console.log('No texts to display, showing empty state');
        filesList.innerHTML = `
            <div class="text-center py-12">
                <svg class="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                <h4 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">No texts saved yet</h4>
                <p class="text-gray-500 dark:text-gray-400">Start by pasting your first text</p>
            </div>
        `;
        return;
    }

    filesList.innerHTML = userTexts.map(text => `
        <div class="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all duration-300">
            <div class="flex items-center flex-1">
                <div class="w-10 h-10 bg-blue-500 bg-opacity-20 rounded-lg flex items-center justify-center mr-4">
                    <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                </div>
                <div class="flex-1 min-w-0">
                    <h4 class="text-sm font-medium text-gray-900 dark:text-white truncate">${text.title}</h4>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                        ${text.charCount} characters • ${text.wordCount} words • ${formatDate(text.uploadTime)}
                    </p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">${text.content.substring(0, 100)}${text.content.length > 100 ? '...' : ''}</p>
                </div>
            </div>
            <div class="flex items-center space-x-2 ml-4">
                <button onclick="viewText('${text.id}')" 
                        class="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900 dark:hover:bg-opacity-20 rounded-lg transition-all duration-300"
                        title="View full text">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                    </svg>
                </button>
                <button onclick="copyText('${text.content}')" 
                        class="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900 dark:hover:bg-opacity-20 rounded-lg transition-all duration-300"
                        title="Copy text">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                    </svg>
                </button>
                <button onclick="deleteText('${text.id}')" 
                        class="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 dark:hover:bg-opacity-20 rounded-lg transition-all duration-300"
                        title="Delete text">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

function updateStats() {
    const totalFilesElement = document.getElementById('totalFiles');
    const storageUsedElement = document.getElementById('storageUsed');
    const recentUploadsElement = document.getElementById('recentUploads');

    if (totalFilesElement) totalFilesElement.textContent = userTexts.length;
    
    if (storageUsedElement) {
        const totalChars = userTexts.reduce((sum, text) => sum + (text.charCount || 0), 0);
        storageUsedElement.textContent = totalChars.toLocaleString() + ' chars';
    }

    if (recentUploadsElement) {
        const recentCount = userTexts.filter(text => 
            Date.now() - text.uploadTime < 24 * 60 * 60 * 1000
        ).length;
        recentUploadsElement.textContent = recentCount;
    }
}

function addRecentActivity(activity) {
    const recentActivity = document.getElementById('recentActivity');
    if (!recentActivity) return;

    const activityItem = document.createElement('div');
    activityItem.className = 'flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg fade-in';
    activityItem.innerHTML = `
        <div class="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg>
        </div>
        <div class="ml-3">
            <p class="text-sm font-medium text-gray-900 dark:text-white">${activity}</p>
            <p class="text-xs text-gray-500 dark:text-gray-400">Just now</p>
        </div>
    `;

    recentActivity.insertBefore(activityItem, recentActivity.firstChild);

    // Keep only the last 5 activities
    while (recentActivity.children.length > 5) {
        recentActivity.removeChild(recentActivity.lastChild);
    }
}

// Utility functions
function formatDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
}

// Global functions for text operations
window.viewText = function(textId) {
    const text = userTexts.find(t => t.id === textId);
    if (!text) return;

    // Create modal to show full text
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
    modal.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">${text.title}</h3>
                <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>
            <div class="p-6 overflow-y-auto max-h-[60vh]">
                <div class="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">${text.content}</div>
            </div>
            <div class="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                <div class="text-sm text-gray-500 dark:text-gray-400">
                    ${text.charCount} characters • ${text.wordCount} words • ${formatDate(text.uploadTime)}
                </div>
                <button onclick="copyText('${text.content.replace(/'/g, "\\'")}'); this.closest('.fixed').remove()" 
                        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-all duration-300">
                    Copy Text
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
};

window.copyText = function(content) {
    navigator.clipboard.writeText(content).then(() => {
        // Show a temporary success message
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
        toast.textContent = 'Text copied to clipboard!';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = content;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50';
        toast.textContent = 'Text copied to clipboard!';
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 2000);
    });
};

window.deleteText = async function(textId) {
    if (!confirm('Are you sure you want to delete this text? This action cannot be undone.')) {
        return;
    }

    try {
        // Delete from Firestore
        const dbRef = doc(db, 'texts', textId);
        await deleteDoc(dbRef);

        addRecentActivity('Deleted a text');
    } catch (error) {
        console.error('Error deleting text:', error);
        alert('Error deleting text. Please try again.');
    }
};

// Debug function - can be called from browser console
window.debugTexts = function() {
    console.log('=== DEBUG INFO ===');
    console.log('Current user:', currentUser);
    console.log('User texts array:', userTexts);
    console.log('Files list element:', filesList);
    console.log('Refresh button element:', refreshFiles);
    
    if (currentUser) {
        console.log('Loading texts manually...');
        loadUserTexts();
    } else {
        console.log('No current user found');
    }
};

// Settings functionality
function setupSettingsEventListeners() {
    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    // Password form
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', handlePasswordChange);
    }

    // Export data button
    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', handleExportData);
    }

    // Delete account button
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', handleDeleteAccount);
    }

    // Password strength checker
    const newPassword = document.getElementById('newPassword');
    if (newPassword) {
        newPassword.addEventListener('input', checkPasswordStrength);
    }
}

function loadSettingsData() {
    if (!currentUser) return;

    // Load profile data
    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileInitials = document.getElementById('profileInitials');
    const displayName = document.getElementById('displayName');
    const email = document.getElementById('email');
    const memberSince = document.getElementById('memberSince');

    if (profileName) profileName.textContent = currentUser.displayName || 'User';
    if (profileEmail) profileEmail.textContent = currentUser.email;
    if (profileInitials) {
        const name = currentUser.displayName || currentUser.email;
        profileInitials.textContent = name.charAt(0).toUpperCase();
    }
    if (displayName) displayName.value = currentUser.displayName || '';
    if (email) email.value = currentUser.email;
    if (memberSince) {
        const creationTime = currentUser.metadata?.creationTime;
        if (creationTime) {
            const year = new Date(creationTime).getFullYear();
            memberSince.textContent = year;
        } else {
            memberSince.textContent = '2024';
        }
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showSettingsStatus('Please log in to update profile', 'error');
        return;
    }

    const displayName = document.getElementById('displayName').value.trim();
    
    if (!displayName) {
        showSettingsStatus('Display name cannot be empty', 'error');
        return;
    }

    try {
        // Update profile in Firebase Auth
        await updateProfile(currentUser, {
            displayName: displayName
        });

        // Update UI
        updateUserInfo(currentUser);
        loadSettingsData();
        
        showSettingsStatus('Profile updated successfully!', 'success');
    } catch (error) {
        console.error('Profile update error:', error);
        showSettingsStatus('Failed to update profile. Please try again.', 'error');
    }
}

async function handlePasswordChange(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showSettingsStatus('Please log in to change password', 'error');
        return;
    }

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!currentPassword || !newPassword || !confirmPassword) {
        showSettingsStatus('Please fill in all password fields', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showSettingsStatus('New passwords do not match', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showSettingsStatus('Password must be at least 6 characters long', 'error');
        return;
    }

    try {
        // Re-authenticate user before password change
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        
        // Change password
        await updatePassword(currentUser, newPassword);
        
        // Clear form
        e.target.reset();
        
        showSettingsStatus('Password changed successfully!', 'success');
    } catch (error) {
        console.error('Password change error:', error);
        
        let errorMessage = 'Failed to change password. Please try again.';
        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Current password is incorrect';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'New password is too weak';
        }
        
        showSettingsStatus(errorMessage, 'error');
    }
}

function checkPasswordStrength() {
    const password = document.getElementById('newPassword').value;
    const strengthBar = document.getElementById('passwordStrength');
    const strengthText = document.getElementById('passwordStrengthText');
    
    if (!password) {
        strengthBar.style.width = '0%';
        strengthBar.className = 'h-full bg-red-500 transition-all duration-300';
        strengthText.textContent = 'Password strength: Very weak';
        return;
    }

    let strength = 0;
    let color = 'bg-red-500';
    let text = 'Very weak';

    // Length check
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 25;

    // Character variety checks
    if (/[a-z]/.test(password)) strength += 10;
    if (/[A-Z]/.test(password)) strength += 10;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;

    // Strength assessment
    if (strength >= 80) {
        color = 'bg-green-500';
        text = 'Strong';
    } else if (strength >= 60) {
        color = 'bg-yellow-500';
        text = 'Good';
    } else if (strength >= 40) {
        color = 'bg-orange-500';
        text = 'Fair';
    } else {
        color = 'bg-red-500';
        text = 'Weak';
    }

    strengthBar.style.width = strength + '%';
    strengthBar.className = `h-full ${color} transition-all duration-300`;
    strengthText.textContent = `Password strength: ${text}`;
}

async function handleExportData() {
    if (!currentUser) {
        showSettingsStatus('Please log in to export data', 'error');
        return;
    }

    try {
        // Get user texts from Firestore
        const textsRef = collection(db, 'texts');
        const q = query(textsRef, orderBy('uploadTime', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const userTexts = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.userId === currentUser.uid) {
                userTexts.push({
                    id: doc.id,
                    title: data.title,
                    content: data.content,
                    uploadTime: data.uploadTime.toDate().toISOString(),
                    charCount: data.charCount,
                    wordCount: data.wordCount
                });
            }
        });

        // Create export data
        const exportData = {
            user: {
                email: currentUser.email,
                displayName: currentUser.displayName,
                exportDate: new Date().toISOString()
            },
            texts: userTexts
        };

        // Create and download file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `texthub-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showSettingsStatus('Data exported successfully!', 'success');
    } catch (error) {
        console.error('Export error:', error);
        showSettingsStatus('Failed to export data. Please try again.', 'error');
    }
}

async function handleDeleteAccount() {
    if (!currentUser) {
        showSettingsStatus('Please log in to delete account', 'error');
        return;
    }

    const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.');
    
    if (!confirmed) return;

    try {
        // Delete user texts from Firestore
        const textsRef = collection(db, 'texts');
        const q = query(textsRef, orderBy('uploadTime', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const deletePromises = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.userId === currentUser.uid) {
                deletePromises.push(deleteDoc(doc.ref));
            }
        });

        await Promise.all(deletePromises);

        // Delete user account
        await deleteUser(currentUser);

        showSettingsStatus('Account deleted successfully. Redirecting to login...', 'success');
        
        // Redirect to login page
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    } catch (error) {
        console.error('Delete account error:', error);
        showSettingsStatus('Failed to delete account. Please try again.', 'error');
    }
}

function showSettingsStatus(message, type) {
    const statusDiv = document.getElementById('settingsStatus');
    const statusContent = document.getElementById('settingsStatusContent');
    const statusIcon = document.getElementById('settingsStatusIcon');
    const statusText = document.getElementById('settingsStatusText');

    if (!statusDiv || !statusContent || !statusIcon || !statusText) return;

    // Set message and icon
    statusText.textContent = message;
    
    if (type === 'success') {
        statusContent.className = 'p-4 rounded-lg bg-green-100 dark:bg-green-900 dark:bg-opacity-20 border border-green-500 text-green-700 dark:text-green-300';
        statusIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>';
    } else {
        statusContent.className = 'p-4 rounded-lg bg-red-100 dark:bg-red-900 dark:bg-opacity-20 border border-red-500 text-red-700 dark:text-red-300';
        statusIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>';
    }

    // Show status
    statusDiv.classList.remove('hidden');

    // Auto-hide after 5 seconds
    setTimeout(() => {
        statusDiv.classList.add('hidden');
    }, 5000);
}

// Global function for password visibility toggle
window.togglePasswordVisibility = function(inputId) {
    const input = document.getElementById(inputId);
    const button = input.nextElementSibling;
    const icon = button.querySelector('svg');
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"></path>';
    } else {
        input.type = 'password';
        icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>';
    }
};


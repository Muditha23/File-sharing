// Authentication module
import { auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';

// Utility functions
function showMessage(elementId, message, isError = false) {
    const messageElement = document.getElementById(elementId);
    const textElement = document.getElementById(elementId.replace('Message', 'Text'));
    
    if (messageElement && textElement) {
        textElement.textContent = message;
        messageElement.classList.remove('hidden');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageElement.classList.add('hidden');
        }, 5000);
    }
}

function hideMessage(elementId) {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.classList.add('hidden');
    }
}

function setLoading(buttonId, spinnerId, textId, isLoading, loadingText = 'Loading...', normalText = 'Submit') {
    const button = document.getElementById(buttonId);
    const spinner = document.getElementById(spinnerId);
    const text = document.getElementById(textId);
    
    if (button && spinner && text) {
        button.disabled = isLoading;
        spinner.classList.toggle('hidden', !isLoading);
        text.textContent = isLoading ? loadingText : normalText;
        
        if (isLoading) {
            button.classList.add('opacity-75', 'cursor-not-allowed');
        } else {
            button.classList.remove('opacity-75', 'cursor-not-allowed');
        }
    }
}

// Check if user is already authenticated
onAuthStateChanged(auth, (user) => {
    const currentPage = window.location.pathname;
    
    if (user) {
        // User is signed in
        if (currentPage.includes('index.html') || currentPage.includes('signup.html') || currentPage === '/') {
            // Redirect to dashboard if on login/signup page
            window.location.href = 'dashboard.html';
        }
    } else {
        // User is signed out
        if (currentPage.includes('dashboard.html')) {
            // Redirect to login if on dashboard page
            window.location.href = 'index.html';
        }
    }
});

// Login functionality
if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        // Hide any existing messages
        hideMessage('errorMessage');
        hideMessage('successMessage');
        
        // Set loading state
        setLoading('loginBtn', 'loginSpinner', 'loginBtnText', true, 'Signing In...', 'Sign In');
        
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            showMessage('successMessage', 'Login successful! Redirecting to dashboard...');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'An error occurred during login.';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'No account found with this email address.';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Incorrect password. Please try again.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address format.';
                    break;
                case 'auth/user-disabled':
                    errorMessage = 'This account has been disabled.';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Too many failed attempts. Please try again later.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            showMessage('errorMessage', errorMessage, true);
        } finally {
            setLoading('loginBtn', 'loginSpinner', 'loginBtnText', false, 'Signing In...', 'Sign In');
        }
    });
}

// Signup functionality
if (document.getElementById('signupForm')) {
    const signupForm = document.getElementById('signupForm');
    
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const agreeTerms = document.getElementById('agreeTerms').checked;
        
        // Hide any existing messages
        hideMessage('errorMessage');
        hideMessage('successMessage');
        
        // Validation
        if (password !== confirmPassword) {
            showMessage('errorMessage', 'Passwords do not match.', true);
            return;
        }
        
        if (password.length < 6) {
            showMessage('errorMessage', 'Password must be at least 6 characters long.', true);
            return;
        }
        
        if (!agreeTerms) {
            showMessage('errorMessage', 'Please agree to the Terms of Service and Privacy Policy.', true);
            return;
        }
        
        // Set loading state
        setLoading('signupBtn', 'signupSpinner', 'signupBtnText', true, 'Creating Account...', 'Create Account');
        
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // Update user profile with display name
            await updateProfile(user, {
                displayName: fullName
            });
            
            showMessage('successMessage', 'Account created successfully! Redirecting to dashboard...');
            
            // Redirect to dashboard after a short delay
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
            
        } catch (error) {
            console.error('Signup error:', error);
            
            let errorMessage = 'An error occurred during account creation.';
            
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'An account with this email already exists.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Invalid email address format.';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'Password is too weak. Please choose a stronger password.';
                    break;
                case 'auth/network-request-failed':
                    errorMessage = 'Network error. Please check your connection.';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            showMessage('errorMessage', errorMessage, true);
        } finally {
            setLoading('signupBtn', 'signupSpinner', 'signupBtnText', false, 'Creating Account...', 'Create Account');
        }
    });
}

// Logout functionality (for dashboard)
window.logout = async function() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        alert('Error signing out. Please try again.');
    }
};

// Export auth state observer for dashboard
export { auth, onAuthStateChanged };


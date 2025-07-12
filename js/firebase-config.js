// Firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';

// Your Firebase configuration
// Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAG8TiretbYNaJyM7TgsYgWHCVnvQ1zPn0",
  authDomain: "file-uploading-54ab4.firebaseapp.com",
  projectId: "file-uploading-54ab4",
  storageBucket: "file-uploading-54ab4.firebasestorage.app",
  messagingSenderId: "115134517516",
  appId: "1:115134517516:web:38b843c9992916f139b929",
  measurementId: "G-LJSH37ESY1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;


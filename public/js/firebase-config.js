// Firebase Web SDK (client-side only)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
    sendPasswordResetEmail // ✅ Import this to fix the forgot password error
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

// Firebase Config (use yours from console)
const firebaseConfig = {
    apiKey: "AIzaSyDeyUv4Hz0IIkM7bUiGJTbzbUo_PDBuKNI",
    authDomain: "wpg-wallet.firebaseapp.com",
    projectId: "wpg-wallet",
    storageBucket: "wpg-wallet.firebasestorage.app",
    messagingSenderId: "192738020602",
    appId: "1:192738020602:web:ffda92160332c628640d43",
    measurementId: "G-E9CYD0PJ7Q"
};

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ✅ Export all required methods
export {
    auth,
    provider,
    signInWithEmailAndPassword,
    signOut,
    createUserWithEmailAndPassword,
    signInWithPopup,
    sendPasswordResetEmail // ✅ This export resolves the module error
};

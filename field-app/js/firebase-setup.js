// ⚠️ REPLACE THIS WITH YOUR FIREBASE CONFIGURATION
// Get this from: Firebase Console > Project Settings > General > Your Apps > Web App
const firebaseConfig = {
    apiKey: "AIzaSyDDlmmftmXOBbu7MdMbYA5oX_Q90nBj6K8",
    authDomain: "projectaegis-da009.firebaseapp.com",
    projectId: "projectaegis-da009",
    storageBucket: "projectaegis-da009.firebasestorage.app",
    messagingSenderId: "969784883380",
    appId: "1:969784883380:web:4966f4586b6e831a84ffe1",
    measurementId: "G-6N32C6F51D"
};

// Initialize Firebase
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    console.log('🔥 Firebase initialized');
} else {
    console.error('❌ Firebase SDK not loaded');
}

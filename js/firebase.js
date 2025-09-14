// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBl9LzOTxaxWAPEf5P_WLv0lNCVj5fF9EY",
  authDomain: "efeito-326e7.firebaseapp.com",
  projectId: "efeito-326e7",
  storageBucket: "efeito-326e7.appspot.com",
  messagingSenderId: "194059742548",
  appId: "1:194059742548:web:57333237e517db13ab6cc1",
  measurementId: "G-SH1SHDTQR0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Cloud Storage and get a reference to the service
const storage = getStorage(app);

// Export db, auth, and storage to be used in other files
export { db, auth, storage };

import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Import the functions you need from the SDKs you need

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBsqPvCoIEJh1ABVDd7JBMyqnr3kmK6AEQ",
  authDomain: "fintracker-tejas.firebaseapp.com",
  projectId: "fintracker-tejas",
  storageBucket: "fintracker-tejas.firebasestorage.app",
  messagingSenderId: "415057358512",
  appId: "1:415057358512:web:d5c01afb3725326f329575"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
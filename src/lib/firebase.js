// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCBdWizhEhesPGlU3zz7pD1I6ro11M7T_4",
  authDomain: "turnero-app-e4e5d.firebaseapp.com",
  projectId: "turnero-app-e4e5d",
  storageBucket: "turnero-app-e4e5d.firebasestorage.app",
  messagingSenderId: "189565722264",
  appId: "1:189565722264:web:9e79a89335652597677aed"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

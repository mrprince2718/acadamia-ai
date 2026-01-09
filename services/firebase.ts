
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCp5PlXH6k0XXZF_N3IvrHpCnF5ryY_sgw",
  authDomain: "mira-ai-tz12j.firebaseapp.com",
  projectId: "mira-ai-tz12j",
  storageBucket: "mira-ai-tz12j.firebasestorage.app",
  messagingSenderId: "1034759838165",
  appId: "1:1034759838165:web:bddf2a9b4b90fe7756055c"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

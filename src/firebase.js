import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCXH7xOoTGcSwEWn9ihelfxX3FjNsm2WPU",
  authDomain: "moneyhome-7229a.firebaseapp.com",
  projectId: "moneyhome-7229a",
  storageBucket: "moneyhome-7229a.firebasestorage.app",
  messagingSenderId: "1023065370664",
  appId: "1:1023065370664:web:f15d18e0b22238ac06051d",
  measurementId: "G-XSQKMET64L"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

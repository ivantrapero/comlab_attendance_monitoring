import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAMc-j60fXW6pZTtxCH_dnEtL4_pjut308",
  authDomain: "comlab-attendance-monitoring.firebaseapp.com",
  projectId: "comlab-attendance-monitoring",
  storageBucket: "comlab-attendance-monitoring.firebasestorage.app",
  messagingSenderId: "1037728171377",
  appId: "1:1037728171377:web:98be213960a33c487fbbb5",
  measurementId: "G-84Z52M6LGF",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
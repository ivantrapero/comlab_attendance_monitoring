import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

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

if (import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY) {
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_V3_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (error) {
    console.warn("App Check initialization failed:", error);
  }
} else {
  console.warn("App Check is not enabled because VITE_RECAPTCHA_V3_SITE_KEY is missing.");
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;
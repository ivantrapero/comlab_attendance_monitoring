import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { auth } from "./firebase";

export const normalizeAccountRole = (role) => {
  const value = String(role || "Working").trim().toLowerCase();

  if (["working", "staff", "employee", "worker"].includes(value)) {
    return "Working";
  }

  if (["admin", "administrator", "superadmin", "owner"].includes(value)) {
    return "Administrator";
  }

  return "Working";
};

export const persistRoleCache = (firebaseUser, role) => {
  if (!firebaseUser) {
    return;
  }

  const normalizedRole = normalizeAccountRole(role);
  const uid = firebaseUser?.uid ? String(firebaseUser.uid) : "";
  const normalizedEmail = (firebaseUser?.email || "").trim().toLowerCase();

  if (uid) {
    localStorage.setItem(`comlab-role-${uid}`, normalizedRole);
  }

  if (normalizedEmail) {
    localStorage.setItem(`comlab-role-email-${normalizedEmail}`, normalizedRole);
    localStorage.setItem(`comlab-role-${normalizedEmail}`, normalizedRole);
  }
};

export const loginUser = async (email, password) => {
  return await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
};

export const syncUserProfile = async (firebaseUser, roleOverride = null) => {
  if (!firebaseUser) {
    return null;
  }

  const desiredRole = normalizeAccountRole(
    roleOverride ||
      localStorage.getItem(`comlab-role-${firebaseUser.uid}`) ||
      localStorage.getItem(
        `comlab-role-email-${(firebaseUser.email || "").trim().toLowerCase()}`,
      ) ||
      "Working",
  );

  const normalizedEmail = (firebaseUser.email || "").trim().toLowerCase();
  const profileName = firebaseUser.displayName || "New User";

  persistRoleCache(firebaseUser, desiredRole);

  return {
    uid: firebaseUser.uid,
    name: profileName,
    email: normalizedEmail,
    role: desiredRole,
    updatedAt: new Date().toISOString(),
  };
};

export const logoutUser = async () => {
  return await signOut(auth);
};

export const listenToAuth = (callback) => {
  return onAuthStateChanged(auth, callback);
};
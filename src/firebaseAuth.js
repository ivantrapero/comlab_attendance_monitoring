import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

import {
  doc,
  getDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "./firebase";

export const DEVELOPER_EMAIL =
  "ivantrapero123@gmail.com";

export const isDeveloperEmail = (
  email,
) => {
  return (
    String(email || "")
      .trim()
      .toLowerCase() ===
    DEVELOPER_EMAIL.toLowerCase()
  );
};

export const normalizeAccountRole = (
  role,
  email = "",
) => {
  const value = String(
    role || "",
  )
    .trim()
    .toLowerCase();

  /*
   * DEVELOPER ALWAYS WINS.
   */
  if (
    isDeveloperEmail(email) ||
    value === "developer" ||
    value === "dev"
  ) {
    return "Developer";
  }

  /*
   * Administrator roles.
   */
  if (
    value ===
      "administrator" ||
    value === "admin"
  ) {
    return "Administrator";
  }

  /*
   * Working/staff roles.
   */
  if (
    value === "working" ||
    value === "staff" ||
    value === "employee" ||
    value === "worker"
  ) {
    return "Working";
  }

  return "Administrator";
};

export const getUserRole = (
  user,
) => {
  if (!user) {
    return null;
  }

  return normalizeAccountRole(
    user.role,
    user.email,
  );
};

export const isDeveloper = (
  user,
) => {
  return (
    getUserRole(user) ===
    "Developer"
  );
};

export const isAdministrator = (
  user,
) => {
  return (
    getUserRole(user) ===
    "Administrator"
  );
};

export const canWriteBugReport = (
  user,
) => {
  return isAdministrator(
    user,
  );
};

export const canViewBugReports = (
  user,
) => {
  return isDeveloper(user);
};

export const persistRoleCache = (
  firebaseUser,
  role,
) => {
  if (!firebaseUser) {
    return;
  }

  const normalizedRole =
    normalizeAccountRole(
      role,
      firebaseUser.email,
    );

  const uid =
    firebaseUser.uid
      ? String(
          firebaseUser.uid,
        )
      : "";

  const normalizedEmail = (
    firebaseUser.email ||
    ""
  )
    .trim()
    .toLowerCase();

  if (uid) {
    localStorage.setItem(
      `comlab-role-${uid}`,
      normalizedRole,
    );
  }

  if (normalizedEmail) {
    localStorage.setItem(
      `comlab-role-email-${normalizedEmail}`,
      normalizedRole,
    );

    localStorage.setItem(
      `comlab-role-${normalizedEmail}`,
      normalizedRole,
    );
  }
};

export const loginUser = async (
  email,
  password,
) => {
  return await signInWithEmailAndPassword(
    auth,
    email,
    password,
  );
};

export const syncUserProfile =
  async (
    firebaseUser,
    roleOverride = null,
  ) => {
    if (!firebaseUser) {
      return null;
    }

    const normalizedEmail = (
      firebaseUser.email ||
      ""
    )
      .trim()
      .toLowerCase();

    /*
     * The developer email always
     * receives Developer role.
     */
    if (
      isDeveloperEmail(
        normalizedEmail,
      )
    ) {
      persistRoleCache(
        firebaseUser,
        "Developer",
      );

      return {
        uid: firebaseUser.uid,
        username:
          normalizedEmail,
        name:
          firebaseUser.displayName ||
          "Developer",
        email:
          normalizedEmail,
        role: "Developer",
        updatedAt:
          new Date().toISOString(),
      };
    }

    /*
     * Try to read the user's
     * Firestore profile.
     */
    let firestoreRole =
      null;

    let firestoreName =
      null;

    try {
      const userRef = doc(
        db,
        "users",
        firebaseUser.uid,
      );

      const userSnapshot =
        await getDoc(
          userRef,
        );

      if (
        userSnapshot.exists()
      ) {
        const userData =
          userSnapshot.data();

        firestoreRole =
          userData.role ||
          null;

        firestoreName =
          userData.name ||
          null;
      }
    } catch (error) {
      console.warn(
        "Unable to load Firestore user profile:",
        error,
      );
    }

    /*
     * Existing cached role.
     */
    const cachedRole =
      localStorage.getItem(
        `comlab-role-${firebaseUser.uid}`,
      ) ||
      localStorage.getItem(
        `comlab-role-email-${normalizedEmail}`,
      );

    const existingRole =
      roleOverride ||
      firestoreRole ||
      cachedRole ||
      "Administrator";

    const desiredRole =
      normalizeAccountRole(
        existingRole,
        normalizedEmail,
      );

    const profileName =
      firestoreName ||
      firebaseUser.displayName ||
      "Administrator";

    persistRoleCache(
      firebaseUser,
      desiredRole,
    );

    return {
      uid: firebaseUser.uid,
      username:
        normalizedEmail,
      name: profileName,
      email:
        normalizedEmail,
      role: desiredRole,
      updatedAt:
        new Date().toISOString(),
    };
  };

export const logoutUser =
  async () => {
    return await signOut(auth);
  };

export const listenToAuth = (
  callback,
) => {
  return onAuthStateChanged(
    auth,
    callback,
  );
};
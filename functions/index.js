import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

admin.initializeApp();

const getCallerRole = async (uid) => {
  const user = await admin.auth().getUser(uid);
  const claims = user.customClaims || {};
  return {
    user,
    isAdmin: Boolean(claims.admin) || user.email === "admin@comlab.edu",
    role: claims.role || (user.email === "admin@comlab.edu" ? "admin" : "staff"),
  };
};

export const getCurrentUserProfile = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const { user, isAdmin, role } = await getCallerRole(request.auth.uid);

  return {
    uid: user.uid,
    email: user.email || "",
    role: isAdmin ? "admin" : role,
    isAdmin,
  };
});

export const setAdminClaim = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const { email, role = "admin" } = request.data || {};

  if (!email) {
    throw new HttpsError("invalid-argument", "An email address is required.");
  }

  const caller = await getCallerRole(request.auth.uid);

  if (!caller.isAdmin) {
    throw new HttpsError("permission-denied", "Only administrators can update user roles.");
  }

  const targetEmail = String(email).trim().toLowerCase();
  const targetUser = await admin.auth().getUserByEmail(targetEmail);
  const nextRole = role === "admin" ? "admin" : "staff";

  await admin.auth().setCustomUserClaims(targetUser.uid, {
    admin: nextRole === "admin",
    role: nextRole,
  });

  return {
    success: true,
    uid: targetUser.uid,
    email: targetEmail,
    role: nextRole,
  };
});

export const listFirebaseUsers = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const caller = await getCallerRole(request.auth.uid);

  if (!caller.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only administrators can list Firebase users."
    );
  }

  const result = await admin.auth().listUsers(1000);

  return {
    users: result.users.map((userRecord) => ({
      id: userRecord.uid,
      uid: userRecord.uid,
      email: userRecord.email || "",
      name: userRecord.displayName || userRecord.email?.split("@")[0] || "User",
      role: userRecord.customClaims?.role || (userRecord.email === "admin@comlab.edu" ? "admin" : "staff"),
    })),
  };
});

export const deleteFirebaseUser = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  const { uid, email } = request.data || {};

  if (!uid && !email) {
    throw new HttpsError("invalid-argument", "A user id or email is required.");
  }

  const caller = await getCallerRole(request.auth.uid);

  if (!caller.isAdmin) {
    throw new HttpsError(
      "permission-denied",
      "Only administrators can delete Firebase users."
    );
  }

  let targetUid = uid;

  if (!targetUid && email) {
    const user = await admin.auth().getUserByEmail(email);
    targetUid = user.uid;
  }

  if (!targetUid) {
    throw new HttpsError("not-found", "The requested user could not be found.");
  }

  await admin.auth().deleteUser(targetUid);

  return {
    success: true,
    uid: targetUid,
  };
});

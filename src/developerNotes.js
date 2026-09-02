import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export const BUG_REPORTS_COLLECTION =
  "bugReports";

export const normalizeDeveloperNoteType = (
  text = "",
) => {
  const cleaned = String(text || "").trim();

  if (!cleaned) {
    return "Note";
  }

  const lowerText = cleaned.toLowerCase();

  if (
    lowerText.startsWith("bug") ||
    lowerText.includes("bug") ||
    lowerText.includes("error") ||
    lowerText.includes("broken") ||
    lowerText.includes("not working")
  ) {
    return "Bug";
  }

  if (
    lowerText.startsWith("add") ||
    lowerText.startsWith("feature") ||
    lowerText.includes("feature") ||
    lowerText.includes("new") ||
    lowerText.includes("improve") ||
    lowerText.includes("enhancement")
  ) {
    return "Feature";
  }

  return "Note";
};

export const createDeveloperNote = (
  text,
  user,
) => {
  const cleaned = String(text || "").trim();

  if (!cleaned) {
    return null;
  }

  return {
    type: normalizeDeveloperNoteType(cleaned),

    text: cleaned,

    createdBy:
      user?.name ||
      user?.email ||
      "Administrator",

    createdByEmail:
      user?.email || "",

    createdByUid:
      user?.uid || "",

    createdAt: serverTimestamp(),

    status: "Open",
  };
};

export const addDeveloperNote = async (
  text,
  user,
) => {
  const role = String(user?.role || "")
    .trim()
    .toLowerCase();

  if (
    role !== "administrator" &&
    role !== "admin"
  ) {
    throw new Error(
      "Only administrators can submit bug reports.",
    );
  }

  const note = createDeveloperNote(
    text,
    user,
  );

  if (!note) {
    throw new Error(
      "Bug report cannot be empty.",
    );
  }

  const reportsRef = collection(
    db,
    BUG_REPORTS_COLLECTION,
  );

  return await addDoc(
    reportsRef,
    note,
  );
};

export const subscribeToDeveloperNotes = (
  callback,
  onError,
) => {
  const reportsRef = collection(
    db,
    BUG_REPORTS_COLLECTION,
  );

  const reportsQuery = query(
    reportsRef,
    orderBy("createdAt", "desc"),
  );

  return onSnapshot(
    reportsQuery,
    (snapshot) => {
      const notes = snapshot.docs.map(
        (item) => {
          const data = item.data();

          return {
            id: item.id,
            ...data,
            createdAt:
              data.createdAt?.toDate
                ? data.createdAt.toDate()
                : data.createdAt ||
                  new Date(),
          };
        },
      );

      callback(notes);
    },
    (error) => {
      console.error(
        "Error loading bug reports:",
        error,
      );

      if (onError) {
        onError(error);
      }
    },
  );
};

export const updateDeveloperNoteStatus =
  async (
    noteId,
    status,
  ) => {
    if (!noteId) {
      return;
    }

    const noteRef = doc(
      db,
      BUG_REPORTS_COLLECTION,
      noteId,
    );

    await updateDoc(noteRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  };

export const deleteDeveloperNote = async (
  noteId,
) => {
  if (!noteId) {
    return;
  }

  const noteRef = doc(
    db,
    BUG_REPORTS_COLLECTION,
    noteId,
  );

  await deleteDoc(noteRef);
};
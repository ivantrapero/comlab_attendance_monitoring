import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Sidebar from "./Sidebar";

import {
  subscribeToDeveloperNotes,
  updateDeveloperNoteStatus,
} from "./developerNotes";

import "./DeveloperBoard.css";

function DeveloperBoard({
  user,
  onLogout,
  onNavigate,
}) {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [notes, setNotes] =
    useState([]);

  const [filter, setFilter] =
    useState("all");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [completingId, setCompletingId] =
    useState(null);

  const role = String(
    user?.role || "",
  )
    .trim()
    .toLowerCase();

  const isDeveloper =
    role === "developer";

  const navigate = (page) => {
    setSidebarOpen(false);

    if (onNavigate) {
      onNavigate(page);
    }
  };

  /* =========================================
     LOAD BUG REPORTS
  ========================================= */

  useEffect(() => {
    if (!isDeveloper) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const unsubscribe =
      subscribeToDeveloperNotes(
        (data) => {
          setNotes(data);
          setLoading(false);
        },
        (snapshotError) => {
          console.error(
            "Bug report listener error:",
            snapshotError,
          );

          setError(
            "Unable to load bug reports.",
          );

          setLoading(false);
        },
      );

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isDeveloper]);

  /* =========================================
     STATUS HELPERS
  ========================================= */

  const isNoteDone = (note) => {
    return (
      String(note?.status || "")
        .trim()
        .toLowerCase() === "done"
    );
  };

  /* =========================================
     COUNTS
  ========================================= */

  const counts = useMemo(() => {
    const bugs = notes.filter(
      (note) =>
        note.type === "Bug",
    ).length;

    const features = notes.filter(
      (note) =>
        note.type === "Feature",
    ).length;

    const regularNotes = notes.filter(
      (note) =>
        note.type === "Note",
    ).length;

    const completed = notes.filter(
      (note) =>
        isNoteDone(note),
    ).length;

    const pending = notes.filter(
      (note) =>
        !isNoteDone(note),
    ).length;

    return {
      all: notes.length,
      Bug: bugs,
      Feature: features,
      Note: regularNotes,
      completed,
      pending,
    };
  }, [notes]);

  /* =========================================
     FILTER
  ========================================= */

  const filteredNotes =
    useMemo(() => {
      switch (filter) {
        case "Bug":
          return notes.filter(
            (note) =>
              note.type === "Bug",
          );

        case "Feature":
          return notes.filter(
            (note) =>
              note.type === "Feature",
          );

        case "Note":
          return notes.filter(
            (note) =>
              note.type === "Note",
          );

        case "pending":
          return notes.filter(
            (note) =>
              !isNoteDone(note),
          );

        case "completed":
          return notes.filter(
            (note) =>
              isNoteDone(note),
          );

        default:
          return notes;
      }
    }, [filter, notes]);

  /* =========================================
     MARK DONE
  ========================================= */

  const handleMarkDone = async (
    noteId,
  ) => {
    if (!noteId) {
      return;
    }

    setCompletingId(noteId);
    setError("");

    try {
      await updateDeveloperNoteStatus(
        noteId,
        "Done",
      );
    } catch (completeError) {
      console.error(
        "Unable to mark report as done:",
        completeError,
      );

      setError(
        "Unable to mark the report as done.",
      );
    } finally {
      setCompletingId(null);
    }
  };

  /* =========================================
     ACCESS DENIED
  ========================================= */

  if (!isDeveloper) {
    return (
      <div className="developer-board-page">
        <Sidebar
          user={user}
          onLogout={onLogout}
          onNavigate={navigate}
          currentPage="dashboard"
          sidebarOpen={sidebarOpen}
        />

        <main className="developer-board-main">
          <div className="developer-access-denied">
            <div className="access-denied-symbol">
              !
            </div>

            <h2>
              Developer Access Only
            </h2>

            <p>
              Only the developer can
              view and manage bug
              reports.
            </p>
          </div>
        </main>
      </div>
    );
  }

  /* =========================================
     MAIN
  ========================================= */

  return (
    <div className="developer-board-page">
      <Sidebar
        user={user}
        onLogout={onLogout}
        onNavigate={navigate}
        currentPage="developer-board"
        sidebarOpen={sidebarOpen}
      />

      <main className="developer-board-main">
        {/* =====================================
            TOPBAR
        ===================================== */}

        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu"
              onClick={() =>
                setSidebarOpen(
                  !sidebarOpen,
                )
              }
              aria-label="Open menu"
            >
              ☰
            </button>

            <div className="topbar-title">
              <span>
                COMPUTER LABORATORY
              </span>

              <h1>
                Bug Board
              </h1>
            </div>
          </div>

          <div className="topbar-user">
            <div className="user-avatar">
              {(
                user?.name ||
                "Developer"
              )
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {user?.name ||
                  "Developer"}
              </strong>

              <span>
                Developer
              </span>
            </div>
          </div>
        </header>

        <div className="developer-board-content">
          {/* ===================================
              PAGE HEADER
          =================================== */}

          <section className="developer-board-header">
            <div>
              <p className="section-kicker">
                Developer queue
              </p>

              <h2>
                Bug reports and
                feature requests
              </h2>

              <span>
                Reports submitted by
                administrators.
              </span>
            </div>
          </section>

          {/* ===================================
              ERROR
          =================================== */}

          {error && (
            <div className="developer-board-error">
              <span className="error-symbol">
                !
              </span>

              <span>
                {error}
              </span>
            </div>
          )}

          {/* ===================================
              SUMMARY
          =================================== */}

          <section className="developer-summary-grid">
            <div className="summary-card danger">
              <div className="summary-icon">
                BUG
              </div>

              <div>
                <span>
                  Bugs
                </span>

                <strong>
                  {counts.Bug}
                </strong>
              </div>
            </div>

            <div className="summary-card primary">
              <div className="summary-icon">
                +
              </div>

              <div>
                <span>
                  Features
                </span>

                <strong>
                  {counts.Feature}
                </strong>
              </div>
            </div>

            <div className="summary-card neutral">
              <div className="summary-icon">
                NOTE
              </div>

              <div>
                <span>
                  Notes
                </span>

                <strong>
                  {counts.Note}
                </strong>
              </div>
            </div>

            <div className="summary-card pending">
              <div className="summary-icon">
                !
              </div>

              <div>
                <span>
                  Pending
                </span>

                <strong>
                  {counts.pending}
                </strong>
              </div>
            </div>

            <div className="summary-card completed">
              <div className="summary-icon">
                ✓
              </div>

              <div>
                <span>
                  Completed
                </span>

                <strong>
                  {counts.completed}
                </strong>
              </div>
            </div>
          </section>

          {/* ===================================
              REPORT PANEL
          =================================== */}

          <section className="developer-board-panel">
            <div className="developer-view-banner">
              <span className="banner-symbol">
                DEV
              </span>

              <span>
                Review administrator
                reports and mark
                completed work as done.
              </span>
            </div>

            {/* =================================
                FILTERS
            ================================= */}

            <div className="filter-row">
              <button
                type="button"
                className={
                  filter === "all"
                    ? "filter-pill active"
                    : "filter-pill"
                }
                onClick={() =>
                  setFilter("all")
                }
              >
                All ({counts.all})
              </button>

              <button
                type="button"
                className={
                  filter === "pending"
                    ? "filter-pill active"
                    : "filter-pill"
                }
                onClick={() =>
                  setFilter("pending")
                }
              >
                Pending ({counts.pending})
              </button>

              <button
                type="button"
                className={
                  filter === "completed"
                    ? "filter-pill active"
                    : "filter-pill"
                }
                onClick={() =>
                  setFilter("completed")
                }
              >
                Completed (
                {counts.completed}
                )
              </button>

              <button
                type="button"
                className={
                  filter === "Bug"
                    ? "filter-pill active"
                    : "filter-pill"
                }
                onClick={() =>
                  setFilter("Bug")
                }
              >
                Bugs ({counts.Bug})
              </button>

              <button
                type="button"
                className={
                  filter === "Feature"
                    ? "filter-pill active"
                    : "filter-pill"
                }
                onClick={() =>
                  setFilter("Feature")
                }
              >
                Features (
                {counts.Feature}
                )
              </button>

              <button
                type="button"
                className={
                  filter === "Note"
                    ? "filter-pill active"
                    : "filter-pill"
                }
                onClick={() =>
                  setFilter("Note")
                }
              >
                Notes ({counts.Note})
              </button>
            </div>

            {/* =================================
                REPORT LIST
            ================================= */}

            <div className="note-list">
              {loading ? (
                <div className="note-empty">
                  Loading bug reports...
                </div>
              ) : filteredNotes.length >
                0 ? (
                filteredNotes.map(
                  (note) => {
                    const isDone =
                      isNoteDone(note);

                    return (
                      <article
                        key={note.id}
                        className={`note-item ${String(
                          note.type ||
                            "Note",
                        ).toLowerCase()} ${
                          isDone
                            ? "completed"
                            : ""
                        }`}
                      >
                        {/* =====================
                            META
                        ===================== */}

                        <div className="note-meta">
                          <div className="note-meta-left">
                            <span className="note-tag">
                              {note.type ||
                                "Note"}
                            </span>

                            {isDone && (
                              <span className="done-tag">
                                DONE
                              </span>
                            )}
                          </div>

                          {!isDone && (
                            <button
                              type="button"
                              className="mark-done-button"
                              onClick={() =>
                                handleMarkDone(
                                  note.id,
                                )
                              }
                              disabled={
                                completingId ===
                                note.id
                              }
                            >
                              <span>
                                ✓
                              </span>

                              {completingId ===
                              note.id
                                ? "Marking Done..."
                                : "Mark Done"}
                            </button>
                          )}
                        </div>

                        {/* =====================
                            DATE
                        ===================== */}

                        <small className="note-date">
                          {note.createdAt
                            ? new Date(
                                note.createdAt,
                              ).toLocaleString(
                                "en-US",
                                {
                                  month:
                                    "short",
                                  day:
                                    "numeric",
                                  year:
                                    "numeric",
                                  hour:
                                    "numeric",
                                  minute:
                                    "2-digit",
                                },
                              )
                            : "Just now"}
                        </small>

                        {/* =====================
                            REPORT
                        ===================== */}

                        <p>
                          {note.text}
                        </p>

                        {/* =====================
                            FOOTER
                        ===================== */}

                        <div className="note-footer">
                          <small className="note-author">
                            Reported by:{" "}
                            <strong>
                              {note.createdBy ||
                                "Administrator"}
                            </strong>
                          </small>

                          {isDone &&
                            note.updatedAt && (
                              <small className="note-completed-by">
                                Status:{" "}
                                <strong>
                                  Completed
                                </strong>
                              </small>
                            )}
                        </div>

                        {/* =====================
                            COMPLETED
                        ===================== */}

                        {isDone && (
                          <div className="completed-message">
                            <span>
                              ✓
                            </span>

                            <span>
                              This report has
                              been completed.
                            </span>
                          </div>
                        )}
                      </article>
                    );
                  },
                )
              ) : (
                <div className="note-empty">
                  {filter === "completed"
                    ? "No completed reports."
                    : filter === "pending"
                      ? "No pending reports."
                      : "No bug reports found."}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default DeveloperBoard;

import { useState } from "react";
import {
  Bug,
  X,
  Send,
  Trash2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import { addDeveloperNote } from "./developerNotes";

import "./BugReportButton.css";

function BugReportButton({ user }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const role = String(user?.role || "")
    .trim()
    .toLowerCase();

  const isAdmin =
    role === "administrator" ||
    role === "admin";

  if (!isAdmin) {
    return null;
  }

  const handleOpen = () => {
    setOpen(true);
    setError("");
    setSuccess("");
  };

  const handleClose = () => {
    if (loading) return;

    setOpen(false);
    setError("");
    setSuccess("");
  };

  const handleClear = () => {
    setDraft("");
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const text = draft.trim();

    if (!text) {
      setError("Please describe the bug before submitting.");
      return;
    }

    try {
      setLoading(true);

      await addDeveloperNote(text, user);

      setDraft("");

      setSuccess(
        "Bug report submitted successfully."
      );
    } catch (submitError) {
      console.error(
        "Error submitting bug report:",
        submitError
      );

      setError(
        submitError?.message ||
          "Unable to submit the bug report. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="bug-report-floating-button"
        onClick={handleOpen}
        aria-label="Report a bug"
        title="Report a bug"
      >
        <Bug size={19} />
        <span>Report Bug</span>
      </button>

      {open && (
        <div
          className="bug-report-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !loading
            ) {
              handleClose();
            }
          }}
        >
          <div
            className="bug-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="bug-report-title"
          >
            <div className="bug-report-modal-header">
              <div className="bug-report-modal-heading">
                <div className="bug-report-modal-icon">
                  <Bug size={20} />
                </div>

                <div>
                  <span>System Support</span>
                  <h2 id="bug-report-title">
                    Report a Bug
                  </h2>
                </div>
              </div>

              <button
                type="button"
                className="bug-report-close"
                onClick={handleClose}
                disabled={loading}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="bug-report-form"
              onSubmit={handleSubmit}
            >
              <div className="bug-report-field">
                <label htmlFor="bug-report-description">
                  Describe the Problem
                </label>

                <textarea
                  id="bug-report-description"
                  value={draft}
                  onChange={(event) => {
                    setDraft(event.target.value);

                    if (error) {
                      setError("");
                    }

                    if (success) {
                      setSuccess("");
                    }
                  }}
                  placeholder="Describe what happened, what you were doing, and any error message you saw..."
                  maxLength={2000}
                  disabled={loading}
                  autoFocus
                />

                <div className="bug-report-counter">
                  {draft.length} / 2000
                </div>
              </div>

              {error && (
                <div className="bug-report-message error">
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className="bug-report-message success">
                  <CheckCircle size={15} />
                  <span>{success}</span>
                </div>
              )}

              <div className="bug-report-actions">
                <button
                  type="button"
                  className="bug-report-clear"
                  onClick={handleClear}
                  disabled={
                    loading ||
                    (!draft && !error && !success)
                  }
                >
                  <Trash2 size={14} />
                  Clear
                </button>

                <div className="bug-report-right-actions">
                  <button
                    type="button"
                    className="bug-report-cancel"
                    onClick={handleClose}
                    disabled={loading}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="bug-report-submit"
                    disabled={
                      loading ||
                      !draft.trim()
                    }
                  >
                    <Send size={14} />

                    {loading
                      ? "Submitting..."
                      : "Submit Report"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default BugReportButton;


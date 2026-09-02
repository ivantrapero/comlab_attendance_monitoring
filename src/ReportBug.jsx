import { useState } from "react";
import {
  AlertCircle,
  Bug,
  CheckCircle,
  Send,
  Trash2,
} from "lucide-react";

import Sidebar from "./Sidebar";
import { addDeveloperNote } from "./developerNotes";

import "./ReportBug.css";

function ReportBug({ user, onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const navigate = (page) => {
    setSidebarOpen(false);

    if (onNavigate) {
      onNavigate(page);
    }
  };

  const handleDraftChange = (event) => {
    setDraft(event.target.value);

    if (error) {
      setError("");
    }

    if (success) {
      setSuccess("");
    }
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
      setError(
        "Please describe the bug before submitting."
      );
      return;
    }

    try {
      setLoading(true);

      await addDeveloperNote(text, user);

      setDraft("");

      setSuccess(
        "Bug report submitted successfully. The developer can now review it."
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

  if (!isAdmin) {
    return (
      <div className="report-bug-page">
        <Sidebar
          user={user}
          onLogout={onLogout}
          onNavigate={navigate}
          currentPage="report-bug"
          sidebarOpen={sidebarOpen}
        />

        <main className="report-bug-main">
          <header className="topbar">
            <div className="topbar-left">
              <button
                type="button"
                className="mobile-menu"
                onClick={() =>
                  setSidebarOpen(!sidebarOpen)
                }
                aria-label="Open menu"
              >
                ☰
              </button>

              <div className="topbar-title">
                <span>COMPUTER LABORATORY</span>
                <h1>Report Bug</h1>
              </div>
            </div>

            <div className="topbar-user">
              <div className="user-avatar">
                {(user?.name || "User")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>
                  {user?.name || "User"}
                </strong>

                <span>Online</span>
              </div>
            </div>
          </header>

          <div className="report-bug-access-denied">
            <div className="report-bug-denied-card">
              <AlertCircle size={42} />

              <h2>Access Restricted</h2>

              <p>
                Only administrators can submit bug
                reports. Developers can review and
                manage reports from the Bug Board.
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="report-bug-page">
      <Sidebar
        user={user}
        onLogout={onLogout}
        onNavigate={navigate}
        currentPage="report-bug"
        sidebarOpen={sidebarOpen}
      />

      <main className="report-bug-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu"
              onClick={() =>
                setSidebarOpen(!sidebarOpen)
              }
              aria-label="Open menu"
            >
              ☰
            </button>

            <div className="topbar-title">
              <span>COMPUTER LABORATORY</span>
              <h1>Report Bug</h1>
            </div>
          </div>

          <div className="topbar-user">
            <div className="user-avatar">
              {(user?.name || "Administrator")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {user?.name || "Administrator"}
              </strong>

              <span>Online</span>
            </div>
          </div>
        </header>

        <section className="report-bug-content">
          <div className="report-bug-container">
            <div className="report-bug-intro">
              <span>SYSTEM SUPPORT</span>

              <h2>Submit a Bug Report</h2>

              <p>
                Found something that is not working
                correctly? Describe the problem below so
                the developer can investigate and fix it.
              </p>
            </div>

            <div className="report-bug-card">
              <div className="report-bug-card-header">
                <div className="report-bug-icon">
                  <Bug size={22} />
                </div>

                <div>
                  <h3>Bug Details</h3>

                  <p>
                    Provide as much detail as possible
                    about the problem.
                  </p>
                </div>
              </div>

              <form
                className="report-bug-form"
                onSubmit={handleSubmit}
              >
                <div className="report-bug-field">
                  <label htmlFor="bug-description">
                    Describe the Problem
                  </label>

                  <textarea
                    id="bug-description"
                    className="report-bug-textarea"
                    value={draft}
                    onChange={handleDraftChange}
                    placeholder="Example: The attendance report does not display today's records when I select a specific date..."
                    maxLength={2000}
                    disabled={loading}
                  />

                  <div className="report-bug-character-count">
                    {draft.length} / 2000
                  </div>
                </div>

                {error && (
                  <div className="report-bug-message error">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="report-bug-message success">
                    <CheckCircle size={16} />
                    <span>{success}</span>
                  </div>
                )}

                <div className="report-bug-actions">
                  <button
                    type="button"
                    className="report-bug-clear"
                    onClick={handleClear}
                    disabled={
                      loading ||
                      (!draft && !error && !success)
                    }
                  >
                    <Trash2 size={14} />
                    Clear
                  </button>

                  <button
                    type="submit"
                    className="report-bug-submit"
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
              </form>
            </div>

            <div className="report-bug-info">
              <h4>Before submitting</h4>

              <ul>
                <li>
                  Clearly describe what went wrong.
                </li>

                <li>
                  Mention what you were doing when the
                  problem occurred.
                </li>

                <li>
                  Include any error message you saw.
                </li>

                <li>
                  Avoid submitting duplicate reports for
                  the same problem.
                </li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default ReportBug;

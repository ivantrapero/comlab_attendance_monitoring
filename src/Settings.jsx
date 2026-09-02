import { useState } from "react";
import {
  KeyRound,
  Mail,
  Save,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

import Sidebar from "./Sidebar";
import BugReportButton from "./BugReportButton";

import {
  updateEmail,
  updatePassword,
  updateProfile,
} from "firebase/auth";

import { auth } from "./firebase";
import { syncUserProfile } from "./firebaseAuth";

import "./Settings.css";

function Settings({ user, onLogout, onNavigate, onProfileUpdated }) {
  const isAdmin = ["administrator", "admin", "developer"].includes(
    String(user?.role || "Working").trim().toLowerCase()
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [profile, setProfile] = useState({
    fullName: user?.name || "Administrator",
    email: user?.username || "admin@comlab.edu",
    role:
      localStorage.getItem(`comlab-role-${user?.uid}`) ||
      user?.role ||
      "Working",
    password: "",
  });

  const navigate = (page) => {
    setSidebarOpen(false);

    if (onNavigate) {
      onNavigate(page);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (!isAdmin && name === "role") {
      return;
    }

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));

    setSaved(false);
    setError("");
  };

  const handleSave = async () => {
    const currentUser = auth.currentUser;

    if (!currentUser) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    setSaving(true);
    setSaved(false);
    setError("");

    try {
      const nextRole = isAdmin
        ? profile.role.trim()
        : user?.role || "Working";

      /*
       * UPDATE NAME
       */
      if (profile.fullName.trim() !== currentUser.displayName) {
        await updateProfile(currentUser, {
          displayName: profile.fullName.trim(),
        });
      }

      /*
       * UPDATE EMAIL
       */
      if (profile.email.trim() !== currentUser.email) {
        await updateEmail(currentUser, profile.email.trim());
      }

      /*
       * UPDATE PASSWORD
       */
      if (profile.password.trim()) {
        await updatePassword(currentUser, profile.password);
      }

      /*
       * SAVE ROLE
       */
      localStorage.setItem(
        `comlab-role-${currentUser.uid}`,
        nextRole
      );

      /*
       * SYNC FIREBASE USER PROFILE
       */
      await syncUserProfile(currentUser, nextRole);

      /*
       * UPDATE LOCAL ACCOUNTS
       */
      const savedAccounts = JSON.parse(
        localStorage.getItem("comlab-user-accounts") || "[]"
      );

      const nextAccounts = savedAccounts.map((account) => {
        const matchesUid =
          String(account?.uid || account?.id || "") ===
          String(currentUser.uid || "");

        const matchesEmail =
          String(account?.email || "")
            .trim()
            .toLowerCase() ===
          String(currentUser.email || "")
            .trim()
            .toLowerCase();

        if (matchesUid || matchesEmail) {
          return {
            ...account,
            id: account.id || currentUser.uid,
            uid: currentUser.uid,
            email: currentUser.email || account.email,
            name: profile.fullName.trim(),
            role: nextRole,
          };
        }

        return account;
      });

      /*
       * ADD ACCOUNT IF IT DOES NOT EXIST
       */
      if (
        !nextAccounts.some(
          (account) =>
            String(account?.uid || account?.id || "") ===
              String(currentUser.uid || "") ||
            String(account?.email || "")
              .trim()
              .toLowerCase() ===
              String(currentUser.email || "")
                .trim()
                .toLowerCase()
        )
      ) {
        nextAccounts.unshift({
          id: currentUser.uid,
          uid: currentUser.uid,
          email:
            currentUser.email || profile.email.trim(),
          name: profile.fullName.trim(),
          role: nextRole,
        });
      }

      localStorage.setItem(
        "comlab-user-accounts",
        JSON.stringify(nextAccounts)
      );

      /*
       * UPDATE FORM STATE
       */
      setProfile((currentProfile) => ({
        ...currentProfile,
        role: nextRole,
        password: "",
      }));

      setSaved(true);

      /*
       * UPDATE APP USER STATE
       */
      if (onProfileUpdated) {
        onProfileUpdated({
          name: profile.fullName.trim(),
          username: profile.email.trim(),
          role: nextRole,
        });
      }
    } catch (saveError) {
      if (saveError.code === "auth/requires-recent-login") {
        setError(
          "Please sign in again before changing your email or password."
        );
      } else if (
        saveError.code === "auth/email-already-in-use"
      ) {
        setError("That email address is already in use.");
      } else if (
        saveError.code === "auth/invalid-email"
      ) {
        setError("Please enter a valid email address.");
      } else {
        setError(
          "Unable to save your profile changes. Please try again."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">

      {/* =========================
          SIDEBAR
      ========================= */}

      <Sidebar
        user={user}
        onLogout={onLogout}
        onNavigate={navigate}
        currentPage="settings"
        sidebarOpen={sidebarOpen}
      />

      {/* =========================
          REPORT BUG
      ========================= */}

      <BugReportButton user={user} />

      {/* =========================
          MAIN CONTENT
      ========================= */}

      <main className="settings-main">

        {/* =========================
            TOPBAR
        ========================= */}

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
              <h1>Settings</h1>
            </div>

          </div>

          <div className="topbar-user">

            <div className="user-avatar">
              {(user?.name || "Admin")
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

        {/* =========================
            SETTINGS CONTENT
        ========================= */}

        <div className="settings-content">

          <section className="settings-panel">

            {/* PANEL HEADER */}

            <div className="settings-panel-header">

              <div className="settings-badge">
                <UserCircle size={22} />
              </div>

              <div>
                <h2>Profile Settings</h2>
                <p>
                  Update your account details.
                </p>
              </div>

            </div>

            {/* SUCCESS MESSAGE */}

            {saved && (
              <div className="settings-success">
                Your profile changes have been saved.
              </div>
            )}

            {/* ERROR MESSAGE */}

            {error && (
              <div className="settings-error">
                {error}
              </div>
            )}

            {/* SETTINGS FORM */}

            <form
              className="settings-form"
              onSubmit={(e) => e.preventDefault()}
            >

              {/* NAME */}

              <div className="form-row">

                <label htmlFor="fullName">
                  Change Name
                </label>

                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={profile.fullName}
                  onChange={handleChange}
                  placeholder="Enter full name"
                />

              </div>

              {/* EMAIL */}

              <div className="form-row">

                <label htmlFor="email">
                  <Mail size={15} />
                  Email Address
                </label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={profile.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                />

              </div>

              {/* ROLE */}

              <div className="form-row">

                <label htmlFor="role">
                  <ShieldCheck size={15} />
                  Role
                </label>

                <select
                  id="role"
                  name="role"
                  value={profile.role}
                  onChange={handleChange}
                  disabled={!isAdmin}
                >
                  <option value="Administrator">
                    Administrator
                  </option>

                  <option value="Developer">
                    Developer
                  </option>
                </select>

              </div>

              {/* PASSWORD */}

              <div className="form-row">

                <label htmlFor="password">
                  <KeyRound size={15} />
                  Change Password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  value={profile.password}
                  onChange={handleChange}
                  placeholder="Enter new password"
                />

              </div>

              {/* SAVE */}

              <button
                type="button"
                className="save-button"
                onClick={handleSave}
                disabled={saving}
              >
                <Save size={16} />

                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>

            </form>

          </section>

        </div>

      </main>
    </div>
  );
}

export default Settings;
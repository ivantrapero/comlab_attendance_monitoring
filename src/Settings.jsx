import { useState } from "react";
import {
  KeyRound,
  Mail,
  Save,
  ShieldCheck,
  UserCircle,
} from "lucide-react";

import Sidebar from "./Sidebar";
import "./Settings.css";

function Settings({ user, onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    fullName: user?.name || "Administrator",
    email: user?.username || "admin@comlab.edu",
    role: user?.role || "Administrator",
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

    setProfile((current) => ({
      ...current,
      [name]: value,
    }));

    setSaved(false);
  };

  const handleSave = () => {
    setSaved(true);
  };

  return (
    <div className="settings-page">
      <Sidebar
        user={user}
        onLogout={onLogout}
        onNavigate={navigate}
        currentPage="settings"
        sidebarOpen={sidebarOpen}
      />

      <main className="settings-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu"
              onClick={() => setSidebarOpen(!sidebarOpen)}
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
              {(user?.name || "Admin").charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{user?.name || "Administrator"}</strong>
              <span>Online</span>
            </div>
          </div>
        </header>

        <div className="settings-content">
          <section className="settings-panel">
            <div className="settings-panel-header">
              <div className="settings-badge">
                <UserCircle size={22} />
              </div>

              <div>
                <h2>Profile Settings</h2>
                <p>Update your account details.</p>
              </div>
            </div>

            {saved && (
              <div className="settings-success">
                Your profile changes have been saved.
              </div>
            )}

            <form className="settings-form" onSubmit={(e) => e.preventDefault()}>
              <div className="form-row">
                <label htmlFor="fullName">Change Name</label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  value={profile.fullName}
                  onChange={handleChange}
                  placeholder="Enter full name"
                />
              </div>

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

              <div className="form-row">
                <label htmlFor="role">
                  <ShieldCheck size={15} />
                  Role
                </label>
                <input
                  id="role"
                  name="role"
                  type="text"
                  value={profile.role}
                  onChange={handleChange}
                  placeholder="Enter role or position"
                />
              </div>

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

              <button type="button" className="save-button" onClick={handleSave}>
                <Save size={16} />
                Save Changes
              </button>
            </form>

          </section>
        </div>
      </main>
    </div>
  );
}

export default Settings;

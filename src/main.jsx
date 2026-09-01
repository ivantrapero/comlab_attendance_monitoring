import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import Dashboard from "./Dashboard.jsx";
import Attendance from "./Attendance.jsx";
import Reports from "./Reports.jsx";
import Notifications from "./Notifications.jsx";
import Settings from "./Settings.jsx";

import { listenToAuth, logoutUser } from "./firebaseAuth";

import "./index.css";

const storedTheme = localStorage.getItem("comlab-theme");
const initialTheme =
  storedTheme ||
  (window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark");

document.documentElement.dataset.theme = initialTheme;

const staffAccessiblePages = ["dashboard", "attendance", "reports", "notifications", "settings"];

function Main() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");

  useEffect(() => {
    const unsubscribe = listenToAuth((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          username: firebaseUser.email,
          name:
            firebaseUser.displayName ||
            "Administrator",
          role: "Administrator",
        });
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const isAdminUser = () => true;

  const canAccessPage = () => true;

  useEffect(() => {
    if (user && !staffAccessiblePages.includes(page)) {
      setPage("dashboard");
    }
  }, [user, page]);

  const handleLogin = (loginUser) => {
    setUser(loginUser);
    setPage("dashboard");
  };

  const handleLogout = async () => {
    try {
      if (user?.uid) {
        localStorage.removeItem(`comlab-role-${user.uid}`);
      }

      if (user?.username) {
        localStorage.removeItem(`comlab-role-email-${user.username.trim().toLowerCase()}`);
      }

      await logoutUser();

      setUser(null);
      setPage("dashboard");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const handleNavigate = (newPage) => {
    if (!canAccessPage(newPage)) {
      setPage("dashboard");
      return;
    }

    setPage(newPage);
  };

  const handleProfileUpdated = (updates) => {
    setUser((currentUser) => ({
      ...currentUser,
      ...updates,
    }));
  };

  if (loading) {
    return (
      <div className="loading-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <App onLogin={handleLogin} />;
  }

  const safePage = staffAccessiblePages.includes(page) ? page : "dashboard";

  switch (safePage) {
    case "attendance":
      return (
        <Attendance
          user={user}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      );

    case "reports":
      return (
        <Reports
          user={user}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      );

    case "notifications":
      return (
        <Notifications
          user={user}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      );

    case "settings":
      return (
        <Settings
          user={user}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          onProfileUpdated={handleProfileUpdated}
        />
      );

    case "dashboard":
    default:
      return (
        <Dashboard
          user={user}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      );
  }
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Main />
  </StrictMode>
);
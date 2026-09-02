import {
  StrictMode,
  useEffect,
  useState,
} from "react";

import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import Dashboard from "./Dashboard.jsx";
import Attendance from "./Attendance.jsx";
import Reports from "./Reports.jsx";
import Notifications from "./Notifications.jsx";
import Settings from "./Settings.jsx";
import DeveloperBoard from "./DeveloperBoard.jsx";
import ReportBug from "./ReportBug.jsx";

import {
  listenToAuth,
  logoutUser,
  syncUserProfile,
} from "./firebaseAuth";

import "./index.css";

const storedTheme =
  localStorage.getItem(
    "comlab-theme",
  );

const initialTheme =
  storedTheme ||
  (window.matchMedia(
    "(prefers-color-scheme: light)",
  ).matches
    ? "light"
    : "dark");

document.documentElement.dataset.theme =
  initialTheme;

const developerPages = [
  "dashboard",
  "attendance",
  "reports",
  "notifications",
  "developer-board",
  "settings",
];

const administratorPages = [
  "dashboard",
  "attendance",
  "reports",
  "notifications",
  "report-bug",
  "settings",
];

const workingPages = [
  "dashboard",
  "attendance",
  "reports",
  "settings",
];

function Main() {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [page, setPage] =
    useState("dashboard");

  useEffect(() => {
    const unsubscribe =
      listenToAuth(
        async (firebaseUser) => {
          if (firebaseUser) {
            try {
              const profile =
                await syncUserProfile(
                  firebaseUser,
                );

              setUser(profile);

              setPage(
                "dashboard",
              );
            } catch (error) {
              console.error(
                "Unable to sync user profile:",
                error,
              );

              setUser(null);
            }
          } else {
            setUser(null);
            setPage(
              "dashboard",
            );
          }

          setLoading(false);
        },
      );

    return unsubscribe;
  }, []);

  const getUserRole = () => {
    return String(
      user?.role || "",
    )
      .trim()
      .toLowerCase();
  };

  const isDeveloper = () => {
    return (
      getUserRole() ===
      "developer"
    );
  };

  const isAdministrator = () => {
    const role =
      getUserRole();

    return (
      role ===
        "administrator" ||
      role === "admin"
    );
  };

  const canAccessPage = (
    requestedPage,
  ) => {
    const role =
      getUserRole();

    if (
      role === "developer"
    ) {
      return developerPages.includes(
        requestedPage,
      );
    }

    if (
      role ===
        "administrator" ||
      role === "admin"
    ) {
      return administratorPages.includes(
        requestedPage,
      );
    }

    return workingPages.includes(
      requestedPage,
    );
  };

  useEffect(() => {
    if (
      user &&
      !canAccessPage(page)
    ) {
      setPage("dashboard");
    }
  }, [user, page]);

  const handleLogin = (
    loginUser,
  ) => {
    setUser(loginUser);
    setPage("dashboard");
  };

  const handleLogout =
    async () => {
      try {
        if (user?.uid) {
          localStorage.removeItem(
            `comlab-role-${user.uid}`,
          );
        }

        if (user?.email) {
          const email =
            user.email
              .trim()
              .toLowerCase();

          localStorage.removeItem(
            `comlab-role-email-${email}`,
          );

          localStorage.removeItem(
            `comlab-role-${email}`,
          );
        }

        await logoutUser();

        setUser(null);
        setPage(
          "dashboard",
        );
      } catch (error) {
        console.error(
          "Logout error:",
          error,
        );
      }
    };

  const handleNavigate = (
    newPage,
  ) => {
    if (
      !canAccessPage(
        newPage,
      )
    ) {
      setPage("dashboard");
      return;
    }

    setPage(newPage);
  };

  const handleProfileUpdated =
    (updates) => {
      setUser(
        (currentUser) => ({
          ...currentUser,
          ...updates,
        }),
      );
    };

  if (loading) {
    return (
      <div className="loading-screen">
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <App
        onLogin={handleLogin}
      />
    );
  }

  let safePage = page;

  if (!canAccessPage(safePage)) {
    safePage =
      "dashboard";
  }

  switch (safePage) {
    case "attendance":
      return (
        <Attendance
          user={user}
          onNavigate={
            handleNavigate
          }
          onLogout={
            handleLogout
          }
        />
      );

    case "reports":
      return (
        <Reports
          user={user}
          onNavigate={
            handleNavigate
          }
          onLogout={
            handleLogout
          }
        />
      );

    case "notifications":
      return (
        <Notifications
          user={user}
          onNavigate={
            handleNavigate
          }
          onLogout={
            handleLogout
          }
        />
      );

    case "settings":
      return (
        <Settings
          user={user}
          onNavigate={
            handleNavigate
          }
          onLogout={
            handleLogout
          }
          onProfileUpdated={
            handleProfileUpdated
          }
        />
      );

    case "report-bug":
      return (
        <ReportBug
          user={user}
          onNavigate={
            handleNavigate
          }
          onLogout={
            handleLogout
          }
        />
      );

    case "developer-board":
      return (
        <DeveloperBoard
          user={user}
          onNavigate={
            handleNavigate
          }
          onLogout={
            handleLogout
          }
        />
      );

    case "dashboard":
    default:
      return (
        <Dashboard
          user={user}
          onNavigate={
            handleNavigate
          }
          onLogout={
            handleLogout
          }
        />
      );
  }
}

createRoot(
  document.getElementById(
    "root",
  ),
).render(
  <StrictMode>
    <Main />
  </StrictMode>,
);
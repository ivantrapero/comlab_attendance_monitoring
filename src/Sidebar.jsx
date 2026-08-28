import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  Bell,
  Settings,
  LogOut,
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useState } from "react";

import "./Sidebar.css";

function Sidebar({
  user,
  onLogout,
  onNavigate,
  currentPage = "dashboard",
  sidebarOpen = false,
}) {
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("comlab-sidebar-collapsed") === "true",
  );
  const [isLightMode, setIsLightMode] = useState(
    () => document.documentElement.dataset.theme === "light",
  );

  const navigate = (page) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  const toggleTheme = () => {
    const nextTheme = isLightMode ? "dark" : "light";

    document.documentElement.dataset.theme = nextTheme;
    localStorage.setItem("comlab-theme", nextTheme);
    setIsLightMode(nextTheme === "light");
  };

  const toggleSidebar = () => {
    const nextCollapsed = !isCollapsed;

    localStorage.setItem("comlab-sidebar-collapsed", String(nextCollapsed));
    setIsCollapsed(nextCollapsed);
  };

  return (
    <aside
      className={`app-sidebar ${
        isCollapsed ? "sidebar-collapsed" : ""
      } ${sidebarOpen ? "sidebar-open" : ""}`}
    >
      {/* BRAND */}
      {/* NAVIGATION */}
      <button
        type="button"
        className="sidebar-collapse-button"
        onClick={toggleSidebar}
        aria-label={`${isCollapsed ? "Expand" : "Collapse"} sidebar`}
        title={`${isCollapsed ? "Expand" : "Collapse"} sidebar`}
      >
        {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        <span>{isCollapsed ? "Expand" : "Collapse"}</span>
      </button>

      <nav className="sidebar-nav">
        <p className="nav-title">MAIN MENU</p>

        <button
          type="button"
          className={`nav-item ${
            currentPage === "dashboard" ? "active" : ""
          }`}
          onClick={() => navigate("dashboard")}
        >
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          className={`nav-item ${
            currentPage === "attendance" ? "active" : ""
          }`}
          onClick={() => navigate("attendance")}
        >
          <ClipboardCheck size={18} />
          <span>Attendance</span>
        </button>

        <button
          type="button"
          className={`nav-item ${
            currentPage === "reports" ? "active" : ""
          }`}
          onClick={() => navigate("reports")}
        >
          <FileText size={18} />
          <span>Reports</span>
        </button>

        <button
          type="button"
          className={`nav-item ${
            currentPage === "notifications" ? "active" : ""
          }`}
          onClick={() => navigate("notifications")}
        >
          <Bell size={18} />
          <span>Notifications</span>
        </button>

        <button
          type="button"
          className={`nav-item ${
            currentPage === "settings" ? "active" : ""
          }`}
          onClick={() => navigate("settings")}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>

      </nav>

      {/* USER / LOGOUT */}
      <div className="sidebar-bottom">
        <button
          type="button"
          className="theme-toggle-button"
          onClick={toggleTheme}
          aria-label={`Switch to ${isLightMode ? "dark" : "light"} mode`}
          title={`Switch to ${isLightMode ? "dark" : "light"} mode`}
        >
          {isLightMode ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {(user?.name || "Admin")
              .charAt(0)
              .toUpperCase()}
          </div>

          <div>
            <strong>
              {user?.name || "Administrator"}
            </strong>

            <span>
              {user?.role || "Administrator"}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={onLogout}
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
import {
  LayoutDashboard,
  ClipboardCheck,
  FileText,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";

import "./Sidebar.css";

function Sidebar({
  user,
  onLogout,
  onNavigate,
  currentPage = "dashboard",
}) {
  const navigate = (page) => {
    if (onNavigate) {
      onNavigate(page);
    }
  };

  return (
    <aside className="app-sidebar">
      {/* BRAND */}
      {/* NAVIGATION */}
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
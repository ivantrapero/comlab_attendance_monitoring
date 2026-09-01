import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Clock3,
  AlertTriangle,
  Search,
  CalendarDays,
} from "lucide-react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";
import Sidebar from "./Sidebar";
import "./Notifications.css";

function Notifications({ user, onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [userProfiles, setUserProfiles] = useState([]);
  const [search, setSearch] = useState("");
  const [expandedDates, setExpandedDates] = useState({});

  useEffect(() => {
    const attendanceRef = collection(db, "attendance");
    const attendanceQuery = query(attendanceRef, orderBy("createdAt", "desc"));

    const attendanceUnsubscribe = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setAttendance(data);
      },
      (error) => {
        if (
          error?.code === "permission-denied" ||
          error?.message?.toLowerCase().includes("permission") ||
          error?.message?.toLowerCase().includes("insufficient permissions")
        ) {
          setAttendance([]);
          return;
        }

        console.error("Error loading attendance notifications:", error);
      }
    );

    const usersRef = collection(db, "users");
    const usersQuery = query(usersRef, orderBy("updatedAt", "desc"));

    const usersUnsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setUserProfiles(data);
      },
      (error) => {
        if (
          error?.code === "permission-denied" ||
          error?.message?.toLowerCase().includes("permission") ||
          error?.message?.toLowerCase().includes("insufficient permissions")
        ) {
          setUserProfiles([]);
          return;
        }

        console.error("Error loading user activity notifications:", error);
      }
    );

    return () => {
      attendanceUnsubscribe();
      usersUnsubscribe();
    };
  }, []);

  const getTimestampValue = (value) => {
    if (!value) {
      return Number.NEGATIVE_INFINITY;
    }

    if (typeof value?.toDate === "function") {
      return value.toDate().getTime();
    }

    if (value instanceof Date) {
      return value.getTime();
    }

    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? Number.NEGATIVE_INFINITY : parsed.getTime();
    }

    return Number.NEGATIVE_INFINITY;
  };

  const formatNotificationDateTime = (value) => {
    const timestamp = getTimestampValue(value);

    if (!Number.isFinite(timestamp)) {
      return "Recent";
    }

    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const notifications = useMemo(() => {
    const attendanceEvents = attendance
      .map((record) => {
        const createdAt = record.createdAt || Date.now();
        const createdAtValue = getTimestampValue(createdAt);
        const dateLabel = formatNotificationDateTime(createdAt);

        if (record.timeOut) {
          return {
            id: `${record.id}-timeout-recorded`,
            type: "timeout",
            title: "Time-out recorded",
            detail: `${record.instructor} (${record.subject}) recorded their time out at ${record.timeOut}.`,
            time: dateLabel,
            createdAt: createdAtValue,
          };
        }

        if (record.status === "Absent") {
          return {
            id: `${record.id}-absence`,
            type: "absence",
            title: "Attendance absence",
            detail: `${record.instructor} (${record.subject}) was marked absent${record.reason ? ` — ${record.reason}` : ""}.`,
            time: dateLabel,
            createdAt: createdAtValue,
          };
        }

        return null;
      })
      .filter(Boolean);

    const userEvents = userProfiles
      .map((profile) => {
        const createdAt = profile.updatedAt || profile.createdAt || Date.now();
        const createdAtValue = getTimestampValue(createdAt);
        const dateLabel = formatNotificationDateTime(createdAt);

        const name = profile.name || profile.email || "User";
        const role = profile.role || "Working";

        return {
          id: `${profile.id || profile.uid || profile.email}-profile-update`,
          type: "info",
          title: "User role updated",
          detail: `${name} was updated to ${role} role in the system.`,
          time: dateLabel,
          createdAt: createdAtValue,
        };
      })
      .filter((item) => item.detail && item.id);

    return [...attendanceEvents, ...userEvents]
      .filter((item) => {
        const keyword = search.trim().toLowerCase();

        if (!keyword) {
          return true;
        }

        return (
          item.title.toLowerCase().includes(keyword) ||
          item.detail.toLowerCase().includes(keyword)
        );
      })
      .sort((a, b) => {
        const left = Number.isFinite(a.createdAt) ? a.createdAt : Number.NEGATIVE_INFINITY;
        const right = Number.isFinite(b.createdAt) ? b.createdAt : Number.NEGATIVE_INFINITY;
        return right - left;
      });
  }, [attendance, userProfiles, search]);

  const groupedNotifications = useMemo(() => {
    const groups = new Map();

    notifications.forEach((item) => {
      const timestamp = Number.isFinite(item.createdAt) ? item.createdAt : Date.now();
      const dateKey = new Date(timestamp).toDateString();
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey).push(item);
    });

    return [...groups.entries()].map(([dateKey, items]) => ({
      dateKey,
      label: (() => {
        const date = new Date(dateKey);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
          return "Today";
        }

        if (date.toDateString() === yesterday.toDateString()) {
          return "Yesterday";
        }

        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      })(),
      items,
    }));
  }, [notifications]);

  const toggleDateGroup = (dateKey) => {
    setExpandedDates((current) => ({
      ...current,
      [dateKey]: !current[dateKey],
    }));
  };

  const navigate = (page) => {
    setSidebarOpen(false);
    if (onNavigate) {
      onNavigate(page);
    }
  };

  return (
    <div className="notifications-page">
      <Sidebar
        user={user}
        onLogout={onLogout}
        onNavigate={navigate}
        currentPage="notifications"
        sidebarOpen={sidebarOpen}
      />

      <main className="notifications-main">
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
              <h1>Notifications</h1>
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

        <div className="notifications-content">
          <section className="notifications-panel">
            <div className="notifications-header">
              <div>
                <span className="section-tag">LAB ALERTS</span>
                <h2>Notifications</h2>
              </div>
            </div>

            <div className="notification-search-wrap">
              <div className="notification-search">
                <Search size={15} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search notifications"
                />
              </div>
            </div>

            {groupedNotifications.length > 0 ? (
              <div className="notification-list">
                {groupedNotifications.map(({ dateKey, label, items }) => {
                  const isOpen = expandedDates[dateKey] !== false;

                  return (
                    <div key={dateKey} className="notification-date-group">
                      <button
                        type="button"
                        className="notification-date-toggle"
                        onClick={() => toggleDateGroup(dateKey)}
                      >
                        <span>{label}</span>
                        <span className={`toggle-indicator ${isOpen ? "open" : ""}`}>
                          ▾
                        </span>
                      </button>

                      {isOpen && (
                        <div className="notification-date-items">
                          {items.map((item) => (
                            <div key={item.id} className={`notification-card ${item.type}`}>
                              <div className="notification-card-icon">
                                {item.type === "timeout" ? (
                                  <AlertTriangle size={18} />
                                ) : (
                                  <Clock3 size={18} />
                                )}
                              </div>

                              <div className="notification-card-body">
                                <div className="notification-card-top">
                                  <strong>{item.title}</strong>
                                  <span>{item.time}</span>
                                </div>

                                <p>{item.detail}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state">
                <Bell size={28} />
                <h3>No active alerts</h3>
                <p>There are no attendance changes to display right now.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default Notifications;

import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Clock3,
  AlertTriangle,
  Search,
  CalendarDays,
  ArrowRight,
} from "lucide-react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";
import Sidebar from "./Sidebar";
import "./Notifications.css";

function Notifications({ user, onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const attendanceRef = collection(db, "attendance");
    const attendanceQuery = query(attendanceRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const data = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        setAttendance(data);
      },
      (error) => {
        console.error("Error loading attendance notifications:", error);
      }
    );

    return () => unsubscribe();
  }, []);

  const parseTimeValue = (value) => {
    if (!value || typeof value !== "string") {
      return null;
    }

    const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (!match) {
      return null;
    }

    const hourValue = Number(match[1]);
    const minuteValue = Number(match[2]);
    const period = match[3].toUpperCase();

    if (
      Number.isNaN(hourValue) ||
      Number.isNaN(minuteValue) ||
      hourValue < 1 ||
      hourValue > 12 ||
      minuteValue < 0 ||
      minuteValue > 59
    ) {
      return null;
    }

    let hour = hourValue;

    if (period === "AM" && hour === 12) {
      hour = 0;
    }

    if (period === "PM" && hour !== 12) {
      hour += 12;
    }

    return hour * 60 + minuteValue;
  };

  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();

  const notifications = useMemo(() => {
    return attendance
      .map((record) => {
        const createdAt = record.createdAt || Date.now();
        const createdDate = new Date(createdAt);
        const timeLabel = Number.isNaN(createdDate.getTime())
          ? "Recent"
          : createdDate.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            });

        if (record.timeOut) {
          return {
            id: `${record.id}-timeout-recorded`,
            type: "timeout",
            title: "Timeout recorded",
            detail: `${record.instructor} (${record.subject}) recorded their time out at ${record.timeOut}.`,
            time: timeLabel,
            record,
            createdAt,
          };
        }

        if (record.status === "Absent") {
          return {
            id: `${record.id}-absence`,
            type: "absence",
            title: "Attendance update",
            detail: `${record.instructor} (${record.subject}) was marked absent${record.reason ? ` — ${record.reason}` : ""}.`,
            time: timeLabel,
            record,
            createdAt,
          };
        }

        if (record.status === "Present" && record.timeIn && record.endTime) {
          const endMinutes = parseTimeValue(record.endTime);

          if (endMinutes !== null && currentMinutes >= endMinutes - 5 && currentMinutes < endMinutes) {
            return {
              id: `${record.id}-warning`,
              type: "warning",
              title: "Class ending soon",
              detail: `${record.instructor} (${record.subject}) ends in 5 minutes at ${record.endTime}.`,
              time: timeLabel,
              record,
              createdAt,
            };
          }

          if (endMinutes !== null && currentMinutes >= endMinutes) {
            return {
              id: `${record.id}-timeout`,
              type: "timeout",
              title: "Time out required",
              detail: `${record.instructor} (${record.subject}) needs time out recorded before the next class begins.`,
              time: timeLabel,
              record,
              createdAt,
            };
          }

          return {
            id: `${record.id}-checkin`,
            type: "checkin",
            title: "Attendance recorded",
            detail: `${record.instructor} (${record.subject}) checked in at ${record.timeIn} and is scheduled to end at ${record.endTime}.`,
            time: timeLabel,
            record,
            createdAt,
          };
        }

        if (record.status === "Present" && record.timeIn) {
          return {
            id: `${record.id}-present`,
            type: "checkin",
            title: "Attendance recorded",
            detail: `${record.instructor} (${record.subject}) checked in at ${record.timeIn}.`,
            time: timeLabel,
            record,
            createdAt,
          };
        }

        return {
          id: `${record.id}-update`,
          type: "info",
          title: "System update",
          detail: `${record.instructor} (${record.subject}) attendance was updated in the system.`,
          time: timeLabel,
          record,
          createdAt,
        };
      })
      .filter((item) => {
        const keyword = search.trim().toLowerCase();

        if (!keyword) {
          return true;
        }

        return (
          item.title.toLowerCase().includes(keyword) ||
          item.detail.toLowerCase().includes(keyword) ||
          item.record?.instructor?.toLowerCase().includes(keyword) ||
          item.record?.subject?.toLowerCase().includes(keyword)
        );
      })
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [attendance, currentMinutes, search]);

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
                <span className="section-tag">SYSTEM ALERTS</span>
                <h2>Attendance changes</h2>
              </div>

              <div className="notifications-count">
                <Bell size={15} />
                {notifications.length}
              </div>
            </div>

            <div className="notification-search">
              <Search size={15} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notifications"
              />
            </div>

            {notifications.length > 0 ? (
              <div className="notification-list">
                {notifications.map((item) => (
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

                    <button type="button" className="notification-link" onClick={() => navigate("attendance")}>
                      View <ArrowRight size={14} />
                    </button>
                  </div>
                ))}
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

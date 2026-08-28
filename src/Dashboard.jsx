import {
  ClipboardCheck,
  FileText,
  Menu,
  Search,
  UserCheck,
  UserX,
  Timer,
  CalendarDays,
  ArrowRight,
  X,
} from "lucide-react";

import { useEffect, useState } from "react";

import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

import { db } from "./firebase";
import Sidebar from "./Sidebar";

import "./Dashboard.css";

function Dashboard({ user, onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [search, setSearch] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(true);

  const navigate = (page) => {
    setSidebarOpen(false);

    if (onNavigate) {
      onNavigate(page);
    }
  };

  /* =========================================
     LOAD ATTENDANCE
  ========================================= */

  useEffect(() => {
    const attendanceRef = collection(db, "attendance");

    const attendanceQuery = query(
      attendanceRef,
      orderBy("createdAt", "desc")
    );

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
        console.error(
          "Error loading attendance:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /* =========================================
     DATE
  ========================================= */

  const today = new Date().toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  );

  const currentHour = new Date().getHours();
  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";

  /* =========================================
     TODAY'S RECORDS
  ========================================= */

  const todayRecords = attendance.filter(
    (record) => record.date === today
  );

  const parseTimeValue = (value) => {
    if (!value || typeof value !== "string") {
      return null;
    }

    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (!match) {
      return null;
    }

    const hourValue = Number(match[1]);
    const minuteValue = Number(match[2]);
    const period = match[3].toUpperCase();

    if (
      Number.isNaN(hourValue) ||
      Number.isNaN(minuteValue) ||
      minuteValue < 0 ||
      minuteValue > 59 ||
      hourValue < 1 ||
      hourValue > 12
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

  const currentMinutes =
    currentTime.getHours() * 60 + currentTime.getMinutes();

  const liveNotifications = attendance
    .filter(
      (record) =>
        record.status === "Present" &&
        record.timeIn &&
        !record.timeOut &&
        record.endTime
    )
    .map((record) => {
      const endMinutes = parseTimeValue(record.endTime);

      if (endMinutes === null) {
        return null;
      }

      if (
        currentMinutes >= endMinutes - 5 &&
        currentMinutes < endMinutes
      ) {
        return {
          id: `${record.id}-warning`,
          type: "warning",
          title: "Class ending soon",
          message: `${record.instructor} (${record.subject}) ends in 5 minutes.`,
          time: record.endTime,
        };
      }

      if (currentMinutes >= endMinutes) {
        return {
          id: `${record.id}-timeout`,
          type: "timeout",
          title: "Time out required",
          message: `${record.instructor} (${record.subject}) needs time out recorded.`,
          time: record.endTime,
        };
      }

      return null;
    })
    .filter(Boolean)
    .slice(0, 4);

  const notificationCount = liveNotifications.length;

  useEffect(() => {
    if (notificationCount > 0) {
      setNotificationDrawerOpen(true);

      const timer = window.setTimeout(() => {
        setNotificationDrawerOpen(false);
      }, 4000);

      return () => window.clearTimeout(timer);
    }

    setNotificationDrawerOpen(false);
  }, [notificationCount]);

  const totalRecords = todayRecords.length;

  const present = todayRecords.filter(
    (record) => record.status === "Present"
  ).length;

  const absent = todayRecords.filter(
    (record) => record.status === "Absent"
  ).length;

  const currentlyIn = todayRecords.filter(
    (record) =>
      record.status === "Present" &&
      record.timeIn &&
      !record.timeOut
  ).length;

  const completed = todayRecords.filter(
    (record) =>
      record.status === "Present" &&
      record.timeIn &&
      record.timeOut
  ).length;

  /* =========================================
     SEARCH
  ========================================= */

  const filteredRecords = todayRecords.filter(
    (record) => {
      const instructor =
        record.instructor?.toLowerCase() || "";

      const subject =
        record.subject?.toLowerCase() || "";

      const searchValue =
        search.toLowerCase();

      return (
        instructor.includes(searchValue) ||
        subject.includes(searchValue)
      );
    }
  );

  return (
    <div className="dashboard">
      {notificationCount > 0 && (
        <aside
          className={`notification-drawer ${notificationDrawerOpen ? "open" : ""}`}
          aria-live="polite"
        >
          <div className="notification-drawer-header">
            <div>
              <span className="drawer-label">System changes</span>
              <strong>{notificationCount} active</strong>
            </div>

            <button
              type="button"
              className="notification-close"
              aria-label="Close notifications"
              onClick={() => setNotificationDrawerOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div className="notification-drawer-list">
            {liveNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-drawer-item ${notification.type}`}
              >
                <div className="notification-drawer-badge" />
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* =====================================
          SIDEBAR
      ===================================== */}

      <Sidebar
        user={user}
        onLogout={onLogout}
        onNavigate={onNavigate}
        currentPage="dashboard"
        sidebarOpen={sidebarOpen}
      />

      {/* =====================================
          MAIN
      ===================================== */}

      <main className="dashboard-main">

        {/* ===================================
            TOPBAR
        =================================== */}

        <header className="topbar">

          <div className="topbar-left">

            <button
              type="button"
              className="mobile-menu"
              onClick={() =>
                setSidebarOpen(
                  !sidebarOpen
                )
              }
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>

            <div className="topbar-title">
              <span>
                COMPUTER LABORATORY
              </span>

              <h1>Dashboard</h1>
            </div>

          </div>

          <div className="topbar-actions">
            <div className="topbar-user">

              <div className="user-avatar">
                {(user?.name || "Admin")
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>
                  {user?.name ||
                    "Administrator"}
                </strong>

                <span>Online</span>
              </div>

            </div>

          </div>

        </header>

        {/* ===================================
            CONTENT
        =================================== */}

        <div className="dashboard-content">

          {/* =================================
              WELCOME
          ================================= */}

          <section className="welcome-section">

            <div>

              <h2>
                {greeting},{" "}
                {user?.name ||
                  "Administrator"}
              </h2>

              <p>
                Here's the attendance overview
                for the Computer Laboratory on
                {" "}
                {today}.
              </p>

            </div>

            <button
              type="button"
              className="record-button"
              onClick={() =>
                navigate("attendance")
              }
            >
              <ClipboardCheck size={18} />

              Record Attendance
            </button>

          </section>

          {/* =================================
              STATISTICS
          ================================= */}

          <section className="stats-grid">

            <div className="stat-card">

              <div className="stat-icon gold">
                <ClipboardCheck size={21} />
              </div>

              <div>
                <span>
                  Today's Records
                </span>

                <strong>
                  {totalRecords}
                </strong>

                <small>
                  Attendance entries
                </small>
              </div>

            </div>

            <div className="stat-card">

              <div className="stat-icon green">
                <UserCheck size={21} />
              </div>

              <div>
                <span>Present</span>

                <strong>
                  {present}
                </strong>

                <small>
                  Present instructors
                </small>
              </div>

            </div>

            <div className="stat-card">

              <div className="stat-icon red">
                <UserX size={21} />
              </div>

              <div>
                <span>Absent</span>

                <strong>
                  {absent}
                </strong>

                <small>
                  Absent instructors
                </small>
              </div>

            </div>

          </section>

          {/* =================================
              QUICK ACTIONS
          ================================= */}

          <section className="quick-section">

            <div className="section-header">

              <div>
                <h3>
                  Quick Actions
                </h3>

                <p>
                  Common attendance tasks
                </p>
              </div>

            </div>

            <div className="quick-grid">

              <button
                type="button"
                className="quick-card"
                onClick={() =>
                  navigate("attendance")
                }
              >

                <div className="quick-icon gold">
                  <ClipboardCheck size={20} />
                </div>

                <div>
                  <strong>
                    Record Attendance
                  </strong>

                  <span>
                    Add a new attendance
                    record
                  </span>
                </div>

                <ArrowRight size={15} />

              </button>

              <button
                type="button"
                className="quick-card"
                onClick={() =>
                  navigate("attendance")
                }
              >

                <div className="quick-icon green">
                  <CalendarDays size={20} />
                </div>

                <div>
                  <strong>
                    Attendance Records
                  </strong>

                  <span>
                    View previous attendance
                  </span>
                </div>

                <ArrowRight size={15} />

              </button>

              <button
                type="button"
                className="quick-card"
                onClick={() =>
                  navigate("reports")
                }
              >

                <div className="quick-icon orange">
                  <FileText size={20} />
                </div>

                <div>
                  <strong>
                    Generate Report
                  </strong>

                  <span>
                    Export attendance to
                    Excel
                  </span>
                </div>

                <ArrowRight size={15} />

              </button>

            </div>

          </section>

          {/* =================================
              TODAY'S ATTENDANCE
          ================================= */}

          <section className="attendance-section">

            <div className="section-header">

              <div>

                <h3>
                  Today's Attendance
                </h3>

                <p>
                  Recent instructor
                  attendance records.
                </p>

              </div>

              <button
                type="button"
                className="view-all"
                onClick={() =>
                  navigate("attendance")
                }
              >
                View All

                <ArrowRight size={13} />
              </button>

            </div>

            {/* TABLE TOOLS */}

            <div className="table-tools">

              <div className="search-box">

                <Search size={17} />

                <input
                  type="text"
                  placeholder="Search instructor..."
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                />

              </div>

              <div className="date-display">

                <CalendarDays size={14} />

                {today}

              </div>

            </div>

            {/* TABLE */}

            <div className="table-wrapper">

              <table>

                <thead>

                  <tr>
                    <th>Instructor</th>
                    <th>Subject</th>
                    <th>Time In</th>
                    <th>Time Out</th>
                    <th>Status</th>
                    <th>Recorded By</th>
                  </tr>

                </thead>

                <tbody>

                  {filteredRecords.length > 0 ? (

                    filteredRecords.map(
                      (record) => (

                        <tr key={record.id}>

                          <td>

                            <div className="instructor-cell">

                              <div className="table-avatar">
                                {record.instructor
                                  ?.charAt(0)
                                  .toUpperCase()}
                              </div>

                              <strong>
                                {record.instructor ||
                                  "Unknown"}
                              </strong>

                            </div>

                          </td>

                          <td>
                            {record.subject ||
                              "—"}
                          </td>

                          <td>
                            {record.timeIn ||
                              "—"}
                          </td>

                          <td>

                            {record.timeOut ? (
                              record.timeOut
                            ) : (
                              <span className="no-timeout">
                                —
                              </span>
                            )}

                          </td>

                          <td>

                            <span
                              className={`status ${
                                record.status
                                  ?.toLowerCase()
                                  .replace(
                                    /\s+/g,
                                    "-"
                                  ) || ""
                              }`}
                            >
                              {record.status ||
                                "Unknown"}
                            </span>

                          </td>

                          <td>
                            {record.recordedBy ||
                              "—"}
                          </td>

                        </tr>

                      )
                    )

                  ) : (

                    <tr>

                      <td
                        colSpan="6"
                        className="no-records"
                      >
                        {search
                          ? "No attendance records match your search."
                          : "No attendance records found for today."}
                      </td>

                    </tr>

                  )}

                </tbody>

              </table>

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}

export default Dashboard;
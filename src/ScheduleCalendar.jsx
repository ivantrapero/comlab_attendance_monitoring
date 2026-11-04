import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Menu,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import Sidebar from "./Sidebar";
import BugReportButton from "./BugReportButton";
import { db } from "./firebase";
import "./ScheduleCalendar.css";

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const EMPTY_FORM = {
  instructor: "",
  subject: "",
  dayOfWeek: "",
  startTime: "",
  endTime: "",
};

const pad = (value) => String(value).padStart(2, "0");

const dateKey = (date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const getRecordDateKey = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDate) {
      return value;
    }
  }

  const parsedDate = value?.toDate
    ? value.toDate()
    : new Date(value);

  return Number.isNaN(parsedDate.getTime())
    ? ""
    : dateKey(parsedDate);
};

const parseTime = (value) => {
  const match = String(value || "")
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "PM") {
    hour += 12;
  }

  return `${pad(hour)}:${match[2]}`;
};

const formatTime = (value) => {
  const match = String(value || "")
    .match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return "";
  }

  const hour = Number(match[1]);
  const period = hour >= 12 ? "PM" : "AM";
  return `${pad(hour % 12 || 12)}:${match[2]} ${period}`;
};

const getScheduleAttendance = (schedule, records, date) =>
  records.find((record) =>
    getRecordDateKey(record.date) === dateKey(date) &&
    String(record.instructor || "").toLowerCase() ===
      String(schedule.instructor || "").toLowerCase() &&
    String(record.subject || "").toLowerCase() ===
      String(schedule.subject || "").toLowerCase() &&
    parseTime(record.startTime) === parseTime(schedule.startTime)
  );

function ScheduleCalendar({ user, onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [schedules, setSchedules] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let remaining = 3;
    const subscriptions = [
      onSnapshot(
        collection(db, "schedules"),
        (snapshot) => {
          setSchedules(snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })));
          remaining -= 1;
          if (remaining === 0) setLoading(false);
        },
        (error) => {
          console.error("Error loading schedules:", error);
          setErrorMessage(`Unable to load schedules: ${error.message}`);
          setLoading(false);
        },
      ),
      onSnapshot(
        collection(db, "instructors"),
        (snapshot) => {
          setInstructors(snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })));
          remaining -= 1;
          if (remaining === 0) setLoading(false);
        },
        (error) => {
          console.error("Error loading instructors:", error);
          setErrorMessage(`Unable to load instructors: ${error.message}`);
          setLoading(false);
        },
      ),
      onSnapshot(
        collection(db, "attendance"),
        (snapshot) => {
          setAttendance(snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })));
          remaining -= 1;
          if (remaining === 0) setLoading(false);
        },
        (error) => {
          console.error("Error loading attendance:", error);
          setErrorMessage(`Unable to load attendance: ${error.message}`);
          setLoading(false);
        },
      ),
    ];

    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, []);

  const selectedInstructor = instructors.find(
    (instructor) => instructor.name === form.instructor,
  );

  const calendarDays = useMemo(() => {
    const firstDay = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1,
    );
    const gridStart = new Date(
      firstDay.getFullYear(),
      firstDay.getMonth(),
      1 - firstDay.getDay(),
    );

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(
        gridStart.getFullYear(),
        gridStart.getMonth(),
        gridStart.getDate() + index,
      );
      const daySchedules = schedules.filter(
        (schedule) => Number(schedule.dayOfWeek) === date.getDay(),
      );
      const dayAttendance = attendance.filter(
        (record) => getRecordDateKey(record.date) === dateKey(date),
      );

      return {
        date,
        key: dateKey(date),
        schedules: daySchedules,
        attendance: dayAttendance,
      };
    });
  }, [attendance, schedules, visibleMonth]);

  const selectedSchedules = schedules
    .filter((schedule) => Number(schedule.dayOfWeek) === selectedDate.getDay())
    .sort((a, b) => (parseTime(a.startTime) || "").localeCompare(parseTime(b.startTime) || ""));

  const selectedAttendance = attendance.filter(
    (record) => getRecordDateKey(record.date) === dateKey(selectedDate),
  );

  const handleInstructorChange = (event) => {
    const instructor = instructors.find(
      (item) => item.name === event.target.value,
    );
    setForm((previous) => ({
      ...previous,
      instructor: event.target.value,
      subject: instructor?.subjects?.[0] || "",
    }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId("");
    setFormOpen(false);
  };

  const handleEdit = (schedule) => {
    setEditingId(schedule.id);
    setForm({
      instructor: schedule.instructor || "",
      subject: schedule.subject || "",
      dayOfWeek: String(schedule.dayOfWeek),
      startTime: parseTime(schedule.startTime) || "",
      endTime: parseTime(schedule.endTime) || "",
    });
    setFormOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (!form.startTime || !form.endTime || form.endTime <= form.startTime) {
      setErrorMessage("Choose an end time that is later than the class start time.");
      return;
    }

    const scheduleData = {
      instructor: form.instructor,
      subject: form.subject,
      dayOfWeek: Number(form.dayOfWeek),
      startTime: formatTime(form.startTime),
      endTime: formatTime(form.endTime),
      updatedAt: Date.now(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, "schedules", editingId), scheduleData);
      } else {
        await addDoc(collection(db, "schedules"), {
          ...scheduleData,
          createdAt: Date.now(),
        });
      }
      resetForm();
    } catch (error) {
      console.error("Error saving schedule:", error);
      setErrorMessage(`Unable to save schedule: ${error.message}`);
    }
  };

  const handleDelete = async (schedule) => {
    if (!window.confirm(`Delete ${schedule.instructor}'s ${schedule.subject} schedule?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, "schedules", schedule.id));
    } catch (error) {
      console.error("Error deleting schedule:", error);
      setErrorMessage(`Unable to delete schedule: ${error.message}`);
    }
  };

  const changeMonth = (amount) => {
    setVisibleMonth((month) =>
      new Date(month.getFullYear(), month.getMonth() + amount, 1),
    );
  };

  const monthLabel = visibleMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="schedule-page">
      <BugReportButton user={user} />
      <Sidebar
        user={user}
        onLogout={onLogout}
        onNavigate={onNavigate}
        currentPage="calendar"
        sidebarOpen={sidebarOpen}
      />

      <main className="schedule-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <div className="topbar-title">
              <span>COMPUTER LABORATORY</span>
              <h1>Schedule Calendar</h1>
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

        <div className="schedule-content">
          <section className="schedule-heading">
            <div>
              <h2>Class Schedule & Attendance</h2>
              <p>Manage recurring weekly classes and review attendance by date.</p>
            </div>
            <button
              type="button"
              className="schedule-primary-button"
              onClick={() => {
                resetForm();
                setFormOpen(true);
              }}
            >
              <Plus size={17} />
              Add Schedule
            </button>
          </section>

          {errorMessage && (
            <div className="schedule-error" role="alert">
              {errorMessage}
              <button type="button" onClick={() => setErrorMessage("")} aria-label="Dismiss error">
                <X size={15} />
              </button>
            </div>
          )}

          <section className="schedule-calendar-card">
            <div className="calendar-toolbar">
              <div>
                <span>WEEKLY VIEW</span>
                <h3>{monthLabel}</h3>
              </div>
              <div className="calendar-month-actions">
                <button type="button" onClick={() => changeMonth(-1)} aria-label="Previous month">
                  <ChevronLeft size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = new Date();
                    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
                    setSelectedDate(today);
                  }}
                >
                  Today
                </button>
                <button type="button" onClick={() => changeMonth(1)} aria-label="Next month">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="calendar-grid">
              {WEEKDAYS.map((day) => (
                <div className="calendar-weekday" key={day}>{day.slice(0, 3)}</div>
              ))}
              {calendarDays.map((day) => {
                const isSelected = day.key === dateKey(selectedDate);
                const isToday = day.key === dateKey(new Date());
                return (
                  <button
                    type="button"
                    key={day.key}
                    className={`calendar-day ${
                      day.date.getMonth() === visibleMonth.getMonth() ? "" : "outside-month"
                    } ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
                    onClick={() => {
                      setSelectedDate(day.date);
                      if (day.date.getMonth() !== visibleMonth.getMonth()) {
                        setVisibleMonth(new Date(
                          day.date.getFullYear(),
                          day.date.getMonth(),
                          1,
                        ));
                      }
                    }}
                  >
                    <span className="calendar-day-number">{day.date.getDate()}</span>
                    <span className="calendar-day-counts">
                      {day.schedules.length > 0 && (
                        <span className="calendar-count scheduled">
                          {day.schedules.length} class{day.schedules.length === 1 ? "" : "es"}
                        </span>
                      )}
                      {day.attendance.length > 0 && (
                        <span className="calendar-count recorded">
                          {day.attendance.length} recorded
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="calendar-legend">
              <span><i className="scheduled-dot" /> Recurring classes</span>
              <span><i className="recorded-dot" /> Attendance recorded</span>
            </div>
          </section>

          <section className="selected-day-card">
            <div className="selected-day-heading">
              <div>
                <span>SELECTED DAY</span>
                <h3>{selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}</h3>
              </div>
              <CalendarDays size={20} />
            </div>

            {loading ? (
              <p className="schedule-empty">Loading calendar data...</p>
            ) : selectedSchedules.length === 0 && selectedAttendance.length === 0 ? (
              <p className="schedule-empty">No scheduled classes or attendance records for this day.</p>
            ) : (
              <div className="selected-day-list">
                {selectedSchedules.map((schedule) => {
                  const record = getScheduleAttendance(schedule, attendance, selectedDate);
                  const status = record?.status || "Scheduled";
                  return (
                    <article className="selected-day-event" key={schedule.id}>
                      <div className="event-time">
                        <Clock3 size={15} />
                        <span>{schedule.startTime} – {schedule.endTime}</span>
                      </div>
                      <div className="event-details">
                        <strong>{schedule.instructor}</strong>
                        <span>{schedule.subject}</span>
                      </div>
                      <span className={`event-status ${status.toLowerCase().replace(/\s+/g, "-")}`}>
                        {status}
                      </span>
                    </article>
                  );
                })}
                {selectedAttendance
                  .filter((record) => !selectedSchedules.some((schedule) =>
                    String(schedule.instructor || "").toLowerCase() ===
                      String(record.instructor || "").toLowerCase() &&
                    String(schedule.subject || "").toLowerCase() ===
                      String(record.subject || "").toLowerCase() &&
                    parseTime(schedule.startTime) === parseTime(record.startTime)
                  ))
                  .map((record) => (
                    <article className="selected-day-event recorded-event" key={record.id}>
                      <div className="event-time">
                        <Clock3 size={15} />
                        <span>{record.startTime || "Time not set"}</span>
                      </div>
                      <div className="event-details">
                        <strong>{record.instructor}</strong>
                        <span>{record.subject} · attendance record</span>
                      </div>
                      <span className={`event-status ${(record.status || "").toLowerCase()}`}>
                        {record.status || "Recorded"}
                      </span>
                    </article>
                  ))}
              </div>
            )}
          </section>

          <section className="schedule-list-card">
            <div className="schedule-list-heading">
              <div>
                <h3>Recurring Weekly Schedules</h3>
                <p>These weekly classes drive upcoming and overdue reminders.</p>
              </div>
            </div>
            {schedules.length === 0 ? (
              <p className="schedule-empty">No recurring schedules yet. Add one to enable class reminders.</p>
            ) : (
              <div className="schedule-list">
                {[...schedules]
                  .sort((a, b) =>
                    Number(a.dayOfWeek) - Number(b.dayOfWeek) ||
                    (parseTime(a.startTime) || "").localeCompare(parseTime(b.startTime) || "")
                  )
                  .map((schedule) => (
                    <article className="schedule-list-item" key={schedule.id}>
                      <div className="schedule-day-badge">{WEEKDAYS[Number(schedule.dayOfWeek)]?.slice(0, 3)}</div>
                      <div className="schedule-list-details">
                        <strong>{schedule.instructor}</strong>
                        <span>{schedule.subject}</span>
                      </div>
                      <div className="schedule-list-time">{schedule.startTime} – {schedule.endTime}</div>
                      <div className="schedule-item-actions">
                        <button type="button" onClick={() => handleEdit(schedule)} aria-label="Edit schedule">
                          <Pencil size={15} />
                        </button>
                        <button type="button" onClick={() => handleDelete(schedule)} aria-label="Delete schedule">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {formOpen && (
        <div className="schedule-modal-overlay" role="presentation">
          <section className="schedule-modal" role="dialog" aria-modal="true" aria-labelledby="schedule-form-title">
            <div className="schedule-modal-heading">
              <div>
                <span>WEEKLY TIMETABLE</span>
                <h2 id="schedule-form-title">{editingId ? "Edit Schedule" : "Add Recurring Schedule"}</h2>
              </div>
              <button type="button" onClick={resetForm} aria-label="Close schedule form">
                <X size={19} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <label>
                Instructor
                <select value={form.instructor} onChange={handleInstructorChange} required>
                  <option value="">Select instructor</option>
                  {instructors.map((instructor) => (
                    <option key={instructor.id} value={instructor.name}>{instructor.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Subject
                <select
                  value={form.subject}
                  onChange={(event) => setForm((previous) => ({ ...previous, subject: event.target.value }))}
                  required
                  disabled={!selectedInstructor}
                >
                  <option value="">Select subject</option>
                  {(selectedInstructor?.subjects || []).map((subject) => (
                    <option key={subject} value={subject}>{subject}</option>
                  ))}
                </select>
              </label>
              <label>
                Day of week
                <select
                  value={form.dayOfWeek}
                  onChange={(event) => setForm((previous) => ({ ...previous, dayOfWeek: event.target.value }))}
                  required
                >
                  <option value="">Select day</option>
                  {WEEKDAYS.map((day, index) => (
                    <option key={day} value={index}>{day}</option>
                  ))}
                </select>
              </label>
              <div className="schedule-time-inputs">
                <label>
                  Start time
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(event) => setForm((previous) => ({ ...previous, startTime: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  End time
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(event) => setForm((previous) => ({ ...previous, endTime: event.target.value }))}
                    required
                  />
                </label>
              </div>
              <div className="schedule-modal-actions">
                <button type="button" className="schedule-secondary-button" onClick={resetForm}>Cancel</button>
                <button type="submit" className="schedule-primary-button">
                  <Plus size={16} />
                  {editingId ? "Save Changes" : "Save Schedule"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default ScheduleCalendar;

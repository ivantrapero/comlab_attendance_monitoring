import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Menu,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  writeBatch,
} from "firebase/firestore";
import Sidebar from "./Sidebar";
import BugReportButton from "./BugReportButton";
import { db } from "./firebase";
import "./InstructorDirectory.css";

const EMPTY_FORM = {
  name: "",
  subjects: [""],
};

function InstructorDirectory({ user, onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [instructors, setInstructors] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let remaining = 3;
    const finishLoading = () => {
      remaining -= 1;
      if (remaining === 0) setLoading(false);
    };

    const subscriptions = [
      onSnapshot(
        collection(db, "instructors"),
        (snapshot) => {
          setInstructors(snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })));
          finishLoading();
        },
        (error) => {
          console.error("Error loading instructors:", error);
          setErrorMessage(`Unable to load instructors: ${error.message}`);
          finishLoading();
        },
      ),
      onSnapshot(
        collection(db, "schedules"),
        (snapshot) => {
          setSchedules(snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })));
          finishLoading();
        },
        (error) => {
          console.error("Error loading schedules:", error);
          setErrorMessage(`Unable to load instructor schedules: ${error.message}`);
          finishLoading();
        },
      ),
      onSnapshot(
        collection(db, "attendance"),
        (snapshot) => {
          setAttendance(snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })));
          finishLoading();
        },
        (error) => {
          console.error("Error loading attendance history:", error);
          setErrorMessage(`Unable to load attendance history: ${error.message}`);
          finishLoading();
        },
      ),
    ];

    return () => subscriptions.forEach((unsubscribe) => unsubscribe());
  }, []);

  const filteredInstructors = useMemo(() => {
    const term = search.trim().toLowerCase();
    return [...instructors]
      .filter((instructor) => {
        const subjects = Array.isArray(instructor.subjects)
          ? instructor.subjects
          : [];
        return !term ||
          String(instructor.name || "").toLowerCase().includes(term) ||
          subjects.some((subject) => String(subject).toLowerCase().includes(term));
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [instructors, search]);

  const selectedInstructor =
    instructors.find((instructor) => instructor.id === selectedId) ||
    filteredInstructors[0] ||
    null;

  const selectedName = String(selectedInstructor?.name || "").toLowerCase();
  const instructorSchedules = schedules.filter(
    (schedule) => String(schedule.instructor || "").toLowerCase() === selectedName,
  );
  const instructorAttendance = attendance.filter(
    (record) => String(record.instructor || "").toLowerCase() === selectedName,
  );
  const presentCount = instructorAttendance.filter(
    (record) => record.status === "Present" || record.status === "Late",
  ).length;
  const absentCount = instructorAttendance.filter(
    (record) => record.status === "Absent",
  ).length;

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId("");
    setFormOpen(false);
  };

  const openAddForm = () => {
    setErrorMessage("");
    setForm(EMPTY_FORM);
    setEditingId("");
    setFormOpen(true);
  };

  const openEditForm = (instructor) => {
    setErrorMessage("");
    setEditingId(instructor.id);
    setForm({
      name: instructor.name || "",
      subjects: Array.isArray(instructor.subjects) && instructor.subjects.length > 0
        ? [...instructor.subjects]
        : [""],
    });
    setFormOpen(true);
  };

  const updateSubject = (index, value) => {
    setForm((previous) => ({
      ...previous,
      subjects: previous.subjects.map((subject, subjectIndex) =>
        subjectIndex === index ? value : subject,
      ),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const name = form.name.trim();
    const subjects = form.subjects
      .map((subject) => subject.trim())
      .filter(Boolean);
    const uniqueSubjects = [...new Set(
      subjects.map((subject) => subject.toLowerCase()),
    )];

    if (!name || subjects.length === 0) {
      setErrorMessage("Enter an instructor name and at least one subject.");
      return;
    }

    if (uniqueSubjects.length !== subjects.length) {
      setErrorMessage("Remove duplicate subjects before saving.");
      return;
    }

    const duplicateName = instructors.some(
      (instructor) =>
        instructor.id !== editingId &&
        String(instructor.name || "").trim().toLowerCase() === name.toLowerCase(),
    );

    if (duplicateName) {
      setErrorMessage("An instructor with this name already exists.");
      return;
    }

    try {
      if (editingId) {
        const previousInstructor = instructors.find(
          (instructor) => instructor.id === editingId,
        );
        const batch = writeBatch(db);
        batch.update(doc(db, "instructors", editingId), {
          name,
          subjects,
          updatedAt: Date.now(),
        });

        if (previousInstructor?.name !== name) {
          schedules
            .filter((schedule) => schedule.instructor === previousInstructor?.name)
            .forEach((schedule) => {
              batch.update(doc(db, "schedules", schedule.id), {
                instructor: name,
                updatedAt: Date.now(),
              });
            });
        }

        await batch.commit();
        setSelectedId(editingId);
      } else {
        const result = await addDoc(collection(db, "instructors"), {
          name,
          subjects,
          createdAt: Date.now(),
        });
        setSelectedId(result.id);
      }

      resetForm();
    } catch (error) {
      console.error("Error saving instructor:", error);
      setErrorMessage(`Unable to save instructor: ${error.message}`);
    }
  };

  const handleDelete = async (instructor) => {
    const linkedSchedules = schedules.filter(
      (schedule) => schedule.instructor === instructor.name,
    );
    const scheduleMessage = linkedSchedules.length > 0
      ? ` Their ${linkedSchedules.length} recurring schedule(s) will also be deleted.`
      : "";

    if (!window.confirm(
      `Remove ${instructor.name}? Historical attendance records will be kept.${scheduleMessage}`,
    )) {
      return;
    }

    setErrorMessage("");
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "instructors", instructor.id));
      linkedSchedules.forEach((schedule) => {
        batch.delete(doc(db, "schedules", schedule.id));
      });
      await batch.commit();
      if (selectedId === instructor.id) setSelectedId("");
    } catch (error) {
      console.error("Error deleting instructor:", error);
      setErrorMessage(`Unable to delete instructor: ${error.message}`);
    }
  };

  const totalSubjects = instructors.reduce(
    (total, instructor) =>
      total + (Array.isArray(instructor.subjects) ? instructor.subjects.length : 0),
    0,
  );

  return (
    <div className="instructor-directory-page">
      <BugReportButton user={user} />
      <Sidebar
        user={user}
        onLogout={onLogout}
        onNavigate={(page) => {
          setSidebarOpen(false);
          onNavigate?.(page);
        }}
        currentPage="instructors"
        sidebarOpen={sidebarOpen}
      />

      <main className="instructor-directory-main">
        <header className="topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="mobile-menu"
              aria-label="Open menu"
              onClick={() => setSidebarOpen((open) => !open)}
            >
              <Menu size={20} />
            </button>
            <div className="topbar-title">
              <span>COMPUTER LABORATORY</span>
              <h1>Instructors</h1>
            </div>
          </div>
          <div className="instructor-user">
            <strong>{user?.name || "Administrator"}</strong>
            <span>Online</span>
          </div>
        </header>

        <div className="instructor-directory-content">
          <section className="instructor-directory-heading">
            <div>
              <span>PEOPLE & SUBJECTS</span>
              <h2>Instructor Directory</h2>
              <p>Manage instructors, their subjects, and view attendance and class schedules.</p>
            </div>
            <button
              type="button"
              className="instructor-primary-button"
              onClick={openAddForm}
            >
              <Plus size={17} />
              Add Instructor
            </button>
          </section>

          {errorMessage && (
            <div className="instructor-error" role="alert">
              {errorMessage}
              <button
                type="button"
                aria-label="Dismiss error"
                onClick={() => setErrorMessage("")}
              >
                <X size={15} />
              </button>
            </div>
          )}

          <section className="instructor-summary-grid">
            <article>
              <Users size={18} />
              <div><span>Instructors</span><strong>{instructors.length}</strong></div>
            </article>
            <article>
              <BookOpen size={18} />
              <div><span>Subjects</span><strong>{totalSubjects}</strong></div>
            </article>
            <article>
              <CalendarDays size={18} />
              <div><span>Weekly Classes</span><strong>{schedules.length}</strong></div>
            </article>
            <article>
              <ClipboardCheck size={18} />
              <div><span>Attendance Entries</span><strong>{attendance.length}</strong></div>
            </article>
          </section>

          <section className="instructor-directory-layout">
            <div className="instructor-list-card">
              <div className="instructor-list-header">
                <div>
                  <h3>Instructor List</h3>
                  <span>{filteredInstructors.length} shown</span>
                </div>
                <label className="instructor-search">
                  <Search size={16} />
                  <input
                    type="search"
                    placeholder="Search name or subject..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
              </div>

              {loading ? (
                <p className="instructor-empty">Loading instructors...</p>
              ) : filteredInstructors.length === 0 ? (
                <p className="instructor-empty">
                  {search ? "No instructors match your search." : "No instructors yet. Add the first instructor to get started."}
                </p>
              ) : (
                <div className="instructor-list">
                  {filteredInstructors.map((instructor) => (
                    <button
                      type="button"
                      key={instructor.id}
                      className={`instructor-list-item ${
                        selectedInstructor?.id === instructor.id ? "selected" : ""
                      }`}
                      onClick={() => setSelectedId(instructor.id)}
                    >
                      <span className="instructor-avatar">
                        {String(instructor.name || "?").charAt(0).toUpperCase()}
                      </span>
                      <span className="instructor-list-name">
                        <strong>{instructor.name}</strong>
                        <small>
                          {Array.isArray(instructor.subjects)
                            ? `${instructor.subjects.length} subject${instructor.subjects.length === 1 ? "" : "s"}`
                            : "No subjects"}
                        </small>
                      </span>
                      <span className="instructor-list-arrow">›</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedInstructor ? (
              <section className="instructor-detail-card">
                <div className="instructor-detail-header">
                  <div className="instructor-detail-identity">
                    <span className="instructor-avatar large">
                      {String(selectedInstructor.name || "?").charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <span>INSTRUCTOR PROFILE</span>
                      <h3>{selectedInstructor.name}</h3>
                    </div>
                  </div>
                  <div className="instructor-detail-actions">
                    <button
                      type="button"
                      onClick={() => openEditForm(selectedInstructor)}
                      aria-label="Edit instructor"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      className="delete"
                      onClick={() => handleDelete(selectedInstructor)}
                      aria-label="Delete instructor"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="instructor-detail-stats">
                  <div><span>Attendance</span><strong>{instructorAttendance.length}</strong></div>
                  <div><span>Present / Late</span><strong>{presentCount}</strong></div>
                  <div><span>Absent</span><strong>{absentCount}</strong></div>
                  <div><span>Weekly Classes</span><strong>{instructorSchedules.length}</strong></div>
                </div>

                <div className="instructor-detail-section">
                  <h4><BookOpen size={15} /> Subjects</h4>
                  <div className="instructor-subject-chips">
                    {(Array.isArray(selectedInstructor.subjects)
                      ? selectedInstructor.subjects
                      : []
                    ).map((subject) => (
                      <span key={subject}>{subject}</span>
                    ))}
                    {(!selectedInstructor.subjects ||
                      selectedInstructor.subjects.length === 0) && (
                      <p className="instructor-empty">No subjects have been added.</p>
                    )}
                  </div>
                </div>

                <div className="instructor-detail-section">
                  <h4><CalendarDays size={15} /> Weekly Schedule</h4>
                  {instructorSchedules.length === 0 ? (
                    <p className="instructor-empty">No recurring classes scheduled.</p>
                  ) : (
                    <div className="instructor-detail-schedule-list">
                      {instructorSchedules
                        .slice()
                        .sort((a, b) =>
                          Number(a.dayOfWeek) - Number(b.dayOfWeek) ||
                          String(a.startTime || "").localeCompare(String(b.startTime || ""))
                        )
                        .map((schedule) => (
                          <div key={schedule.id}>
                            <strong>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][Number(schedule.dayOfWeek)] || "—"}</strong>
                            <span>{schedule.subject}</span>
                            <small>{schedule.startTime} – {schedule.endTime}</small>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </section>
            ) : (
              <section className="instructor-detail-card instructor-detail-empty">
                <UserRound size={32} />
                <h3>Select an instructor</h3>
                <p>Choose an instructor from the list to see their subjects, schedule, and attendance summary.</p>
              </section>
            )}
          </section>
        </div>
      </main>

      {formOpen && (
        <div className="instructor-modal-overlay">
          <section
            className="instructor-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="instructor-form-title"
          >
            <div className="instructor-modal-header">
              <div>
                <span>INSTRUCTOR DIRECTORY</span>
                <h2 id="instructor-form-title">
                  {editingId ? "Edit Instructor" : "Add Instructor"}
                </h2>
              </div>
              <button type="button" onClick={resetForm} aria-label="Close form">
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                Instructor name
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => setForm((previous) => ({
                    ...previous,
                    name: event.target.value,
                  }))}
                  autoFocus
                  required
                />
              </label>

              <div className="instructor-subject-form">
                <div className="instructor-subject-form-heading">
                  <span>Subjects</span>
                  <button
                    type="button"
                    onClick={() => setForm((previous) => ({
                      ...previous,
                      subjects: [...previous.subjects, ""],
                    }))}
                  >
                    <Plus size={14} /> Add Subject
                  </button>
                </div>
                {form.subjects.map((subject, index) => (
                  <div className="instructor-subject-input-row" key={`subject-${index}`}>
                    <input
                      type="text"
                      value={subject}
                      placeholder={`Subject ${index + 1}`}
                      onChange={(event) => updateSubject(index, event.target.value)}
                      required
                    />
                    {form.subjects.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove subject ${index + 1}`}
                        onClick={() => setForm((previous) => ({
                          ...previous,
                          subjects: previous.subjects.filter((_, itemIndex) => itemIndex !== index),
                        }))}
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="instructor-modal-actions">
                <button type="button" className="instructor-secondary-button" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="instructor-primary-button">
                  {editingId ? "Save Changes" : "Add Instructor"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

export default InstructorDirectory;

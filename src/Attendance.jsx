import {
  ClipboardCheck,
  Menu,
  CalendarDays,
  UserCheck,
  UserX,
  Clock3,
  Plus,
  X,
  Search,
  UserPlus,
  Bell,
  Download,
  FileSpreadsheet,
} from "lucide-react";

import Sidebar from "./Sidebar";
import BugReportButton from "./BugReportButton";

import { useEffect, useRef, useState } from "react";

import * as XLSX from "xlsx";

import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

import { db } from "./firebase";

import "./Attendance.css";

function Attendance({ user, onNavigate, onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showInstructorForm, setShowInstructorForm] =
    useState(false);
  const [showTimeoutModal, setShowTimeoutModal] =
    useState(false);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [editingRecordId, setEditingRecordId] = useState(null);

  const [instructors, setInstructors] = useState([]);
  const [records, setRecords] = useState([]);

  const [currentTime, setCurrentTime] = useState(new Date());

  // Alarm
  const [alertMessage, setAlertMessage] = useState("");
  const [alarmType, setAlarmType] = useState("");
  const [alarmRecord, setAlarmRecord] = useState(null);

  const [notifiedClasses, setNotifiedClasses] =
    useState(new Set());

  // Timeout
  const [timeoutRecord, setTimeoutRecord] = useState(null);
  const [timeoutHour, setTimeoutHour] = useState("");
  const [timeoutMinute, setTimeoutMinute] = useState("");
  const [timeoutPeriod, setTimeoutPeriod] = useState("AM");

  const [form, setForm] = useState({
    instructor: "",
    subject: "",
    status: "Present",

    inHour: "",
    inMinute: "",
    inPeriod: "AM",

    startHour: "",
    startMinute: "",
    startPeriod: "AM",

    endHour: "",
    endMinute: "",
    endPeriod: "AM",

    reason: "",
    recordedBy: "",
  });

  const [newInstructor, setNewInstructor] = useState({
    name: "",
    subjects: [""],
  });

  /*
   * ============================
   * LOAD INSTRUCTORS
   * ============================
   */

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "instructors"),
      (snapshot) => {
        setInstructors(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      },
      (error) => {
        if (
          error?.code === "permission-denied" ||
          error?.message
            ?.toLowerCase()
            .includes("permission") ||
          error?.message
            ?.toLowerCase()
            .includes("insufficient permissions")
        ) {
          setInstructors([]);
          return;
        }

        console.error(
          "Error loading instructors:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, []);

  /*
   * ============================
   * LOAD ATTENDANCE
   * ============================
   */

  useEffect(() => {
    const attendanceQuery = query(
      collection(db, "attendance"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      attendanceQuery,
      (snapshot) => {
        setRecords(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          }))
        );
      },
      (error) => {
        if (
          error?.code === "permission-denied" ||
          error?.message
            ?.toLowerCase()
            .includes("permission") ||
          error?.message
            ?.toLowerCase()
            .includes("insufficient permissions")
        ) {
          setRecords([]);
          return;
        }

        console.error(
          "Error loading attendance:",
          error
        );
      }
    );

    return () => unsubscribe();
  }, []);

  /*
   * ============================
   * CLOCK
   * ============================
   */

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  /*
   * ============================
   * NOTIFICATION PERMISSION
   * ============================
   */

  useEffect(() => {
    if (
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(
        (error) => {
          console.error(
            "Notification permission error:",
            error
          );
        }
      );
    }
  }, []);

  /*
   * ============================
   * TIME FUNCTIONS
   * ============================
   */

  const convertToMinutes = (
    hour,
    minute,
    period
  ) => {
    if (!hour || !minute || !period) {
      return null;
    }

    let h = parseInt(hour, 10);
    const m = parseInt(minute, 10);

    if (
      Number.isNaN(h) ||
      Number.isNaN(m) ||
      h < 1 ||
      h > 12 ||
      m < 0 ||
      m > 59
    ) {
      return null;
    }

    if (period === "AM") {
      if (h === 12) {
        h = 0;
      }
    } else {
      if (h !== 12) {
        h += 12;
      }
    }

    return h * 60 + m;
  };

  const timeStringToMinutes = (time) => {
    if (!time) {
      return null;
    }

    const parts = time.trim().split(/\s+/);

    if (parts.length !== 2) {
      return null;
    }

    const [hourMinute, period] = parts;

    const timeParts = hourMinute.split(":");

    if (timeParts.length !== 2) {
      return null;
    }

    const [hour, minute] = timeParts;

    return convertToMinutes(
      hour,
      minute,
      period
    );
  };

  const formatTime = (
    hour,
    minute,
    period
  ) => {
    if (!hour || !minute || !period) {
      return "";
    }

    return `${hour}:${minute} ${period}`;
  };

  const getCurrentMinutes = () => {
    return (
      currentTime.getHours() * 60 +
      currentTime.getMinutes()
    );
  };

  const calculateAttendanceStatus = ({
    status,
    timeIn,
    startTime,
  }) => {
    if (status === "Absent") {
      return "Absent";
    }

    if (status === "Late") {
      return "Late";
    }

    if (!timeIn || !startTime) {
      return "Present";
    }

    const timeInMinutes =
      timeStringToMinutes(timeIn);

    const startMinutes =
      timeStringToMinutes(startTime);

    if (
      timeInMinutes !== null &&
      startMinutes !== null &&
      timeInMinutes > startMinutes
    ) {
      return "Late";
    }

    return "Present";
  };

  /*
   * ============================
   * ALARM
   * ============================
   */

  const alarmRef = useRef(null);

  const playAlarm = (type = "warning") => {
    try {
      if (alarmRef.current) {
        alarmRef.current.stop();
        alarmRef.current.close();
        alarmRef.current = null;
      }

      const customAlarmPath =
        "/alarm-warning.mp3";

      const customAudio = new Audio(
        customAlarmPath
      );

      customAudio.loop = true;
      customAudio.volume = 1;

      customAudio
        .play()
        .catch(() => {
          const AudioContext =
            window.AudioContext ||
            window.webkitAudioContext;

          if (!AudioContext) {
            return;
          }

          const audioContext =
            new AudioContext();

          const notes =
            type === "end"
              ? [660, 440, 330]
              : [880, 990, 880];

          const scheduleNote = (
            note,
            index
          ) => {
            const oscillator =
              audioContext.createOscillator();

            const gainNode =
              audioContext.createGain();

            const startAt =
              audioContext.currentTime +
              index * 0.2;

            oscillator.type =
              type === "end"
                ? "sawtooth"
                : "square";

            oscillator.frequency.setValueAtTime(
              note,
              startAt
            );

            gainNode.gain.setValueAtTime(
              0.0001,
              startAt
            );

            gainNode.gain.exponentialRampToValueAtTime(
              0.5,
              startAt + 0.03
            );

            gainNode.gain.exponentialRampToValueAtTime(
              0.0001,
              startAt + 0.5
            );

            oscillator.connect(gainNode);
            gainNode.connect(
              audioContext.destination
            );

            oscillator.start(startAt);
            oscillator.stop(
              startAt + 0.4
            );
          };

          notes.forEach(
            (note, index) => {
              scheduleNote(
                note,
                index
              );
            }
          );

          const intervalId =
            setInterval(() => {
              notes.forEach(
                (note, index) => {
                  scheduleNote(
                    note,
                    index
                  );
                }
              );
            }, 900);

          alarmRef.current = {
            stop: () => {
              clearInterval(
                intervalId
              );

              audioContext
                .close()
                .catch(() => {});
            },

            close: () => {
              clearInterval(
                intervalId
              );

              audioContext
                .close()
                .catch(() => {});
            },
          };
        });

      if (customAudio) {
        const intervalId =
          setInterval(() => {
            customAudio.currentTime = 0;
            customAudio
              .play()
              .catch(() => {});
          }, 1500);

        alarmRef.current = {
          stop: () => {
            clearInterval(
              intervalId
            );

            customAudio.pause();
            customAudio.currentTime = 0;
          },

          close: () => {
            clearInterval(
              intervalId
            );

            customAudio.pause();
            customAudio.currentTime = 0;
          },
        };
      }
    } catch (error) {
      console.error(
        "Alarm error:",
        error
      );
    }
  };

  const showNotification = (
    title,
    body
  ) => {
    try {
      if (
        "Notification" in window &&
        Notification.permission ===
          "granted"
      ) {
        new Notification(title, {
          body,
          icon: "/favicon.ico",
        });
      }
    } catch (error) {
      console.error(
        "Notification error:",
        error
      );
    }
  };

  const triggerAlarm = (
    message,
    type,
    record
  ) => {
    setAlertMessage(message);
    setAlarmType(type);
    setAlarmRecord(record);

    playAlarm(type);

    showNotification(
      type === "end"
        ? "TIME OUT REQUIRED"
        : "CLASS ENDING SOON",
      message
    );
  };

  /*
   * ============================
   * CLASS ENDING CHECK
   * ============================
   */

  useEffect(() => {
    if (!records.length) {
      return;
    }

    const currentMinutes =
      getCurrentMinutes();

    records.forEach((record) => {
      if (
        (record.status !== "Present" &&
          record.status !== "Late") ||
        !record.timeIn ||
        !record.startTime ||
        !record.endTime
      ) {
        return;
      }

      if (record.timeOut) {
        return;
      }

      const endMinutes =
        timeStringToMinutes(
          record.endTime
        );

      if (endMinutes === null) {
        return;
      }

      const notificationKey =
        `${record.id}-${record.date}`;

      /*
       * 5 MINUTES BEFORE
       */

      if (
        currentMinutes ===
          endMinutes - 5 &&
        !notifiedClasses.has(
          `${notificationKey}-before`
        )
      ) {
        const message =
          `The class of ${record.instructor} (${record.subject}) ends in 5 minutes. Prepare to record Time Out.`;

        triggerAlarm(
          message,
          "warning",
          record
        );

        setNotifiedClasses(
          (previous) => {
            const updated =
              new Set(previous);

            updated.add(
              `${notificationKey}-before`
            );

            return updated;
          }
        );
      }

      /*
       * CLASS ENDED
       */

      if (
        currentMinutes ===
          endMinutes &&
        !notifiedClasses.has(
          `${notificationKey}-end`
        )
      ) {
        const message =
          `The class of ${record.instructor} (${record.subject}) has ended. Time Out is now required.`;

        triggerAlarm(
          message,
          "end",
          record
        );

        setNotifiedClasses(
          (previous) => {
            const updated =
              new Set(previous);

            updated.add(
              `${notificationKey}-end`
            );

            return updated;
          }
        );
      }
    });
  }, [
    currentTime,
    records,
    notifiedClasses,
  ]);

  /*
   * ============================
   * INSTRUCTOR
   * ============================
   */

  const selectedInstructor =
    instructors.find(
      (instructor) =>
        instructor.name ===
        form.instructor
    );

  const editingRecord =
    editingRecordId
      ? records.find(
          (record) =>
            record.id ===
            editingRecordId
        )
      : null;

  /*
   * ============================
   * ATTENDANCE COUNTS
   * ============================
   */

  const currentlyInside =
    records.filter((record) => {
      return (
        (record.status === "Present" ||
          record.status === "Late") &&
        record.timeIn &&
        !record.timeOut
      );
    });

  const currentlyIn =
    currentlyInside.length;

  const presentCount =
    records.filter(
      (record) =>
        record.status === "Present"
    ).length;

  const lateCount =
    records.filter(
      (record) =>
        record.status === "Late"
    ).length;

  const absentCount =
    records.filter(
      (record) =>
        record.status === "Absent"
    ).length;

  /*
   * ============================
   * TIME OPTIONS
   * ============================
   */

  const timeOptions = Array.from(
    { length: 12 },
    (_, index) =>
      String(index + 1).padStart(
        2,
        "0"
      )
  );

  const minuteOptions = Array.from(
    { length: 12 },
    (_, index) =>
      String(index * 5).padStart(
        2,
        "0"
      )
  );

  /*
   * ============================
   * NAVIGATION
   * ============================
   */

  const navigate = (page) => {
    setSidebarOpen(false);

    if (onNavigate) {
      onNavigate(page);
    }
  };

  /*
   * ============================
   * FORM HANDLERS
   * ============================
   */

  const handleInstructorChange = (
    e
  ) => {
    const instructorName =
      e.target.value;

    const instructor =
      instructors.find(
        (item) =>
          item.name ===
          instructorName
      );

    setForm((previous) => ({
      ...previous,
      instructor:
        instructorName,
      subject:
        instructor?.subjects?.[0] ||
        "",
    }));
  };

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleNewInstructorChange = (
    e
  ) => {
    const {
      name,
      value,
    } = e.target;

    setNewInstructor(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    );
  };

  const handleSubjectChange = (
    index,
    value
  ) => {
    setNewInstructor(
      (previous) => {
        const subjects = [
          ...previous.subjects,
        ];

        subjects[index] =
          value;

        return {
          ...previous,
          subjects,
        };
      }
    );
  };

  const addSubjectField = () => {
    setNewInstructor(
      (previous) => ({
        ...previous,
        subjects: [
          ...previous.subjects,
          "",
        ],
      })
    );
  };

  const removeSubjectField = (
    index
  ) => {
    setNewInstructor(
      (previous) => {
        if (
          previous.subjects
            .length === 1
        ) {
          return previous;
        }

        return {
          ...previous,
          subjects:
            previous.subjects.filter(
              (
                _,
                subjectIndex
              ) =>
                subjectIndex !==
                index
            ),
        };
      }
    );
  };

  /*
   * ============================
   * RESET FORMS
   * ============================
   */

  const parseTimeValue = (value) => {
    if (
      !value ||
      typeof value !== "string"
    ) {
      return {
        hour: "",
        minute: "",
        period: "AM",
      };
    }

    const trimmed =
      value.trim();

    const match =
      trimmed.match(
        /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i
      );

    if (!match) {
      return {
        hour: "",
        minute: "",
        period: "AM",
      };
    }

    const hourValue =
      Number(match[1]);

    const convertedHour =
      hourValue % 12 || 12;

    return {
      hour: String(
        convertedHour
      ).padStart(2, "0"),

      minute: match[2],

      period:
        match[3].toUpperCase(),
    };
  };

  const resetForm = () => {
    setEditingRecordId(null);

    setForm({
      instructor: "",
      subject: "",
      status: "Present",

      inHour: "",
      inMinute: "",
      inPeriod: "AM",

      startHour: "",
      startMinute: "",
      startPeriod: "AM",

      endHour: "",
      endMinute: "",
      endPeriod: "AM",

      reason: "",
      recordedBy: "",
    });
  };

  const resetInstructorForm = () => {
    setNewInstructor({
      name: "",
      subjects: [""],
    });
  };

  const handleEditRecord = (
    record
  ) => {
    const parsedTimeIn =
      parseTimeValue(
        record.timeIn
      );

    const parsedStartTime =
      parseTimeValue(
        record.startTime
      );

    const parsedEndTime =
      parseTimeValue(
        record.endTime
      );

    setEditingRecordId(
      record.id
    );

    setForm({
      instructor:
        record.instructor ||
        "",

      subject:
        record.subject || "",

      status:
        record.status ||
        "Present",

      inHour:
        parsedTimeIn.hour,

      inMinute:
        parsedTimeIn.minute,

      inPeriod:
        parsedTimeIn.period,

      startHour:
        parsedStartTime.hour,

      startMinute:
        parsedStartTime.minute,

      startPeriod:
        parsedStartTime.period,

      endHour:
        parsedEndTime.hour,

      endMinute:
        parsedEndTime.minute,

      endPeriod:
        parsedEndTime.period,

      reason:
        record.reason || "",

      recordedBy:
        record.recordedBy || "",
    });

    setShowForm(true);
  };

  const handleDeleteRecord = async (
    recordId
  ) => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this record?"
      );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          "attendance",
          recordId
        )
      );

      alert(
        "Attendance record deleted successfully."
      );
    } catch (error) {
      console.error(
        "Error deleting attendance record:",
        error
      );

      alert(
        `Failed to delete attendance record.\n\n${error.message}`
      );
    }
  };

  /*
   * ============================
   * SAVE ATTENDANCE
   * ============================
   */

  const handleSubmit = async (
    e
  ) => {
    e.preventDefault();

    if (!form.instructor) {
      alert(
        "Please select an instructor."
      );

      return;
    }

    if (!form.subject) {
      alert(
        "Please select a subject."
      );

      return;
    }

    if (!form.recordedBy.trim()) {
      alert(
        "Please enter who recorded the attendance."
      );

      return;
    }

    if (form.status === "Present") {
      if (
        !form.inHour ||
        !form.inMinute ||
        !form.inPeriod
      ) {
        alert(
          "Please select the Time In."
        );

        return;
      }

      if (
        !form.startHour ||
        !form.startMinute ||
        !form.startPeriod
      ) {
        alert(
          "Please enter the subject start time."
        );

        return;
      }

      if (
        !form.endHour ||
        !form.endMinute ||
        !form.endPeriod
      ) {
        alert(
          "Please enter the subject end time."
        );

        return;
      }

      const startMinutes =
        convertToMinutes(
          form.startHour,
          form.startMinute,
          form.startPeriod
        );

      const endMinutes =
        convertToMinutes(
          form.endHour,
          form.endMinute,
          form.endPeriod
        );

      if (
        startMinutes === null ||
        endMinutes === null
      ) {
        alert(
          "Please enter a valid schedule."
        );

        return;
      }

      if (
        startMinutes ===
        endMinutes
      ) {
        alert(
          "Class start and end time cannot be the same."
        );

        return;
      }
    }

    if (
      form.status === "Absent" &&
      !form.reason.trim()
    ) {
      alert(
        "Please provide a reason for the absence."
      );

      return;
    }

    const todayDate =
      new Date().toLocaleDateString(
        "en-US",
        {
          month: "long",
          day: "numeric",
          year: "numeric",
        }
      );

    try {
      const timeInValue =
        form.status === "Present"
          ? formatTime(
              form.inHour,
              form.inMinute,
              form.inPeriod
            )
          : "";

      const startTimeValue =
        form.status === "Present"
          ? formatTime(
              form.startHour,
              form.startMinute,
              form.startPeriod
            )
          : "";

      const endTimeValue =
        form.status === "Present"
          ? formatTime(
              form.endHour,
              form.endMinute,
              form.endPeriod
            )
          : "";

      const computedStatus =
        calculateAttendanceStatus({
          status: form.status,
          timeIn: timeInValue,
          startTime:
            startTimeValue,
        });

      const attendanceData = {
        instructor:
          form.instructor,

        subject:
          form.subject,

        status:
          computedStatus,

        timeIn:
          timeInValue,

        timeOut:
          editingRecord?.timeOut ||
          "",

        startTime:
          startTimeValue,

        endTime:
          endTimeValue,

        reason:
          form.status ===
          "Absent"
            ? form.reason.trim()
            : "",

        recordedBy:
          form.recordedBy.trim(),

        date:
          todayDate,

        createdAt:
          Date.now(),
      };

      if (editingRecordId) {
        await updateDoc(
          doc(
            db,
            "attendance",
            editingRecordId
          ),
          attendanceData
        );

        alert(
          "Attendance successfully updated."
        );
      } else {
        await addDoc(
          collection(
            db,
            "attendance"
          ),
          attendanceData
        );

        alert(
          "Attendance successfully saved."
        );
      }

      resetForm();
      setShowForm(false);
    } catch (error) {
      console.error(
        "Error saving attendance:",
        error
      );

      alert(
        `Failed to save attendance.\n\n${error.message}`
      );
    }
  };

  /*
   * ============================
   * ADD INSTRUCTOR
   * ============================
   */

  const handleAddInstructor =
    async (e) => {
      e.preventDefault();

      const instructorName =
        newInstructor.name.trim();

      const subjects =
        newInstructor.subjects
          .map((subject) =>
            subject.trim()
          )
          .filter(
            (subject) =>
              subject !== ""
          );

      if (!instructorName) {
        alert(
          "Please enter the instructor name."
        );

        return;
      }

      if (
        subjects.length === 0
      ) {
        alert(
          "Please add at least one subject."
        );

        return;
      }

      const existingInstructor =
        instructors.find(
          (instructor) =>
            instructor.name
              ?.toLowerCase()
              .trim() ===
            instructorName
              .toLowerCase()
              .trim()
        );

      try {
        if (existingInstructor) {
          const updatedSubjects = [
            ...(existingInstructor.subjects ||
              []),
          ];

          subjects.forEach(
            (subject) => {
              const alreadyExists =
                updatedSubjects.some(
                  (
                    existingSubject
                  ) =>
                    existingSubject
                      .toLowerCase()
                      .trim() ===
                    subject
                      .toLowerCase()
                      .trim()
                );

              if (
                !alreadyExists
              ) {
                updatedSubjects.push(
                  subject
                );
              }
            }
          );

          await updateDoc(
            doc(
              db,
              "instructors",
              existingInstructor.id
            ),
            {
              subjects:
                updatedSubjects,
            }
          );

          setForm(
            (previousForm) => ({
              ...previousForm,

              instructor:
                existingInstructor.name,

              subject:
                subjects[0],
            })
          );
        } else {
          await addDoc(
            collection(
              db,
              "instructors"
            ),
            {
              name:
                instructorName,

              subjects,

              createdAt:
                Date.now(),
            }
          );

          setForm(
            (previousForm) => ({
              ...previousForm,

              instructor:
                instructorName,

              subject:
                subjects[0],
            })
          );
        }

        resetInstructorForm();

        setShowInstructorForm(
          false
        );

        alert(
          "Instructor successfully saved."
        );
      } catch (error) {
        console.error(
          "Error saving instructor:",
          error
        );

        alert(
          `Failed to save instructor.\n\n${error.message}`
        );
      }
    };

  /*
   * ============================
   * OPEN TIMEOUT MODAL
   * ============================
   */

  const openTimeoutModal = (
    record
  ) => {
    if (!record) {
      return;
    }

    setTimeoutRecord(record);

    const now = new Date();

    let hour =
      now.getHours();

    const minute =
      String(
        now.getMinutes()
      ).padStart(2, "0");

    const period =
      hour >= 12
        ? "PM"
        : "AM";

    if (hour === 0) {
      hour = 12;
    } else if (hour > 12) {
      hour -= 12;
    }

    setTimeoutHour(
      String(hour).padStart(
        2,
        "0"
      )
    );

    setTimeoutMinute(
      minute
    );

    setTimeoutPeriod(
      period
    );

    setShowTimeoutModal(
      true
    );
  };

  /*
   * ============================
   * CLOSE TIMEOUT MODAL
   * ============================
   */

  const closeTimeoutModal = () => {
    setShowTimeoutModal(
      false
    );

    setTimeoutRecord(
      null
    );

    setTimeoutHour("");
    setTimeoutMinute("");
    setTimeoutPeriod(
      "AM"
    );
  };

  /*
   * ============================
   * SAVE TIMEOUT
   * ============================
   */

  const handleTimeout =
    async () => {
      if (!timeoutRecord) {
        return;
      }

      if (
        !timeoutHour ||
        !timeoutMinute ||
        !timeoutPeriod
      ) {
        alert(
          "Please select the actual Time Out."
        );

        return;
      }

      const actualTimeOut =
        formatTime(
          timeoutHour,
          timeoutMinute,
          timeoutPeriod
        );

      if (!actualTimeOut) {
        alert(
          "Invalid Time Out."
        );

        return;
      }

      try {
        await updateDoc(
          doc(
            db,
            "attendance",
            timeoutRecord.id
          ),
          {
            timeOut:
              actualTimeOut,

            timeoutRecordedAt:
              Date.now(),
          }
        );

        const instructorName =
          timeoutRecord.instructor;

        closeTimeoutModal();

        setAlertMessage("");
        setAlarmType("");
        setAlarmRecord(null);

        alert(
          `Time Out recorded for ${instructorName}.`
        );
      } catch (error) {
        console.error(
          "Error recording Time Out:",
          error
        );

        alert(
          `Failed to record Time Out.\n\n${error.message}`
        );
      }
    };

  /*
   * ============================
   * SEARCH
   * ============================
   */

  const parseRecordDate = (
    dateValue
  ) => {
    if (!dateValue) {
      return null;
    }

    const parsed =
      new Date(dateValue);

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return null;
    }

    return parsed;
  };

  const subjectOptions = [
    ...new Set(
      records
        .map(
          (record) =>
            record.subject
        )
        .filter(Boolean)
    ),
  ];

  const filteredRecords =
    records
      .filter((record) => {
        const instructor =
          record.instructor
            ?.toLowerCase() ||
          "";

        const subject =
          record.subject
            ?.toLowerCase() ||
          "";

        const searchValue =
          search
            .trim()
            .toLowerCase();

        const matchesSearch =
          !searchValue ||
          instructor.includes(
            searchValue
          ) ||
          subject.includes(
            searchValue
          );

        const recordDate =
          parseRecordDate(
            record.date
          );

        const fromDate = dateFrom
          ? new Date(
              `${dateFrom}T00:00:00`
            )
          : null;

        const toDate = dateTo
          ? new Date(
              `${dateTo}T23:59:59`
            )
          : null;

        const matchesDateFrom =
          !fromDate ||
          (recordDate &&
            recordDate >=
              fromDate);

        const matchesDateTo =
          !toDate ||
          (recordDate &&
            recordDate <=
              toDate);

        const matchesStatus =
          selectedStatus ===
            "All" ||
          record.status ===
            selectedStatus;

        const matchesSubject =
          selectedSubject ===
            "All" ||
          record.subject ===
            selectedSubject;

        return (
          matchesSearch &&
          matchesDateFrom &&
          matchesDateTo &&
          matchesStatus &&
          matchesSubject
        );
      })
      .sort((a, b) => {
        if (sortBy === "oldest") {
          return (
            (a.createdAt || 0) -
            (b.createdAt || 0)
          );
        }

        if (
          sortBy ===
          "time-in-earliest"
        ) {
          const aMinutes =
            timeStringToMinutes(
              a.timeIn
            ) ?? 999999;

          const bMinutes =
            timeStringToMinutes(
              b.timeIn
            ) ?? 999999;

          return (
            aMinutes -
            bMinutes
          );
        }

        if (
          sortBy ===
          "time-in-latest"
        ) {
          const aMinutes =
            timeStringToMinutes(
              a.timeIn
            ) ?? -1;

          const bMinutes =
            timeStringToMinutes(
              b.timeIn
            ) ?? -1;

          return (
            bMinutes -
            aMinutes
          );
        }

        if (sortBy === "status") {
          const statusOrder = {
            Present: 1,
            Late: 2,
            Absent: 3,
          };

          return (
            (statusOrder[
              a.status
            ] || 99) -
            (statusOrder[
              b.status
            ] || 99)
          );
        }

        return (
          (b.createdAt || 0) -
          (a.createdAt || 0)
        );
      });

  /*
   * ============================
   * EXPORT
   * ============================
   */

  const exportAttendanceData = (
    fileType = "xlsx"
  ) => {
    if (
      filteredRecords.length ===
      0
    ) {
      alert(
        "There are no attendance records to export for the current filters."
      );

      return;
    }

    const exportData =
      filteredRecords.map(
        (record) => ({
          Date:
            record.date || "",

          "Instructor Name":
            record.instructor ||
            "",

          Subject:
            record.subject || "",

          "Class Start":
            record.startTime || "",

          "Class End":
            record.endTime || "",

          "Time In":
            record.timeIn || "",

          "Time Out":
            record.timeOut || "",

          Status:
            record.status || "",

          Reason:
            record.reason || "",

          "Recorded By":
            record.recordedBy || "",
        })
      );

    const worksheet =
      XLSX.utils.json_to_sheet(
        exportData
      );

    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 24 },
      { wch: 18 },
      { wch: 14 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 16 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Attendance"
    );

    const fileName =
      fileType === "csv"
        ? "Attendance_Export.csv"
        : "Attendance_Export.xlsx";

    if (fileType === "csv") {
      XLSX.writeFile(
        workbook,
        fileName,
        {
          bookType: "csv",
        }
      );

      return;
    }

    XLSX.writeFile(
      workbook,
      fileName
    );
  };

  /*
   * ============================
   * DISPLAY DATE / CLOCK
   * ============================
   */

  const displayDate =
    currentTime.toLocaleDateString(
      "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );

  const displayClock =
    currentTime.toLocaleTimeString(
      "en-US",
      {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }
    );

  /*
   * ============================
   * RENDER
   * ============================
   */

  return (
    <div
      className={`attendance-page ${
        showForm ||
        showInstructorForm ||
        showTimeoutModal
          ? "modal-open"
          : ""
      }`}
    >

      {/* =========================
          REPORT BUG
      ========================= */}

      <BugReportButton user={user} />

      {/* =========================
          ALARM
      ========================= */}

      {alertMessage && (
        <div
          className={`attendance-alarm ${
            alarmType === "end"
              ? "alarm-end"
              : "alarm-warning"
          }`}
        >
          <div className="alarm-card">
            <div className="alarm-header">
              <div className="alarm-icon">
                {alarmType ===
                "end" ? (
                  <Clock3 size={36} />
                ) : (
                  <Bell size={36} />
                )}
              </div>

              <button
                type="button"
                className="alarm-close"
                onClick={() => {
                  if (
                    alarmRef.current
                  ) {
                    alarmRef.current.stop();
                    alarmRef.current.close();
                    alarmRef.current =
                      null;
                  }

                  setAlertMessage(
                    ""
                  );

                  setAlarmType(
                    ""
                  );

                  setAlarmRecord(
                    null
                  );
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="alarm-content">
              <span className="alarm-label">
                {alarmType ===
                "end"
                  ? "Time Out Required"
                  : "Class Ending Soon"}
              </span>

              <strong>
                {alarmType ===
                "end"
                  ? "TIME OUT REQUIRED"
                  : "CLASS ENDING SOON"}
              </strong>

              <p>
                {alertMessage}
              </p>

              {alarmType ===
                "end" &&
                alarmRecord && (
                  <button
                    type="button"
                    className="alarm-timeout-button"
                    onClick={() => {
                      setAlertMessage(
                        ""
                      );

                      setAlarmType(
                        ""
                      );

                      setAlarmRecord(
                        null
                      );

                      openTimeoutModal(
                        alarmRecord
                      );
                    }}
                  >
                    Record Time Out
                  </button>
                )}
            </div>
          </div>
        </div>
      )}

      {/* =========================
          SIDEBAR
      ========================= */}

      <Sidebar
        user={user}
        onLogout={onLogout}
        onNavigate={navigate}
        currentPage="attendance"
        sidebarOpen={sidebarOpen}
      />

      {/* =========================
          MAIN
      ========================= */}

      <main className="attendance-main">
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
            >
              <Menu size={22} />
            </button>

            <div className="topbar-title">
              <span>
                COMPUTER LABORATORY
              </span>

              <h1>
                Attendance
              </h1>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="topbar-user">
              <div className="user-avatar">
                {(
                  user?.name ||
                  "Admin"
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>
                  {user?.name ||
                    "Administrator"}
                </strong>

                <span>
                  Online
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="attendance-content">

          {/* =========================
              HEADING
          ========================= */}

          <section className="attendance-heading">
            <div>
              <span>
                ATTENDANCE MANAGEMENT
              </span>

              <h2>
                Instructor Attendance
              </h2>

              <p>
                Record and monitor
                instructor attendance
                in the Computer
                Laboratory.
              </p>
            </div>

            <button
              type="button"
              className="add-attendance-button"
              onClick={() =>
                setShowForm(true)
              }
            >
              <Plus size={18} />

              Record Attendance
            </button>
          </section>

          {/* =========================
              STATS
          ========================= */}

          <section className="attendance-stats">
            <div className="attendance-stat">
              <div className="attendance-stat-icon gold">
                <ClipboardCheck
                  size={20}
                />
              </div>

              <div>
                <span>
                  Total Records
                </span>

                <strong>
                  {records.length}
                </strong>
              </div>
            </div>

            <div className="attendance-stat">
              <div className="attendance-stat-icon green">
                <UserCheck
                  size={20}
                />
              </div>

              <div>
                <span>
                  Present
                </span>

                <strong>
                  {presentCount}
                </strong>
              </div>
            </div>

            <div className="attendance-stat">
              <div className="attendance-stat-icon orange">
                <Clock3
                  size={20}
                />
              </div>

              <div>
                <span>
                  Late
                </span>

                <strong>
                  {lateCount}
                </strong>
              </div>
            </div>

            <div className="attendance-stat">
              <div className="attendance-stat-icon red">
                <UserX
                  size={20}
                />
              </div>

              <div>
                <span>
                  Absent
                </span>

                <strong>
                  {absentCount}
                </strong>
              </div>
            </div>

            <div className="attendance-stat">
              <div className="attendance-stat-icon blue">
                <Clock3
                  size={20}
                />
              </div>

              <div>
                <span>
                  Currently In
                </span>

                <strong>
                  {currentlyIn}
                </strong>
              </div>
            </div>
          </section>

          {/* =========================
              TABLE
          ========================= */}

          <section className="attendance-table-card">
            <div className="attendance-table-header">
              <div>
                <h3>
                  Attendance Records
                </h3>

                <p>
                  Instructor attendance
                  for{" "}
                  {displayDate}.
                </p>
              </div>

              <div className="attendance-tools">
                <div className="attendance-search">
                  <Search size={16} />

                  <input
                    type="text"
                    placeholder="Search instructor or subject..."
                    value={
                      search
                    }
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div className="attendance-date">
                  <CalendarDays
                    size={15}
                  />

                  {displayDate}
                </div>
              </div>
            </div>

            <div className="attendance-filter-bar">
              <div className="attendance-filter">
                <label htmlFor="dateFrom">
                  From
                </label>

                <input
                  id="dateFrom"
                  type="date"
                  value={
                    dateFrom
                  }
                  onChange={(e) =>
                    setDateFrom(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="attendance-filter">
                <label htmlFor="dateTo">
                  To
                </label>

                <input
                  id="dateTo"
                  type="date"
                  value={
                    dateTo
                  }
                  onChange={(e) =>
                    setDateTo(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="attendance-filter">
                <label htmlFor="subjectFilter">
                  Subject
                </label>

                <select
                  id="subjectFilter"
                  value={
                    selectedSubject
                  }
                  onChange={(e) =>
                    setSelectedSubject(
                      e.target.value
                    )
                  }
                >
                  <option value="All">
                    All
                  </option>

                  {subjectOptions.map(
                    (subject) => (
                      <option
                        key={
                          subject
                        }
                        value={
                          subject
                        }
                      >
                        {subject}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="attendance-filter">
                <label htmlFor="statusFilter">
                  Status
                </label>

                <select
                  id="statusFilter"
                  value={
                    selectedStatus
                  }
                  onChange={(e) =>
                    setSelectedStatus(
                      e.target.value
                    )
                  }
                >
                  <option value="All">
                    All
                  </option>

                  <option value="Present">
                    Present
                  </option>

                  <option value="Late">
                    Late
                  </option>

                  <option value="Absent">
                    Absent
                  </option>
                </select>
              </div>

              <div className="attendance-filter">
                <label htmlFor="sortFilter">
                  Sort
                </label>

                <select
                  id="sortFilter"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(
                      e.target.value
                    )
                  }
                >
                  <option value="newest">
                    Newest
                  </option>

                  <option value="oldest">
                    Oldest
                  </option>

                  <option value="time-in-earliest">
                    Time In: Earliest
                  </option>

                  <option value="time-in-latest">
                    Time In: Latest
                  </option>

                  <option value="status">
                    Status
                  </option>
                </select>
              </div>

              <button
                type="button"
                className="clear-filters-button"
                onClick={() => {
                  setDateFrom("");
                  setDateTo("");
                  setSelectedStatus(
                    "All"
                  );
                  setSelectedSubject(
                    "All"
                  );
                  setSortBy(
                    "newest"
                  );
                }}
              >
                Clear
              </button>
            </div>

            <div className="attendance-table-wrapper">
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>
                      Instructor
                    </th>

                    <th>
                      Subject
                    </th>

                    <th>
                      Schedule
                    </th>

                    <th>
                      Time In
                    </th>

                    <th>
                      Time Out
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Reason
                    </th>

                    <th>
                      Recorded By
                    </th>

                    <th>
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredRecords.length >
                  0 ? (
                    filteredRecords.map(
                      (record) => (
                        <tr
                          key={
                            record.id
                          }
                        >
                          <td>
                            <div className="attendance-instructor">
                              <div className="table-avatar">
                                {record.instructor
                                  ?.charAt(
                                    0
                                  )
                                  .toUpperCase()}
                              </div>

                              <strong>
                                {
                                  record.instructor
                                }
                              </strong>
                            </div>
                          </td>

                          <td>
                            {
                              record.subject
                            }
                          </td>

                          <td>
                            {record.startTime &&
                            record.endTime
                              ? `${record.startTime} - ${record.endTime}`
                              : "—"}
                          </td>

                          <td>
                            {record.timeIn ||
                              "—"}
                          </td>

                          <td>
                            {record.timeOut ||
                              "—"}
                          </td>

                          <td>
                            <span
                              className={`attendance-status ${
                                record.status ===
                                "Present"
                                  ? "present"
                                  : record.status ===
                                      "Late"
                                    ? "late"
                                    : "absent"
                              }`}
                            >
                              {
                                record.status
                              }
                            </span>
                          </td>

                          <td>
                            {record.reason ||
                              "—"}
                          </td>

                          <td>
                            {record.recordedBy ||
                              "—"}
                          </td>

                          <td>
                            <div className="record-actions">
                              <button
                                type="button"
                                className="record-action-button edit"
                                onClick={() =>
                                  handleEditRecord(
                                    record
                                  )
                                }
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                className="record-action-button delete"
                                onClick={() =>
                                  handleDeleteRecord(
                                    record.id
                                  )
                                }
                              >
                                Delete
                              </button>

                              {(record.status ===
                                "Present" ||
                                record.status ===
                                  "Late") &&
                              record.timeIn &&
                              !record.timeOut ? (
                                <button
                                  type="button"
                                  className="timeout-table-button"
                                  onClick={() =>
                                    openTimeoutModal(
                                      record
                                    )
                                  }
                                >
                                  <Clock3
                                    size={15}
                                  />

                                  Time Out
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan="9"
                        className="no-records"
                      >
                        No attendance
                        records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* =========================
          ATTENDANCE MODAL
      ========================= */}

      {showForm && (
        <div className="attendance-modal-overlay">
          <div className="attendance-modal">
            <div className="modal-header">
              <div>
                <span>
                  NEW RECORD
                </span>

                <h2>
                  Record Attendance
                </h2>
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={() => {
                  resetForm();

                  setShowForm(
                    false
                  );
                }}
              >
                <X size={19} />
              </button>
            </div>

            <form
              className="attendance-form"
              onSubmit={
                handleSubmit
              }
            >
              {/* Instructor */}

              <div className="form-group">
                <div className="form-label-row">
                  <label>
                    Instructor Name
                  </label>

                  <button
                    type="button"
                    className="add-instructor-link"
                    onClick={() =>
                      setShowInstructorForm(
                        true
                      )
                    }
                  >
                    <UserPlus
                      size={13}
                    />

                    Add Instructor
                  </button>
                </div>

                <select
                  name="instructor"
                  value={
                    form.instructor
                  }
                  onChange={
                    handleInstructorChange
                  }
                  required
                >
                  <option value="">
                    Select instructor
                  </option>

                  {instructors.map(
                    (
                      instructor
                    ) => (
                      <option
                        key={
                          instructor.id
                        }
                        value={
                          instructor.name
                        }
                      >
                        {
                          instructor.name
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Subject */}

              <div className="form-group">
                <label>
                  Subject
                </label>

                <select
                  name="subject"
                  value={
                    form.subject
                  }
                  onChange={
                    handleChange
                  }
                  disabled={
                    !selectedInstructor
                  }
                  required
                >
                  <option value="">
                    Select subject
                  </option>

                  {selectedInstructor?.subjects?.map(
                    (
                      subject
                    ) => (
                      <option
                        key={
                          subject
                        }
                        value={
                          subject
                        }
                      >
                        {
                          subject
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* Status */}

              <div className="form-group">
                <label>
                  Attendance Status
                </label>

                <div className="status-selection">
                  <label
                    className={`status-option ${
                      form.status ===
                      "Present"
                        ? "selected present-option"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value="Present"
                      checked={
                        form.status ===
                        "Present"
                      }
                      onChange={
                        handleChange
                      }
                    />

                    <UserCheck
                      size={17}
                    />

                    Present
                  </label>

                  <label
                    className={`status-option ${
                      form.status ===
                      "Absent"
                        ? "selected absent-option"
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value="Absent"
                      checked={
                        form.status ===
                        "Absent"
                      }
                      onChange={
                        handleChange
                      }
                    />

                    <UserX
                      size={17}
                    />

                    Absent
                  </label>
                </div>
              </div>

              {/* PRESENT */}

              {form.status ===
                "Present" && (
                <>
                  <div className="schedule-section">
                    <div className="schedule-title">
                      <Clock3
                        size={15}
                      />

                      <span>
                        Subject Schedule
                      </span>
                    </div>

                    <div className="time-section">

                      {/* START */}

                      <div className="time-group">
                        <label>
                          Class Start Time
                        </label>

                        <div className="time-selects">
                          <select
                            name="startHour"
                            value={
                              form.startHour
                            }
                            onChange={
                              handleChange
                            }
                            required
                          >
                            <option value="">
                              Hour
                            </option>

                            {timeOptions.map(
                              (
                                hour
                              ) => (
                                <option
                                  key={
                                    hour
                                  }
                                  value={
                                    hour
                                  }
                                >
                                  {
                                    hour
                                  }
                                </option>
                              )
                            )}
                          </select>

                          <select
                            name="startMinute"
                            value={
                              form.startMinute
                            }
                            onChange={
                              handleChange
                            }
                            required
                          >
                            <option value="">
                              Minute
                            </option>

                            {minuteOptions.map(
                              (
                                minute
                              ) => (
                                <option
                                  key={
                                    minute
                                  }
                                  value={
                                    minute
                                  }
                                >
                                  {
                                    minute
                                  }
                                </option>
                              )
                            )}
                          </select>

                          <select
                            name="startPeriod"
                            value={
                              form.startPeriod
                            }
                            onChange={
                              handleChange
                            }
                          >
                            <option value="AM">
                              AM
                            </option>

                            <option value="PM">
                              PM
                            </option>
                          </select>
                        </div>
                      </div>

                      {/* END */}

                      <div className="time-group">
                        <label>
                          Class End Time
                        </label>

                        <div className="time-selects">
                          <select
                            name="endHour"
                            value={
                              form.endHour
                            }
                            onChange={
                              handleChange
                            }
                            required
                          >
                            <option value="">
                              Hour
                            </option>

                            {timeOptions.map(
                              (
                                hour
                              ) => (
                                <option
                                  key={
                                    hour
                                  }
                                  value={
                                    hour
                                  }
                                >
                                  {
                                    hour
                                  }
                                </option>
                              )
                            )}
                          </select>

                          <select
                            name="endMinute"
                            value={
                              form.endMinute
                            }
                            onChange={
                              handleChange
                            }
                            required
                          >
                            <option value="">
                              Minute
                            </option>

                            {minuteOptions.map(
                              (
                                minute
                              ) => (
                                <option
                                  key={
                                    minute
                                  }
                                  value={
                                    minute
                                  }
                                >
                                  {
                                    minute
                                  }
                                </option>
                              )
                            )}
                          </select>

                          <select
                            name="endPeriod"
                            value={
                              form.endPeriod
                            }
                            onChange={
                              handleChange
                            }
                          >
                            <option value="AM">
                              AM
                            </option>

                            <option value="PM">
                              PM
                            </option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* TIME IN */}

                  <div className="time-section">
                    <div className="time-group">
                      <label>
                        Time In
                      </label>

                      <div className="time-selects">
                        <select
                          name="inHour"
                          value={
                            form.inHour
                          }
                          onChange={
                            handleChange
                          }
                          required
                        >
                          <option value="">
                            Hour
                          </option>

                          {timeOptions.map(
                            (
                              hour
                            ) => (
                              <option
                                key={
                                  hour
                                }
                                value={
                                  hour
                                }
                              >
                                {
                                  hour
                                }
                              </option>
                            )
                          )}
                        </select>

                        <select
                          name="inMinute"
                          value={
                            form.inMinute
                          }
                          onChange={
                            handleChange
                          }
                          required
                        >
                          <option value="">
                            Minute
                          </option>

                          {minuteOptions.map(
                            (
                              minute
                            ) => (
                              <option
                                key={
                                  minute
                                }
                                value={
                                  minute
                                }
                              >
                                {
                                  minute
                                }
                              </option>
                            )
                          )}
                        </select>

                        <select
                          name="inPeriod"
                          value={
                            form.inPeriod
                          }
                          onChange={
                            handleChange
                          }
                        >
                          <option value="AM">
                            AM
                          </option>

                          <option value="PM">
                            PM
                          </option>
                        </select>
                      </div>
                    </div>

                    {/* TIME OUT INFO */}

                    <div className="time-group">
                      <label>
                        Time Out

                        <span>
                          {editingRecord?.timeOut
                            ? "Recorded automatically"
                            : "Automatically recorded later"}
                        </span>
                      </label>

                      <div className="timeout-not-required">
                        {editingRecord?.timeOut
                          ? `Recorded Time Out: ${editingRecord.timeOut}`
                          : "Time Out will be recorded when the instructor finishes using the lab."}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* ABSENT */}

              {form.status ===
                "Absent" && (
                <div className="form-group">
                  <label>
                    Reason for Absence
                  </label>

                  <textarea
                    name="reason"
                    value={
                      form.reason
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter reason for absence..."
                    rows="3"
                    required
                  />
                </div>
              )}

              {/* RECORDED BY */}

              <div className="form-group">
                <label>
                  Recorded By
                </label>

                <input
                  type="text"
                  name="recordedBy"
                  value={
                    form.recordedBy
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter name of recorder"
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    resetForm();

                    setShowForm(
                      false
                    );
                  }}
                >
                  Cancel
                </button>

                <div className="form-action-button">
                  <button
                    type="submit"
                    className="save-button attendance-save-button"
                  >
                    <ClipboardCheck
                      size={17}
                    />

                    Save Attendance
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================
          TIMEOUT MODAL
      ========================= */}

      {showTimeoutModal &&
        timeoutRecord && (
          <div
            className="attendance-modal-overlay timeout-overlay"
            onClick={(e) => {
              if (
                e.target ===
                e.currentTarget
              ) {
                closeTimeoutModal();
              }
            }}
          >
            <div
              className="attendance-modal timeout-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="timeout-title"
            >
              <div className="modal-header timeout-header">
                <div className="timeout-header-title">
                  <div className="timeout-icon-gold">
                    <Bell size={18} />
                  </div>

                  <div>
                    <span>
                      TIME OUT REQUIRED
                    </span>

                    <h2 id="timeout-title">
                      Record Time Out
                    </h2>
                  </div>
                </div>

                <button
                  className="modal-close"
                  type="button"
                  onClick={
                    closeTimeoutModal
                  }
                  aria-label="Close timeout modal"
                >
                  <X size={19} />
                </button>
              </div>

              {/* RECORD INFORMATION */}

              <div className="timeout-info">
                <div className="timeout-info-card">
                  <span>
                    Instructor
                  </span>

                  <strong className="timeout-instructor">
                    {
                      timeoutRecord.instructor
                    }
                  </strong>
                </div>

                <div className="timeout-info-card">
                  <span>
                    Subject
                  </span>

                  <strong className="timeout-subject">
                    {
                      timeoutRecord.subject
                    }
                  </strong>
                </div>

                <div className="timeout-info-card timeout-info-wide">
                  <span>
                    Scheduled End
                  </span>

                  <strong className="timeout-scheduled-end">
                    {
                      timeoutRecord.endTime ||
                      "—"
                    }
                  </strong>
                </div>
              </div>

              {/* ACTUAL TIME OUT */}

              <div className="form-group">
                <label>
                  Actual Time Out
                </label>

                <div className="time-selects timeout-time-selects">
                  <select
                    value={
                      timeoutHour
                    }
                    onChange={(e) =>
                      setTimeoutHour(
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Hour
                    </option>

                    {timeOptions.map(
                      (hour) => (
                        <option
                          key={
                            hour
                          }
                          value={
                            hour
                          }
                        >
                          {hour}
                        </option>
                      )
                    )}
                  </select>

                  <select
                    value={
                      timeoutMinute
                    }
                    onChange={(e) =>
                      setTimeoutMinute(
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Minute
                    </option>

                    {minuteOptions.map(
                      (minute) => (
                        <option
                          key={
                            minute
                          }
                          value={
                            minute
                          }
                        >
                          {minute}
                        </option>
                      )
                    )}
                  </select>

                  <select
                    value={
                      timeoutPeriod
                    }
                    onChange={(e) =>
                      setTimeoutPeriod(
                        e.target.value
                      )
                    }
                  >
                    <option value="AM">
                      AM
                    </option>

                    <option value="PM">
                      PM
                    </option>
                  </select>
                </div>
              </div>

              {/* WARNING */}

              <div className="timeout-warning">
                <Bell size={18} />

                <span>
                  Please record the
                  actual time the
                  instructor leaves
                  the laboratory.
                </span>
              </div>

              {/* ACTIONS */}

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={
                    closeTimeoutModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="save-button"
                  onClick={
                    handleTimeout
                  }
                >
                  <Clock3 size={17} />

                  Save Time Out
                </button>
              </div>
            </div>
          </div>
        )}

      {/* =========================
          ADD INSTRUCTOR MODAL
      ========================= */}

      {showInstructorForm && (
        <div className="attendance-modal-overlay instructor-overlay">
          <div className="attendance-modal instructor-modal">
            <div className="modal-header">
              <div>
                <span>
                  NEW INSTRUCTOR
                </span>

                <h2>
                  Add Instructor
                </h2>
              </div>

              <button
                className="modal-close"
                type="button"
                onClick={() => {
                  resetInstructorForm();

                  setShowInstructorForm(
                    false
                  );
                }}
              >
                <X size={19} />
              </button>
            </div>

            <form
              className="attendance-form"
              onSubmit={
                handleAddInstructor
              }
            >
              {/* NAME */}

              <div className="form-group">
                <label>
                  Instructor Name
                </label>

                <input
                  type="text"
                  name="name"
                  value={
                    newInstructor.name
                  }
                  onChange={
                    handleNewInstructorChange
                  }
                  placeholder="Enter instructor name"
                  autoFocus
                  required
                />
              </div>

              {/* SUBJECTS */}

              <div className="form-group">
                <div className="form-label-row">
                  <label>
                    Subjects
                  </label>

                  <button
                    type="button"
                    className="add-instructor-link"
                    onClick={
                      addSubjectField
                    }
                  >
                    <Plus size={13} />

                    Add More Subject
                  </button>
                </div>

                <div className="subject-fields">
                  {newInstructor.subjects.map(
                    (
                      subject,
                      index
                    ) => (
                      <div
                        className="subject-input-row"
                        key={
                          index
                        }
                      >
                        <input
                          type="text"
                          value={
                            subject
                          }
                          onChange={(
                            e
                          ) =>
                            handleSubjectChange(
                              index,
                              e
                                .target
                                .value
                            )
                          }
                          placeholder={`Subject ${
                            index +
                            1
                          }`}
                          required
                        />

                        {newInstructor
                          .subjects
                          .length >
                          1 && (
                          <button
                            type="button"
                            className="remove-subject-button"
                            onClick={() =>
                              removeSubjectField(
                                index
                              )
                            }
                          >
                            <X
                              size={
                                16
                              }
                            />
                          </button>
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* ACTIONS */}

              <div className="form-actions">
                <button
                  type="button"
                  className="cancel-button"
                  onClick={() => {
                    resetInstructorForm();

                    setShowInstructorForm(
                      false
                    );
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-button"
                >
                  <UserPlus
                    size={17}
                  />

                  Add Instructor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Attendance;
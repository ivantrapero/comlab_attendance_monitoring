import {
  Menu,
  Search,
  CalendarDays,
  Download,
  FileSpreadsheet,
  BarChart3,
  FileText,
} from "lucide-react";

import Sidebar from "./Sidebar";
import BugReportButton from "./BugReportButton";

import { useEffect, useMemo, useState } from "react";

import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";

import { db } from "./firebase";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import "./Reports.css";

function Reports({ user, onLogout, onNavigate }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const navigate = (page) => {
    setSidebarOpen(false);

    if (onNavigate) {
      onNavigate(page);
    }
  };

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
        setLoading(false);
      },
      (error) => {
        if (
          error?.code === "permission-denied" ||
          error?.message?.toLowerCase().includes("permission") ||
          error?.message?.toLowerCase().includes("insufficient permissions")
        ) {
          setAttendance([]);
          setLoading(false);
          return;
        }

        console.error(
          "Error loading attendance:",
          error
        );

        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getRecordDate = (record) => {
    if (!record.date) {
      return null;
    }

    if (typeof record.date === "string") {
      const parsedDate = new Date(record.date);

      if (!Number.isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    }

    if (record.date?.toDate) {
      return record.date.toDate();
    }

    return null;
  };

  const formatDate = (record) => {
    const date = getRecordDate(record);

    if (!date) {
      return record.date || "—";
    }

    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
  };

  const filteredRecords = useMemo(() => {
    return attendance.filter((record) => {
      const recordDate = getRecordDate(record);

      let matchesDate = true;

      if (dateFrom && recordDate) {
        const fromDate = new Date(
          `${dateFrom}T00:00:00`
        );

        matchesDate = recordDate >= fromDate;
      }

      if (dateTo && recordDate) {
        const toDate = new Date(
          `${dateTo}T23:59:59`
        );

        matchesDate =
          matchesDate && recordDate <= toDate;
      }

      if (selectedMonth && recordDate) {
        const [year, month] = selectedMonth
          .split("-")
          .map(Number);

        matchesDate =
          matchesDate &&
          recordDate.getFullYear() === year &&
          recordDate.getMonth() === month - 1;
      }

      const searchValue = search
        .trim()
        .toLowerCase();

      if (!searchValue) {
        return matchesDate;
      }

      const instructor = String(
        record.instructor || ""
      ).toLowerCase();

      const subject = String(
        record.subject || ""
      ).toLowerCase();

      const status = String(
        record.status || ""
      ).toLowerCase();

      const reason = String(
        record.reason || ""
      ).toLowerCase();

      const matchesSearch =
        instructor.includes(searchValue) ||
        subject.includes(searchValue) ||
        status.includes(searchValue) ||
        reason.includes(searchValue);

      return matchesDate && matchesSearch;
    });
  }, [
    attendance,
    search,
    dateFrom,
    dateTo,
    selectedMonth,
  ]);

  const totalRecords = filteredRecords.length;

  const present = filteredRecords.filter(
    (record) => record.status === "Present"
  ).length;

  const absent = filteredRecords.filter(
    (record) => record.status === "Absent"
  ).length;

  const late = filteredRecords.filter(
    (record) => record.status === "Late"
  ).length;

  const completed = filteredRecords.filter(
    (record) =>
      record.status === "Present" &&
      record.timeIn &&
      record.timeOut
  ).length;

  const currentlyIn = filteredRecords.filter(
    (record) =>
      record.status === "Present" &&
      record.timeIn &&
      !record.timeOut
  ).length;

  const attendanceRate =
    totalRecords > 0
      ? Math.round(
          ((present + late) / totalRecords) * 100
        )
      : 0;

  const exportExcel = () => {
    if (filteredRecords.length === 0) {
      alert(
        "There are no attendance records to export."
      );

      return;
    }

    const excelData = filteredRecords.map(
      (record) => ({
        Date: formatDate(record),
        "Instructor Name":
          record.instructor || "",
        Subject: record.subject || "",
        "Time In": record.timeIn || "",
        "Time Out": record.timeOut || "",
        "Reason / Remarks":
          record.reason || "",
        Status: record.status || "",
        "Recorded By":
          record.recordedBy || "",
      })
    );

    const worksheet =
      XLSX.utils.json_to_sheet(excelData);

    worksheet["!cols"] = [
      { wch: 14 },
      { wch: 25 },
      { wch: 22 },
      { wch: 12 },
      { wch: 12 },
      { wch: 22 },
      { wch: 15 },
      { wch: 18 },
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Attendance"
    );

    const fileName = selectedMonth
      ? `ComLab_Attendance_Report_${selectedMonth}.xlsx`
      : "ComLab_Attendance_Report.xlsx";

    XLSX.writeFile(workbook, fileName);
  };

  const exportPdf = () => {
    if (filteredRecords.length === 0) {
      alert(
        "There are no attendance records to export."
      );

      return;
    }

    const doc = new jsPDF();

    const pageTitle = selectedMonth
      ? `Attendance Report - ${reportMonthLabel}`
      : "Attendance Report";

    doc.setFontSize(18);
    doc.text(pageTitle, 14, 18);

    doc.setFontSize(10);

    doc.text(
      `Generated: ${new Date().toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
        }
      )}`,
      14,
      26
    );

    const rows = filteredRecords.map(
      (record) => [
        formatDate(record),
        record.instructor || "",
        record.subject || "",
        record.timeIn || "",
        record.timeOut || "",
        record.status || "",
        record.reason || "",
      ]
    );

    autoTable(doc, {
      head: [
        [
          "Date",
          "Instructor",
          "Subject",
          "Time In",
          "Time Out",
          "Status",
          "Remarks",
        ],
      ],

      body: rows,

      startY: 32,

      styles: {
        fontSize: 8,
        cellPadding: 2,
      },

      headStyles: {
        fillColor: [245, 158, 11],
        textColor: [30, 30, 30],
        fontStyle: "bold",
      },

      alternateRowStyles: {
        fillColor: [255, 247, 225],
      },

      margin: {
        left: 14,
        right: 14,
      },
    });

    const fileName = selectedMonth
      ? `ComLab_Attendance_Report_${selectedMonth}.pdf`
      : "ComLab_Attendance_Report.pdf";

    doc.save(fileName);
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setSelectedMonth("");
  };

  const monthOptions = useMemo(() => {
    const startDate = new Date(2026, 7, 1);
    const currentDate = new Date();
    const options = [];

    let current = new Date(
      startDate.getFullYear(),
      startDate.getMonth(),
      1
    );

    while (
      current.getFullYear() <
        currentDate.getFullYear() ||
      (current.getFullYear() ===
        currentDate.getFullYear() &&
        current.getMonth() <=
          currentDate.getMonth())
    ) {
      const value = `${current.getFullYear()}-${String(
        current.getMonth() + 1
      ).padStart(2, "0")}`;

      options.push({
        value,
        label: current.toLocaleString(
          "en-US",
          {
            month: "long",
            year: "numeric",
          }
        ),
      });

      current = new Date(
        current.getFullYear(),
        current.getMonth() + 1,
        1
      );
    }

    return options;
  }, []);

  const reportMonthLabel = selectedMonth
    ? new Date(
        `${selectedMonth}-01T00:00:00`
      ).toLocaleString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "All Months";

  return (
    <div className="reports-page">

      {/* =========================
          REPORT BUG
      ========================= */}

      <BugReportButton user={user} />

      <Sidebar
        user={user}
        onLogout={onLogout}
        onNavigate={navigate}
        currentPage="reports"
        sidebarOpen={sidebarOpen}
      />

      {/* MAIN */}
      <main className="reports-main">

        {/* TOPBAR */}
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

              <h1>Reports</h1>

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

                <span>
                  Online
                </span>

              </div>

            </div>
          </div>

        </header>

        {/* CONTENT */}
        <div className="reports-content">

          {/* HEADER */}
          <section className="reports-heading">

            <div>
              <h2>
                Attendance Reports
              </h2>

              <p>
                View, filter, and export
                instructor attendance
                records.
              </p>
            </div>

          </section>

          {/* MONTH FILTER */}

          <div className="report-filter-card month-filter-card">

            <div className="report-filter full-width">

              <label htmlFor="monthFilter">
                Select Month
              </label>

              <select
                id="monthFilter"
                value={selectedMonth}
                onChange={(e) =>
                  setSelectedMonth(
                    e.target.value
                  )
                }
              >
                <option value="">
                  All Months
                </option>

                {monthOptions.map(
                  (option) => (
                    <option
                      key={
                        option.value
                      }
                      value={
                        option.value
                      }
                    >
                      {option.label}
                    </option>
                  )
                )}
              </select>

            </div>

            <button
              type="button"
              className="clear-filter"
              onClick={() =>
                setSelectedMonth("")
              }
            >
              All Months
            </button>

          </div>

          {/* EXPORT ACTIONS */}

          <div className="report-actions-row">

            <div className="report-month-banner">

              <CalendarDays size={16} />

              <span>
                Generating report for:{" "}
                {reportMonthLabel}
              </span>

            </div>

            <div className="export-actions">

              <button
                type="button"
                className="export-button"
                onClick={exportExcel}
                disabled={
                  filteredRecords.length ===
                  0
                }
              >
                <Download size={17} />

                Export Excel
              </button>

              <button
                type="button"
                className="export-button secondary"
                onClick={exportPdf}
                disabled={
                  filteredRecords.length ===
                  0
                }
              >
                <FileText size={17} />

                Export PDF
              </button>

            </div>

          </div>

          {/* SUMMARY */}

          <section className="report-summary-card-panel">

            <div className="summary-header-row">

              <h3>
                Monthly Summary
              </h3>

              <span>
                {reportMonthLabel}
              </span>

            </div>

            <div className="report-summary">

              <div className="report-summary-card summary-card highlight">

                <div className="report-icon">
                  <BarChart3 size={18} />
                </div>

                <div>
                  <span>
                    Total Records
                  </span>

                  <strong>
                    {totalRecords}
                  </strong>
                </div>

              </div>

              <div className="report-summary-card summary-card">

                <div className="report-icon">
                  <span className="status-dot present-dot" />
                </div>

                <div>
                  <span>
                    Present
                  </span>

                  <strong>
                    {present}
                  </strong>
                </div>

              </div>

              <div className="report-summary-card summary-card">

                <div className="report-icon">
                  <span className="status-dot late-dot" />
                </div>

                <div>
                  <span>
                    Late
                  </span>

                  <strong>
                    {late}
                  </strong>
                </div>

              </div>

              <div className="report-summary-card summary-card">

                <div className="report-icon">
                  <span className="status-dot absent-dot" />
                </div>

                <div>
                  <span>
                    Absent
                  </span>

                  <strong>
                    {absent}
                  </strong>
                </div>

              </div>

              <div className="report-summary-card summary-card">

                <div className="report-icon">
                  <span className="status-dot active-dot" />
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

              <div className="report-summary-card summary-card">

                <div className="report-icon">
                  <span className="status-dot rate-dot" />
                </div>

                <div>
                  <span>
                    Attendance Rate
                  </span>

                  <strong>
                    {attendanceRate}%
                  </strong>
                </div>

              </div>

            </div>

          </section>

          {/* EXPORT INFO */}

          <div className="export-info">

            <FileText size={19} />

            <div>

              <strong>
                PDF Export
              </strong>

              <p>
                The current filtered
                records will be
                downloaded as
                <b>
                  {" "}
                  ComLab_Attendance_Report.pdf
                </b>
                .
              </p>

            </div>

          </div>

        </div>

      </main>

    </div>
  );
}

export default Reports;
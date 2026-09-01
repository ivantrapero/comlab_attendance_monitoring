# ComLab Attendance Monitoring

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite" alt="Vite 8" />
  <img src="https://img.shields.io/badge/Firebase-Auth%20%2B%20Firestore-FFCA28?style=for-the-badge&logo=firebase" alt="Firebase" />
  <img src="https://img.shields.io/badge/Status-Project%20Demo-28A745?style=for-the-badge" alt="Status" />
</p>

A modern attendance management system for computer laboratory monitoring. The platform helps institutions track instructor attendance, review live dashboard data, generate reports, and monitor activity efficiently.

## Overview

This project was developed as a practical attendance monitoring system for computer labs and instructional environments. It provides a simple interface for staff and administrators to manage attendance records, filter by class or date, and review a summary of activity.

## Features

- Real-time dashboard with current time display
- Attendance tracking for instructors
- Status tracking and class filtering
- Attendance summary and report-ready views
- Notifications and alert prompts
- Settings and profile management
- Firebase authentication support
- Firestore-backed data storage
- Report export support via browser-based generation tools

## Screenshots

> Add screenshots here after capturing the app UI for GitHub presentation.

```md
![Dashboard Screenshot](docs/screenshots/dashboard.png)
![Attendance Screenshot](docs/screenshots/attendance.png)
![Reports Screenshot](docs/screenshots/reports.png)
```

## Tech Stack

- React 19
- Vite 8
- Firebase Authentication
- Firestore
- Firebase Functions
- JavaScript / JSX
- CSS custom styling
- Lucide Icons
- XLSX and PDF-related report utilities

## Project Structure

```bash
comlab-attendance/
├── src/
│   ├── App.jsx
│   ├── Attendance.jsx
│   ├── Dashboard.jsx
│   ├── Notifications.jsx
│   ├── Reports.jsx
│   ├── Settings.jsx
│   ├── Sidebar.jsx
│   ├── firebase.js
│   ├── firebaseAuth.js
│   ├── main.jsx
│   └── styles/assets
├── functions/
│   ├── index.js
│   └── package.json
├── public/
├── dist/
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── .firebaserc
├── package.json
├── vite.config.js
├── index.html
├── eslint.config.js
├── README.md
└── .gitignore
```

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/ivantrapero/comlab_attendance_monitoring.git
cd comlab_attendance_monitoring
```

### 2. Install dependencies

```bash
npm install
```

### 3. Run locally

```bash
npm run dev
```

### 4. Production build

```bash
npm run build
```

## Firebase Setup

This project is configured to use Firebase services.

Before running the app in a production environment, make sure you configure:

- Firebase Authentication
- Firestore database
- Firebase Functions
- Hosting settings if deploying live

Update the Firebase configuration in:

- `src/firebase.js`
- `firebase.json`
- `firestore.rules`

## Environment Variables

If needed for your deployment, configure the relevant environment variables such as:

```bash
VITE_RECAPTCHA_V3_SITE_KEY=your_site_key
```

## Scripts

```bash
npm run dev        # local development
npm run build      # production build
npm run lint       # lint checks
npm run preview    # local preview for production build
```

## Use Cases

This system is suitable for:

- computer laboratory attendance monitoring
- instructor activity tracking
- academic lab management
- reporting and summary review
- internal operational monitoring

## Academic / Project Value

This project demonstrates:

- frontend application design
- dashboard and reporting interfaces
- state management in React
- Firebase integration
- attendance workflow implementation
- practical productivity tool development

## Deployment Notes

For live deployment, this project can be deployed to Firebase Hosting or another static hosting platform after building the project with:

```bash
npm run build
```

## License

This project is intended for educational and academic use unless otherwise specified by the owner.

## Author

ComLab Attendance Monitoring System

## Status

In active development / project demo stage.

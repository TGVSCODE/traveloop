<div align="center">
  <h1>
    <img src="https://cdn-icons-png.flaticon.com/512/616/616490.png" width="36" alt="travel icon" />
    <span>Traveloop</span>
  </h1>
</div>

<div align="center">
  <p><strong>Smart Travel Planning System — Built for trip organization, budgeting, and seamless planning.</strong></p>
</div>

<table>
  <tr>
    <td align="center" width="180"><strong>NODE.JS</strong><br><sub>18+</sub></td>
    <td align="center" width="180"><strong>EXPRESS</strong><br><sub>REST API</sub></td>
    <td align="center" width="180"><strong>FRONTEND</strong><br><sub>HTML / CSS / JS</sub></td>
    <td align="center" width="180"><strong>DATABASE</strong><br><sub>MYSQL</sub></td>
  </tr>
  <tr>
    <td align="center" width="180"><strong>AUTH</strong><br><sub>JWT</sub></td>
    <td align="center" width="180"><strong>PAYLOAD</strong><br><sub>JSON</sub></td>
    <td align="center" width="180"><strong>SECURITY</strong><br><sub>BCRYPT</sub></td>
    <td align="center" width="180"><strong>EMAIL</strong><br><sub>NODEMAILER</sub></td>
  </tr>
</table>

<p align="center">
  <a href="#overview"><strong>Overview</strong></a> •
  <a href="#features"><strong>Features</strong></a> •
  <a href="#tech-stack"><strong>Tech Stack</strong></a> •
  <a href="#project-structure"><strong>Project Structure</strong></a> •
  <a href="#getting-started"><strong>Getting Started</strong></a> •
  <a href="#api-reference"><strong>API Reference</strong></a>
</p>

---

## Overview

Traveloop is a travel planning app built to help users manage every stage of a trip—from planning and budgeting to daily activities and trip notes. It combines a modern frontend experience with a secure backend API and MySQL storage layer.

This repository contains a complete full-stack travel system with:

- `backend/` — Express.js API, authentication, and database integration
- `frontend/` — static web interface for trip management and user experience

The goal is to provide a clean, simple, and scalable platform for creating and organizing travel plans without using multiple disconnected tools.

## Features

- User signup and login
- Trip creation and trip dashboard
- Itinerary planning and travel organization
- Budget tracking and trip expense overview
- Notes and checklist management
- Weather-oriented travel views
- Profile and account management
- Admin support routes and dashboards

## Tech Stack

- Backend: Node.js, Express.js, JWT, bcrypt, MySQL
- Frontend: HTML, CSS, JavaScript
- Email: Nodemailer / Resend
- Database: MySQL
- API style: RESTful JSON endpoints

## Project Structure

```text
traveloop/
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── schema.sql
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── css/
│   ├── js/
│   ├── images/
│   ├── *.html
│   ├── style.css
│   └── script.js
├── append-css.js
├── append-darkmode.js
├── remove-profile-link.js
├── package-lock.json
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8+
- npm
- Modern browser

### 1. Clone the repository

```bash
git clone <repository-url>
cd traveloop
```

### 2. Configure environment variables

Create a `.env` file inside `backend/`:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_PORT=3306
DB_NAME=traveloop_db
```

### 3. Install backend dependencies

```bash
cd backend
npm install
```

### 4. Start the backend server

```bash
npm start
```

### 5. Run the frontend

Open the frontend directly in a browser, or serve it locally:

```bash
cd frontend
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

## API Reference

The backend exposes REST APIs under `/api` for authentication, trips, profiles, and admin features.

Common routes include:

- `/api/auth/*` — login, signup, user authentication
- `/api/trips/*` — trip and itinerary management
- `/api/profile/*` — profile and account operations
- `/api/admin/*` — admin-related access and reports

## Notes

- The frontend connects to the backend on `http://localhost:5000` by default.
- If your MySQL setup differs, update the values in `backend/.env`.
- The database schema is initialized automatically using `backend/schema.sql` when available.

## License

This repository does not currently include a formal license file. Please confirm the repository owner’s licensing requirements before using or redistributing it in production.

# 🚀 TaskFlow - Smart Task & Team Collaboration Platform

TaskFlow is a full-stack team collaboration and project management platform designed to help teams organize projects, manage tasks, track progress, and collaborate efficiently in real time.

## 🌐 Live Demo

### Frontend
https://new-stcp-frontend.vercel.app

### Backend API
https://new-stcp.onrender.com

---

# 📌 Features

## 👤 Authentication & Security

- User Registration
- User Login
- JWT Authentication
- Password Hashing using bcryptjs
- Protected Routes
- Role-Based Access Control

## 📋 Project Management

- Create Projects
- Edit Projects
- Delete Projects
- View Project Details
- Project Progress Tracking

## ✅ Task Management

- Create Tasks
- Assign Tasks to Team Members
- Update Task Status
- Delete Tasks
- Personal Task Dashboard

## 👥 Team Collaboration

- Team Creation
- Member Management
- Project Collaboration
- Real-Time Updates

## 📊 Dashboard

- Task Statistics
- Project Overview
- Team Performance Insights

## ⚡ Real-Time Features

- Socket.IO Integration
- Instant Updates
- Live Collaboration

---

# 🛠️ Tech Stack

## Frontend

- React.js
- React Router DOM
- Axios
- Socket.IO Client
- Recharts
- React Hot Toast
- CSS3

## Backend

- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT
- bcryptjs
- Socket.IO
- CORS
- dotenv

## Deployment

### Frontend

- Vercel

### Backend

- Render

### Database

- MongoDB Atlas

---

# 📂 Project Structure

```text
TaskFlow

Frontend
│
├── src
│   ├── pages
│   │   ├── Dashboard.jsx
│   │   ├── Projects.jsx
│   │   ├── ProjectDetail.jsx
│   │   ├── Board.jsx
│   │   ├── Team.jsx
│   │   ├── MyTasks.jsx
│   │   ├── Profile.jsx
│   │   ├── Login.jsx
│   │   └── Register.jsx
│   │
│   ├── App.jsx
│   ├── api.js
│   ├── contexts.js
│   ├── index.js
│   └── styles.css
│
├── public
│   └── index.html
│
└── package.json


Backend
│
├── server.js
├── package.json
├── routes
├── models
├── controllers
├── middleware
├── config
└── .env
```

---

# ⚙️ Installation

## Clone Repository

```bash
git clone https://github.com/rajugarapati1/New-STCP.git
```

or

```bash
git clone https://github.com/rajugarapati1/New-STCP-frontend.git
```

---

# Backend Setup

## Install Dependencies

```bash
npm install
```

## Create .env File

```env
PORT=10000

MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_secret_key

CLIENT_URL=http://localhost:3000
```

## Start Backend

```bash
npm start
```

or

```bash
npm run dev
```

---

# Frontend Setup

## Install Dependencies

```bash
npm install
```

## Create .env File

```env
REACT_APP_API_URL=http://localhost:5000/api

REACT_APP_SOCKET_URL=http://localhost:5000
```

## Start Frontend

```bash
npm start
```

---

# 🚀 Deployment

## Backend Deployment (Render)

### Environment Variables

```env
MONGODB_URI=your_mongodb_connection_string

JWT_SECRET=your_secret_key

CLIENT_URL=https://new-stcp-frontend.vercel.app
```

Backend URL:

```text
https://new-stcp.onrender.com
```

---

## Frontend Deployment (Vercel)

### Environment Variables

```env
REACT_APP_API_URL=https://new-stcp.onrender.com/api

REACT_APP_SOCKET_URL=https://new-stcp.onrender.com
```

Frontend URL:

```text
https://new-stcp-frontend.vercel.app
```

---

# 📡 API Endpoints

## Authentication

```http
POST /api/auth/register

POST /api/auth/login

GET /api/auth/me

PUT /api/auth/profile

PUT /api/auth/password
```

## Projects

```http
GET /api/projects

POST /api/projects

GET /api/projects/:id

PUT /api/projects/:id

DELETE /api/projects/:id
```

## Tasks

```http
GET /api/tasks

POST /api/tasks

GET /api/tasks/:id

PUT /api/tasks/:id

DELETE /api/tasks/:id
```

## Teams

```http
GET /api/teams

POST /api/teams

DELETE /api/teams/:id
```

---

# 📸 Screenshots

Add screenshots here:

```text
Login Page

Dashboard

Projects Page

Task Board

Team Management

Profile Page
```

---

# 🎯 Future Enhancements

- Email Verification
- Password Reset
- File Attachments
- Task Comments
- Notifications
- Calendar View
- Dark/Light Theme
- Activity Logs
- Analytics Dashboard

---

# 👨‍💻 Author

## Raju Garapati

GitHub:

https://github.com/rajugarapati1

---

# 📜 License

This project is developed for educational, portfolio, and learning purposes.

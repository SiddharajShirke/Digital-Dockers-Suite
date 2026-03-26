<p align="center">
  <img src="https://img.shields.io/badge/Digital_Dockers-Suite-6C63FF?style=for-the-badge&labelColor=0D1117&logo=docker&logoColor=6C63FF" alt="Digital Dockers Suite" />
</p>

<h1 align="center">🚀 Digital Dockers Suite</h1>

<p align="center">
  <strong>An AI-Powered Enterprise Workplace Automation Platform</strong>
</p>

<p align="center">
- [x] Epics & Roadmap Timelines
- [x] Subtask Hierarchies & Work Logs
- [x] **New**: Mirotalk SFU Video Conferencing
- [x] **New**: HttpOnly Cookie Authentication
- [x] AI-Powered Codebase MRI (Code Intelligence)
- [x] Workplace Automation via n8n
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-7-646CFF?style=flat-square&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-5-000000?style=flat-square&logo=express&logoColor=white" />
  <img src="https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white" />
  <img src="https://img.shields.io/badge/Socket.IO-4-010101?style=flat-square&logo=socket.io&logoColor=white" />
  <img src="https://img.shields.io/badge/Gemini-AI-8E75B2?style=flat-square&logo=googlegemini&logoColor=white" />
  <img src="https://img.shields.io/badge/n8n-Workflows-EA4B71?style=flat-square&logo=n8n&logoColor=white" />
  <img src="https://img.shields.io/badge/License-ISC-blue?style=flat-square" />
</p>

<br />

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Deep Dive & Architecture](#-deep-dive--architecture)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [n8n Workflows](#-n8n-workflows)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**Digital Dockers Suite** is a full-stack, AI-powered enterprise workspace designed for modern engineering teams. It combines **project management**, **real-time collaboration**, **AI-driven code health analysis**, and **workplace automation** into a single, unified platform.

Built with a MERN-like stack (MongoDB, Express, React, Node.js) and enhanced with **Google Gemini AI**, **Socket.IO** for real-time features, and **n8n** workflow automations, the platform empowers teams to plan sprints, monitor technical debt, review pull requests, generate reports, and much more — all from one dashboard.

---

## 🧠 Deep Dive & Architecture

For a comprehensive end-to-end breakdown of the project—including Problem Statements, Implementation Methodology, and Technical Visualizations (System Architecture, User Flow, and Sequence Diagrams)—please see the [UNDERSTANDING.md](./UNDERSTANDING.md) document.

---

## ✨ Key Features

### 📊 Project Management
| Feature | Description |
|---|---|
| **Kanban Task Board** | Drag-and-drop task management with priorities, labels, and assignments |
| **Sprint Planning** | Create and manage sprints with burndown charts and velocity tracking |
| **Backlog Grooming** | Organize and prioritize your product backlog |
| **Epic & Roadmap Timelines** | Visualize project milestones on interactive roadmap views |
| **Subtask Hierarchies** | Break tasks into granular work items with dependency tracking |
| **Work Logs & Time Tracking** | Built-in timer and manual logging for work effort tracking |

### 🤖 AI-Powered Intelligence
| Feature | Description |
|---|---|
| **Codebase MRI** | Deep-scan any GitHub repo for tech debt — complexity hotspots, churn analysis, dependency risks, and code smells visualized via heatmaps and scatter plots |
| **Gatekeeper Stream** | AI-powered pull request review feed with automated code quality analysis |
| **AI Project Architect** | Upload employee CVs to auto-generate sprints, assign subtasks, and intelligently manage emergency re-allocations |
| **AI Chatbot** | Context-aware assistant powered by Gemini AI for project queries |
| **Smart Reassignment** | AI-driven workload balancing and task reassignment recommendations |
| **AI Insight Banners** | Personalized "For You" suggestions based on project activity |
| **RAG Document Search** | Retrieval-Augmented Generation for intelligent document querying |

### 💬 Real-Time Collaboration
| Feature | Description |
|---|---|
| **Live Chat** | Real-time messaging with room-based conversations via Socket.IO |
| **Spaces** | Collaborative workspaces with content, comments, and activity feeds |
| **Notifications** | Real-time push notifications with read/unread, categories, and batching |
| **Activity Stream** | Live feed of all project events and team actions |

### 🏢 Workplace Tools
| Feature | Description |
|---|---|
| **Meeting Scheduler** | Create, manage, and track meetings with agenda support |
| **Mirotalk SFU** | **New**: Integrated high-performance WebRTC video conferencing for private team rooms |
| **Email Generator** | AI-powered professional email drafting |
| **PPT Generator** | Automated presentation creation powered by n8n + PptxGenJS |
| **Document Manager** | Upload, analyze, and organize documents (PDF, DOCX parsing) |
| **Calendar Work Planner** | Visual calendar for planning and scheduling work items |
| **Wellness Check-ins** | Guided breathing and check-in tools for team mental health support |

### 🛡️ Administration & Reporting
| Feature | Description |
|---|---|
| **Role-Based Dashboards** | Custom views for Admins, Project Managers, Team Leads, and Developers |
| **Team Management** | Organizational graph, team CRUD, and member role management |
| **Reports & Analytics** | Generate project status reports with integrated charts |
| **Workload Dashboard** | Monitor team capacity and identify overloaded members |
| **GitHub Webhooks** | Ingest GitHub events for automated PR tracking and issue syncing |

---

## 🏗️ Architecture

![WhatsApp Image 2026-02-25 at 1 17 02 AM](https://github.com/user-attachments/assets/6e10bbb5-da19-4b66-b23a-720f3309e52b)


## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 19** | UI framework |
| **Vite 7** | Build tool & dev server |
| **MUI (Material UI) 7** | Primary component library |
| **Ant Design 6** | Supplementary UI components |
| **Framer Motion** | Animations & transitions |
| **D3.js** | Advanced data visualizations (Codebase MRI heatmaps) |
| **Recharts + Chart.js** | Dashboard charts & burndown graphs |
| **ReactFlow + Dagre** | Organizational graph layout |
| **Socket.IO Client** | Real-time WebSocket communication |
| **React Hook Form + Yup** | Form handling & validation |
| **React Router v7** | Client-side routing |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js** | Runtime environment |
| **Express 5** | Web framework |
| **MongoDB + Mongoose 9** | Database & ODM |
| **Socket.IO 4** | Real-time bidirectional communication |
| **Passport.js** | Authentication (**Secure HttpOnly Cookies** + Google OAuth 2.0) |
| **Google Gemini AI** | AI-powered analysis and insights |
| **Mistral AI** | Main chatbot responses |
| **OpenAI** | Code review analysis |
| **Mirotalk SFU** | WebRTC video conferencing server |
| **Octokit** | GitHub API integration |
| **Bull** | Job queue management (Redis-backed) |
| **Sharp** | Image processing |
| **Puppeteer** | Web scraping & PDF generation |
| **PptxGenJS** | PowerPoint presentation generation |
| **Nodemailer** | Email delivery |

### DevOps & Tooling
| Technology | Purpose |
|---|---|
| **n8n** | Workflow automation (Email, PPT, Document analysis) |
| **Concurrently** | Parallel process runner for monorepo dev |
| **Nodemon** | Backend hot-reload |
| **ESLint** | Code linting |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 20.0.0
- **npm** ≥ 9.x
- **MongoDB Atlas** account (or local MongoDB instance)
- **Git**

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/SiddharajShirke/Digital-Dockers-Suite.git
cd Digital-Dockers-Suite
```

**2. Install all dependencies**

```bash
# Install root, backend, and frontend dependencies
npm run install:all
```

> **💡 Tip:** If you encounter peer dependency conflicts, use:
> ```bash
> cd backend && npm install --legacy-peer-deps
> cd ../frontend && npm install --legacy-peer-deps
> ```

**3. Set up environment variables**

```bash
# Copy the example env file
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your actual credentials (see [Environment Variables](#-environment-variables)).

**4. Start the application**

```bash
The backend is proxied through the Vite development server for a seamless development experience.

```bash
# Start both frontend and backend concurrently (recommended)
npm run dev

# This will launch:
# - Frontend: https://localhost:5173
# - Backend:  https://localhost:5001 (Proxied)
# - Mirotalk: https://localhost:3010
```

Or start them separately:

```bash
# Terminal 1 — Backend (SSL enabled)
npm run server

# Terminal 2 — Frontend (Vite with Proxy)
npm run client

# Terminal 3 — Mirotalk SFU
cd mirotalksfu && npm start
```

**5. Open in browser**

Navigate to: [http://localhost:5173](http://localhost:5173)

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` directory. See [`backend/.env.example`](backend/.env.example) for a complete template.

| Variable | Required | Description |
|---|---|---|
| `MONGO_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret key for JWT token signing |
| `JWT_EXPIRE` | ✅ | Token expiry duration (e.g., `30d`) |
| `PORT` | ❌ | Server port (default: `5000`) |
| `NODE_ENV` | ❌ | Environment mode (`development` / `production`) |
| `GOOGLE_CLIENT_ID` | ❌ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ❌ | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | ❌ | Google OAuth callback URL |
| `GEMINI_API_KEY` | ❌ | Google Gemini API key (for AI features) |
| `MISTRAL_API_KEY` | ❌ | Mistral AI key (for main chatbot) |
| `OPENAI_API_KEY` | ❌ | OpenAI key (for code review) |
| `GITHUB_TOKEN` | ❌ | GitHub PAT (increases API rate limit) |
| `REDIS_URL` | ❌ | Redis URL (for Bull queues; mock used in dev) |
| `CLIENT_URL` | ❌ | Frontend URL for CORS |
| `N8N_PPT_WEBHOOK_URL` | ❌ | n8n webhook for PPT generation |

---

## 📁 Project Structure

```
Digital-Dockers-Suite/
├── backend/                     # Express.js API Server
│   ├── config/                  # DB connection, Passport, Queue config
│   ├── controllers/             # Route handlers (32 controllers)
│   ├── middlewares/              # Auth, role, upload, error middleware
│   ├── models/                  # Mongoose schemas (32 models)
│   ├── routes/                  # API route definitions (33 routes)
│   ├── services/                # Business logic & AI integrations
│   │   ├── analysis/            # CodebaseMRI analysis engine
│   │   ├── geminiService.js     # Google Gemini AI integration
│   │   ├── githubService.js     # GitHub API operations
│   │   ├── prAnalysisService.js # Pull request code review AI
│   │   └── ...                  # 27+ service modules
│   ├── websocket/               # Socket.IO notification handler
│   ├── scripts/                 # Utility & seed scripts
│   ├── server.js                # Application entry point
│   └── .env.example             # Environment variable template
│
├── frontend/                    # React + Vite Client App
│   └── src/
│       ├── components/          # UI Components (106+)
│       │   ├── dashboards/      # Role-based dashboard views
│       │   ├── tasks/           # Kanban board & task management
│       │   ├── backlog/         # Backlog management
│       │   ├── spaces/          # Collaborative workspaces
│       │   ├── wellness/        # Wellness check-in UI
│       │   ├── meetings/        # Meeting scheduler
│       │   ├── chat/            # Real-time chat interface
│       │   ├── CodebaseMRI.jsx  # Tech debt heatmap visualization
│       │   └── ...
│       ├── context/             # React Context (Auth, Chat, Theme, Timer, Project)
│       ├── hooks/               # Custom hooks (WebSocket, Teams, Timer, etc.)
│       ├── pages/               # Page-level components (14 pages)
│       ├── services/            # API service layer (Axios clients)
│       └── styles/              # Global styles & theme
│
├── n8n/                         # n8n Workflow Automations
│   ├── Auto Email Sender.json
│   ├── PPT Generator.json
│   ├── Generate Structured Summary & Q&A from Documents.json
│   └── Intelligent Legal Document Review.json
│
├── package.json                 # Root monorepo configuration
└── README.md
```

---

## 📡 API Reference

The backend exposes **33 REST API route groups** under `/api/`:

| Endpoint | Description |
|---|---|
| `/api/auth` | Authentication (register, login, Google OAuth) |
| `/api/users` | User profiles & management |
| `/api/projects` | Project CRUD |
| `/api/tasks` | Task management (Kanban board) |
| `/api/sprints` | Sprint planning & management |
| `/api/burndown` | Burndown chart data |
| `/api/work-items` | Subtasks & work item breakdowns |
| `/api/work-logs` | Time tracking & work logs |
| `/api/epics` | Epic management |
| `/api/backlog` | Backlog items |
| `/api/roadmap` | Roadmap data |
| `/api/meetings` | Meeting scheduler CRUD |
| `/api/chat` | Chat room messages |
| `/api/chatbot` | AI Chatbot queries |
| `/api/emails` | Email generation |
| `/api/ppt` | PPT generation via n8n |
| `/api/documents` | Document upload & management |
| `/api/rag` | RAG-powered document Q&A |
| `/api/wellness` | Wellness check-in data |
| `/api/calendar` | Calendar events |
| `/api/reports` | Report generation |
| `/api/insights` | AI-generated insights |
| `/api/notifications` | Push notification management |
| `/api/spaces` | Collaborative spaces |
| `/api/teams` | Team CRUD & members |
| `/api/workload` | Workload analytics |
| `/api/reassignment` | Smart task reassignment |
| `/api/activity` | Activity feed |
| `/api/tech-debt` | Code health & tech debt analysis |
| `/api/health` | System health checks |
| `/api/integrations` | GitHub integration endpoints |
| `/api/analysis` | Codebase analysis orchestration |
| `/api/n8n` | n8n workflow triggers |
| `/api/webhooks` | GitHub webhook receivers |

---

## ⚙️ n8n Workflows

The platform integrates with **n8n** for workflow automations:

| Workflow | Description |
|---|---|
| **Auto Email Sender** | Automated email drafting and delivery |
| **PPT Generator** | AI-powered presentation creation from project data |
| **Document Summary & Q&A** | Structured summary generation from uploaded documents |
| **Legal Document Review** | Intelligent compliance analysis for legal documents |

> To use n8n workflows, install [n8n](https://n8n.io/) and import the JSON files from the `n8n/` directory.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Development Guidelines

- Follow existing code style and project structure
- Write meaningful commit messages
- Update documentation for new features
- Test your changes before submitting a PR

---

## 📄 License

This project is licensed under the **ISC License**. See the [LICENSE](LICENSE) file for details.

---

<p align="center">
  <strong>Built with ❤️ by the Digital Dockers Team</strong>
</p>

<p align="center">
  <a href="#-digital-dockers-suite">⬆ Back to Top</a>
</p>

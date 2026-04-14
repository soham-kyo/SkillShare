# SkillShare — P2P Learning & Collaboration Platform 🎓

SkillShare is a college-exclusive, peer-to-peer platform designed to facilitate knowledge exchange and project collaboration among students. Built as a final-year Capstone project, it uses a **Credits-based economy** to reward helpfulness and foster a collaborative campus culture.

---

## 🚀 Key Features

### 1. 🧠 Smart Matchmaking (Project Hub)
Find the perfect team for your **Final Year Projects (FYP)**, **Hackathons**, or **Research**.
- **Skill-Based Prioritization**: An intelligent algorithm bubbles projects that match your expertise (e.g., React, Python) to the top with a "Highly Recommended" badge.
- **Application System**: Users can apply to projects, and owners can review, accept, or decline partners.
- **Project Categories**: Specialized tracks for FYPs, Research, and Hackathons.

### 2. 📋 Live Help Board
A real-time bulletin board for immediate academic assistance.
- **Credits Economy**: Post requests with a credit reward; helpers earn credits by successfully resolving issues.
- **Instant Filtering**: Sophisticated categorization and skill-matching ensure you see problems you are uniquely qualified to solve.
- **Interactive Status**: Tracks requests through *Open*, *In Progress*, and *Resolved* states.

### 3. 💬 Advanced Real-Time Messaging
A high-performance communication layer built for coordination.
- **WhatsApp-Style UI**: Unread messages are **bold and bright**, softening on readout for clear visual hierarchy.
- **Numerical Badges**: Persistent unread counts in the sidebar keep you informed of pending messages at a glance.
- **Granular Notifications**: Real-time "activity dots" across the navigation bar alert you to new messages or help requests.

### 4. 🔒 Security & User Privacy
- **Centralized Route Protection**: Strict authentication ensures sensitive pages (Chat, Profile, Boards) are accessible only to verified users.
- **Onboarding Verification**: Mandatory setup flow for College IDs and skills ensures platform integrity.
- **Privacy Controls**: Un-onboarded users are unsearchable and their profiles remain private until their setup is complete.

### 5. 👥 Professional Student Profiles
- **Community Impact**: A data-driven section showing "Total People Helped" and "Active Engagements."
- **Skill Endorsements**: Displays a student's verified skill set and educational background (Branch, College Name).

---

## 🛠️ Technology Stack

| Layer          | Technology                                   |
| -------------- | -------------------------------------------- |
| **Frontend**   | React 18, Vite, Wouter (Routing), Shadcn UI |
| **State/Data** | TanStack Query (React Query), Zod           |
| **Backend**    | Express.js, TypeScript                       |
| **Database**   | PostgreSQL (via pg), Drizzle ORM             |
| **Auth**       | Passport.js (Local Strategy), bcryptjs       |
| **Styling**    | Tailwind CSS, Framer Motion (Animations)     |

---

## 📥 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- PostgreSQL Database

### Installation
1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd SkillShare
   ```
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL=postgresql://user:password@host:5432/dbname
   SESSION_SECRET=your_secure_random_string
   ```
4. **Initialize Database**:
   ```bash
   npm run db:push
   ```
5. **Run Development Server**:
   ```bash
   npm run dev
   ```
   *Platform available at: `http://localhost:5000`*

---

## 📂 Project Structure
- `client/`: React application with modular component architecture.
- `server/`: Express API with persistent storage layer (`storage.ts`).
- `shared/`: Unified Zod schemas and Drizzle models for type safety across the stack.

---

**Designed & Developed as a Capstone Project.**
# DebugArena — College Debugging & Timed Coding Challenge Platform

DebugArena is a full-stack, live competition platform engineered for university hackathons and coding tournaments. It features a unified monorepo housing both the **Participant Assessment Portal** and the **Admin Command Dashboard**.

---

## 🌟 Key Architecture & Highlights

- **Server-Authoritative Timing & Auto-Submit**: Timer countdowns are computed strictly on the backend using server timestamps. Client clocks are never trusted. A background daemon sweeps expired rounds and auto-submits any active sessions automatically.
- **Strict Anti-Cheat & Proctoring**: Mandatory full-screen mode on assessment entry. Fullscreen exits and tab switches trigger security warnings, increment violation strikes, and auto-submit upon exceeding limits (default: 3 strikes).
- **Zero Data Loss & Offline Queue**: Real-time debounced saving (~1.5–2.5s) to the backend. In-progress states (selected options, code buffers, and review flags) survive browser reloads. If network drops, answers are queued locally and automatically synced upon reconnecting.
- **Multi-Round Sequential Progression**:
  - **Round 1 (MCQ)**: 10 code debugging questions. Instant auto-grading, strictly **no negative marking**.
  - **Round 2 (Coding)**: 3 algorithmic debugging challenges with buggy starter code across Python, JavaScript, C, C++, and Java.
  - **Round 3 (Coding)**: 2 advanced debugging challenges with visible sample cases and hidden test cases.
- **Top Performer Manual Advancement**: After each round, administrators review a ranked leaderboard (points + time taken) and hand-pick or quick-select top performers (`Top N`) to advance. Non-selected participants are permanently locked out of subsequent rounds.
- **Sudden-Death Tie-Break Engine**: Flags participants tied on *both* score AND time taken post-Round 3. Assigns an extra challenge to the tied subset to reorder the final podium without altering base scores.
- **Real-Time Live Monitoring**: Socket.io gateway broadcasting participant logins, real-time code executions, submissions, and security strikes directly to the admin live feed.
- **Zero-Friction Local Database**: Automatically utilizes `mongodb-memory-server` if external MongoDB URI is not set, guaranteeing instantaneous out-of-the-box local execution.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- Python 3 (`py` or `python`) for native Python execution (C, C++, Java supported when Judge0/Piston URL is supplied in `.env`)

### 2. Install Dependencies
```bash
npm run install:all
```
*Or install separately:*
```bash
cd server && npm install
cd ../client && npm install
```

### 3. Run Development Servers
To run both backend and frontend concurrently:
```bash
# Terminal 1: Backend Server (runs on http://localhost:5000)
npm run server

# Terminal 2: Frontend Client (runs on http://localhost:5173)
npm run client
```

---

## 🔑 Default Seeded Accounts

The database auto-seeds on first startup with demo accounts and question banks:

| Role | Username | Password | Purpose |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` | Full tournament control, live feed, advancement, leaderboard |
| **Participant 1** | `team1` | `debug123` | Demo participant (Binary Beasts) |
| **Participant 2** | `team2` | `debug123` | Demo participant (Null Pointers) |
| **Participant 3** | `team3` | `debug123` | Demo participant (Stack Overflows) |
| **Participant 4** | `team4` | `debug123` | Demo participant (Byte Benders) |
| **Participant 5** | `team5` | `debug123` | Demo participant (Logic Bombs) |
| **Participant 6** | `team6` | `debug123` | Demo participant (Syntax Strikers) |

---

## 🧪 Automated Testing & Verification

Run the full end-to-end integration test suite:
```bash
cd server
npx tsx src/scripts/verify_all.ts
npx tsx src/scripts/verify_tiebreak.ts
```

Run the automated Chrome browser verification and screenshot capture:
```bash
cd server
npx tsx src/scripts/browser_verify.ts
```

---

## 📁 Project Structure

```
debugarena/
├── package.json               # Root scripts
├── README.md                  # Setup & user guide
├── client/                    # Vite + React + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/         # LiveMonitor, CompetitionControl, RoundResults, Leaderboard, etc.
│   │   │   ├── participant/   # InstructionsView, McqShell, CodingShell, TieBreakShell, etc.
│   │   │   └── common/        # Navbar, ConnectionBadge, ViolationModal, etc.
│   │   ├── context/           # AuthContext, SocketContext
│   │   ├── hooks/             # useFullscreen, useTimer, useDebounce
│   │   ├── services/          # api.ts (with offline queue), socket.ts
│   │   ├── App.tsx            # Portal & Dashboard router
│   │   └── main.tsx
│   └── vite.config.ts
└── server/                    # Express + TypeScript + Mongoose + Socket.io
    ├── src/
    │   ├── config/            # db.ts (MemoryServer fallback), env.ts
    │   ├── models/            # User, Round, Question, Attempt, RoundProgress, TieBreak, etc.
    │   ├── middleware/        # auth.ts (JWT verify, role guards, anti-cheat checks)
    │   ├── routes/            # auth.ts, participant.ts, admin.ts
    │   ├── services/          # judgeService.ts, scoringService.ts, timerService.ts, socketService.ts
    │   ├── scripts/           # seed.ts, verify_all.ts, verify_tiebreak.ts, browser_verify.ts
    │   └── server.ts          # Express HTTP + Socket.io entrypoint
    └── tsconfig.json
```

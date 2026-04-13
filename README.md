#  Real-Time Auction Simulator (Copart-Style)

A full-stack, real-time auction platform that simulates live vehicle bidding with **concurrency-safe transactions**, **WebSocket updates**, and **event-driven notifications**.

> Built to demonstrate production-grade backend engineering concepts including race condition handling, real-time systems, and transactional integrity.


## 🔥 Live Demo

👉 frontend link : https://real-time-auction-system-eight.vercel.app/
👉 backend link: https://real-time-auction-system.onrender.com/


## 🧠 Key Features

### 🔐 Authentication & User Identity

* JWT-based authentication
* Secure session management on login/logout
* User identity drives targeted events (outbid notifications, bid ownership)

---

### ✅ Concurrency-Safe Bidding

* Uses **database transactions + `SELECT ... FOR UPDATE`**
* Prevents race conditions when multiple users bid simultaneously
* Guarantees only one winning bid at any moment

---

### ⚡ Real-Time Bid Updates

* Powered by **Socket.IO**
* All connected users see bids instantly
* Supports multi-user live auction rooms

---

### 🔔 Outbid Notifications (Targeted)

* Real-time **user-specific WebSocket events**
* Instantly notifies users when they are outbid
* Includes contextual data (vehicle + bid amount)

---

### ⏱ Anti-Sniping Mechanism

* Automatically extends auction timer when bids occur near closing
* Prevents last-second unfair wins
* Mimics real-world auction platforms

---

### 📊 Consistent Bid State (No Data Drift)

* Bid status is **derived from source-of-truth (lot state)**
* Avoids stale or inconsistent UI states
* Ensures accurate "winning / outbid / completed" statuses

---

## 🏗️ System Design Highlights

### 🔒 Transactional Integrity

```sql
SELECT ... FOR UPDATE
```

* Locks auction lot row during bidding
* Ensures safe concurrent updates

---

### 📡 Event-Driven Architecture

* WebSocket-based communication layer
* Room-based broadcasting (`auction:<id>`)
* User-targeted events for personalized notifications

---

### 🔁 Real-Time Synchronization

* Backend = source of truth
* WebSocket = real-time UI sync layer
* React Query = controlled refetch + caching (handles deduplication, background revalidation, and stale state management)

---

## 🧪 Demo Scenarios (What You Can Test)

1. **Register two accounts** and open each in a separate browser session

2. **Place simultaneous bids**
   → Only one succeeds (proves concurrency safety)

3. **Get outbid**
   → Instant notification appears on the outbid user's session

4. **Place a last-second bid**
   → Auction timer extends automatically

---

## 🛠️ Tech Stack

### Frontend

* React + TypeScript
* React Query
* Socket.IO Client

### Backend

* Node.js + Express
* PostgreSQL
* Socket.IO
* JWT (Authentication)

### Database

* Transactional queries
* Row-level locking
* Relational joins for enriched data

---

## 📁 Project Structure

```bash
client/        # React frontend
server/        # Node.js backend
  ├── modules/
  │     ├── auth/
  │     ├── bids/
  │     ├── auctions/
  │     └── lots/
  ├── services/
  └── socket/
```

---

## 🚀 Getting Started (Local Setup)

### 1. Clone repo

```bash
git clone https://github.com/zaawmilen/Real-time-auction-system.git
cd auction-simulator
```

### 2. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

### 3. Configure environment variables

Create `.env` in `/server`:

```env
DATABASE_URL=your_postgres_url
JWT_SECRET=your_secret
FRONTEND_URL=http://localhost:5173
```

### 4. Seed the database

The server includes a seed script to populate auction lots and vehicles for testing:

```bash
cd server
npm run seed
```

### 5. Run app

```bash
# backend
cd server
npm run dev

# frontend
cd client
npm run dev
```

---

## 🎯 What This Project Demonstrates

* Handling **race conditions in real systems**
* Designing **real-time architectures**
* Implementing **event-driven communication**
* Maintaining **data consistency under concurrency**
* Building **production-like backend logic**
* Securing APIs with **JWT-based authentication**

---

## 📌 Future Improvements (Planned)

* Proxy bidding (auto-bid engine)
* Redis Pub/Sub for multi-server scaling
* Persistent notification system
* Auction analytics dashboard

---

## 👨‍💻 Author

**Zewdie K. Gebrehiwot**
Full-Stack Developer | Backend-Focused

* Strong interest in real-time systems & scalable architectures

---

## ⭐ If You Like This Project

Give it a star ⭐ — it helps visibility and supports my work!

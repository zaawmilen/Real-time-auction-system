# Real-Time Auction System (Copart-Style)

A real-time auction platform designed to **handle concurrent bidding without race conditions**.

Built with WebSockets and transactional database locking to ensure that when multiple users bid at the same time, **only the correct highest bid is accepted**—consistently across all clients.

---

## ⚡ Concurrency Proof (Core Feature)

Open two browsers and place bids at the same time:

* Only one bid succeeds
* The other is rejected
* All clients update instantly

This guarantees:

* No race conditions
* No stale updates
* Strong data consistency under concurrency

---

## 🚀 Live Demo

Frontend: https://real-time-auction-system-eight.vercel.app/
Backend: https://real-time-auction-system.onrender.com/

### Test It Yourself

1. Open two browser sessions
2. Login as different users
3. Place bids simultaneously
4. Observe real-time updates + bid rejection

---

## 🧠 Key Features

### ✅ Concurrency-Safe Bidding

* Uses **database transactions + row-level locking (`SELECT ... FOR UPDATE`)**
* Prevents conflicting updates from simultaneous bids
* Guarantees a single valid highest bid

---

### ⚡ Real-Time Updates (WebSockets)

* Powered by **Socket.IO**
* Instant bid propagation across all connected clients
* Room-based event broadcasting (`auction:<id>`)

---

### 🔔 Outbid Notifications

* User-targeted WebSocket events
* Instant feedback when a user is outbid
* Context-aware (bid amount + auction item)

---

### ⏱ Anti-Sniping Timer

* Last-second bids extend auction time
* Prevents unfair last-millisecond wins
* Server-controlled for accuracy and fairness

---

### 🔐 Authentication & Roles

* JWT-based authentication
* Role-based access:

  * Auctioneer → controls auction flow
  * Bidder → participates in bidding

---

### 🔁 Fault-Tolerant Reconnect

* Refresh-safe architecture
* Clients automatically:

  * Resync auction state
  * Restore timer
  * Rejoin WebSocket stream

---

## 🏗️ System Design Highlights

### 🔒 Transactional Integrity

```sql
SELECT ... FOR UPDATE
```

* Locks auction row during bidding
* Ensures safe concurrent updates

---

### 📡 Event-Driven Architecture

* WebSocket-based communication
* Real-time event broadcasting
* User-specific event targeting

---

### 📊 Consistency Model

* Backend = **single source of truth**
* Clients = **stateless renderers of server state**
* React Query = caching + background synchronization

---

## 🧪 Demo Scenarios

* Simultaneous bidding → only one wins
* Real-time updates across multiple clients
* Instant outbid notifications
* Timer extension on last-second bids
* Seamless recovery after browser refresh

---

## 🛠️ Tech Stack

**Frontend**

* React + TypeScript
* React Query
* Socket.IO Client

**Backend**

* Node.js + Express
* PostgreSQL
* Socket.IO
* JWT Authentication

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

## 🚀 Local Setup

```bash
git clone https://github.com/zaawmilen/Real-time-auction-system.git
cd auction-simulator
```

```bash
# install
cd server && npm install
cd ../client && npm install
```

```bash
# environment (.env in /server)
DATABASE_URL=your_postgres_url
JWT_SECRET=your_secret
FRONTEND_URL=http://localhost:5173
```

```bash
# seed data
cd server
npm run seed
```

```bash
# run
npm run dev
```

---

## 📌 Roadmap

* Bid history (audit trail)
* Proxy bidding (auto-bid engine)
* Redis Pub/Sub for horizontal scaling
* Persistent notification system

---

## 👨‍💻 Author

**Zewdie K. Gebrehiwot**
Full-Stack Developer (Backend-Focused)
Interested in real-time systems, concurrency, and scalable architectures

---

⭐ If this project helped or impressed you, consider giving it a star.

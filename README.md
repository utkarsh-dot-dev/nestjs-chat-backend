# Hybrid Chat Backend (NestJS + PostgreSQL/MySQL + Firebase Firestore)

A scalable chat backend built with **NestJS** and **TypeScript (strict typing)** utilizing a **hybrid data architecture**:
- **Relational DB (PostgreSQL / MySQL / SQLite)**: Manages structured entities—Users, Chats (1:1 & Group), and Chat Memberships with relational integrity.
- **Firebase Firestore**: Stores high-throughput, time-series, and real-time chat data—Messages, Read Receipts, and Per-User Last Seen pointers.

---

## 🏛 Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │              NestJS API Server               │
                      │  (Controllers, Pipes, Filters, Swagger Docs) │
                      └──────────────┬────────────────┬──────────────┘
                                     │                │
            Relational DB Operations │                │ Document & Real-time Operations
            (TypeORM)                │                │ (Firebase Admin SDK / Firestore)
                                     ▼                ▼
             ┌───────────────────────────────┐ ┌───────────────────────────────┐
             │ PostgreSQL / MySQL / SQLite   │ │       Firebase Firestore      │
             ├───────────────────────────────┤ ├───────────────────────────────┤
             │ • users                       │ │ • /chats/{chatId}/messages/   │
             │ • chats (1:1 & Group)         │ │   - message text              │
             │ • chat_members (roles, dates) │ │   - timestamp, readBy array   │
             │                               │ │   - readReceipts map          │
             │                               │ │ • /chats/{chatId}/lastSeen/   │
             │                               │ │   - lastSeenMessageId         │
             └───────────────────────────────┘ └───────────────────────────────┘
```

---

## ⚙️ Configuration & Setup

Configuration is handled via `.env`:

```env
PORT=3001
NODE_ENV=development

# Relational Database (PostgreSQL, MySQL, or SQLite)
DB_TYPE=sqlite
DB_DATABASE=chat_backend.sqlite
DB_SYNCHRONIZE=true
DB_LOGGING=false

# To use PostgreSQL:
# DB_TYPE=postgres
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=postgres
# DB_PASSWORD=your_password
# DB_NAME=chat_db
# Or DATABASE_URL=postgresql://postgres:password@localhost:5432/chat_db

# Firebase Firestore Configuration
# Default is true for instant offline testing without needing remote GCP credentials:
USE_MOCK_FIRESTORE=true

# For live Firebase Firestore:
# USE_MOCK_FIRESTORE=false
# FIREBASE_PROJECT_ID=your-project-id
# FIREBASE_CLIENT_EMAIL=service-account@your-project.iam.gserviceaccount.com
# FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# Or GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
# Or FIRESTORE_EMULATOR_HOST=localhost:8080
```

---

## 🏃 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Seed Initial Demo Users
Pre-populates demo users (`user_alice`, `user_bob`, `user_charlie`, `user_diana`) and initial chat data:
```bash
npm run seed
```

### 3. Start the Server
```bash
npm run start:dev
```
Or production build:
```bash
npm run build
npm run start:prod
```

Server endpoints:
- **Base URL**: `http://localhost:3001`
- **Interactive Swagger Docs**: [`http://localhost:3001/api/docs`](http://localhost:3001/api/docs)

---

## 🧪 Testing Methods

### Method 1: Instant One-Command Live Test
Run a full end-to-end lifecycle script against the running server:
```bash
npm run test:live
```
Executes all 6 core APIs + bonus features in sequence and prints formatted JSON for every step.

---

### Method 2: Automated Jest Test Suites
```bash
# Run unit tests (ChatService & MessageService)
npm test

# Run end-to-end tests (22 test scenarios covering all APIs & edge cases)
npm run test:e2e
```

---

### Method 3: Interactive Swagger UI
Open [`http://localhost:3001/api/docs`](http://localhost:3001/api/docs) in your browser to inspect schemas, submit payloads, and execute requests directly from the UI.

---

### Method 4: Step-by-Step Manual Testing (PowerShell & cURL)

Below are the exact commands to test every single functionality manually:

#### 1. Create or Get 1:1 Chat (`POST /chat/create`)
Idempotent endpoint. Creates a new chat or returns the existing `chatId`.

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/chat/create" -Method POST -Body '{"userAId":"user_alice","userBId":"user_bob"}' -ContentType "application/json"
```
**cURL:**
```bash
curl -X POST http://localhost:3001/chat/create -H "Content-Type: application/json" -d "{\"userAId\":\"user_alice\",\"userBId\":\"user_bob\"}"
```
**Expected Output:**
```json
{
  "chatId": "0b571fa4-4992-402f-b3ee-49a01cab230a",
  "isExisting": true
}
```

---

#### 2. Send Message (`POST /chat/:chatId/message/send`)
Stores message in Firestore with timestamp and automatically marks sender as read.

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/chat/<CHAT_ID>/message/send" -Method POST -Body '{"senderId":"user_alice","text":"Hello Bob!"}' -ContentType "application/json"
```
**cURL:**
```bash
curl -X POST http://localhost:3001/chat/<CHAT_ID>/message/send -H "Content-Type: application/json" -d "{\"senderId\":\"user_alice\",\"text\":\"Hello Bob!\"}"
```
**Expected Output:**
```json
{
  "id": "50f6091e-4b06-4b4a-a0a7-c3d3ec332252",
  "chatId": "<CHAT_ID>",
  "senderId": "user_alice",
  "text": "Hello Bob!",
  "timestamp": "2026-11-17T09:52:43.617Z",
  "readBy": ["user_alice"],
  "readReceipts": { "user_alice": { "readAt": "2026-11-17T09:52:43.617Z" } }
}
```

---

#### 3. Get Messages (`GET /chat/:chatId/messages?limit=50`)
Retrieves messages from Firestore in chronological order (`timestamp` ascending).

**PowerShell:**
```powershell
(Invoke-RestMethod -Uri "http://localhost:3001/chat/<CHAT_ID>/messages?limit=50" -Method GET) | Format-Table id, senderId, text, timestamp
```
**cURL:**
```bash
curl -X GET "http://localhost:3001/chat/<CHAT_ID>/messages?limit=50"
```

---

#### 4. Mark Message Read (`POST /chat/:chatId/message/:messageId/read`)
Records recipient read receipt in Firestore.

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/chat/<CHAT_ID>/message/<MESSAGE_ID>/read" -Method POST -Body '{"userId":"user_bob"}' -ContentType "application/json"
```
**cURL:**
```bash
curl -X POST http://localhost:3001/chat/<CHAT_ID>/message/<MESSAGE_ID>/read -H "Content-Type: application/json" -d "{\"userId\":\"user_bob\"}"
```
**Expected Output:**
```json
{
  "messageId": "<MESSAGE_ID>",
  "userId": "user_bob",
  "readAt": "2026-11-17T10:01:24.185Z"
}
```

---

#### 5. Update Last Seen Message (`POST /chat/:chatId/lastseen`)
Updates last seen message pointer per user in Firestore (`/chats/{chatId}/lastSeen/{userId}`).

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/chat/<CHAT_ID>/lastseen" -Method POST -Body '{"userId":"user_bob","messageId":"<MESSAGE_ID>"}' -ContentType "application/json"
```
**cURL:**
```bash
curl -X POST http://localhost:3001/chat/<CHAT_ID>/lastseen -H "Content-Type: application/json" -d "{\"userId\":\"user_bob\",\"messageId\":\"<MESSAGE_ID>\"}"
```
**Expected Output:**
```json
{
  "chatId": "<CHAT_ID>",
  "userId": "user_bob",
  "messageId": "<MESSAGE_ID>",
  "updatedAt": "2026-11-17T10:04:01.716Z"
}
```

---

#### 6. List User Chats (`GET /user/:userId/chats`)
Queries relational database for all chats (1:1 & Group) the user participates in with member IDs.

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/user/user_alice/chats" -Method GET | ConvertTo-Json -Depth 5
```
**cURL:**
```bash
curl -X GET http://localhost:3001/user/user_alice/chats
```

---

#### 7. Create Group Chat (`POST /chat/group/create`) - Bonus
Creates group chat with creator assigned `admin` role and members assigned `member` role.

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/chat/group/create" -Method POST -Body '{"name":"Product Alpha","creatorId":"user_alice","memberIds":["user_bob","user_charlie"]}' -ContentType "application/json"
```
**cURL:**
```bash
curl -X POST http://localhost:3001/chat/group/create -H "Content-Type: application/json" -d "{\"name\":\"Product Alpha\",\"creatorId\":\"user_alice\",\"memberIds\":[\"user_bob\",\"user_charlie\"]}"
```

---

#### 8. Add Member to Group Chat (`POST /chat/:chatId/members/add`) - Bonus
Allows group admin to add new users to the group.

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/chat/<GROUP_CHAT_ID>/members/add" -Method POST -Body '{"adminId":"user_alice","userIds":["user_diana"]}' -ContentType "application/json"
```
**cURL:**
```bash
curl -X POST http://localhost:3001/chat/<GROUP_CHAT_ID>/members/add -H "Content-Type: application/json" -d "{\"adminId\":\"user_alice\",\"userIds\":[\"user_diana\"]}"
```

---

#### 9. Exit / Leave Group Chat (`POST /chat/:chatId/leave`) - Bonus
Allows any member (admin or non-admin) to leave/exit a group chat.

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/chat/<GROUP_CHAT_ID>/leave" -Method POST -Body '{"userId":"user_bob"}' -ContentType "application/json"
```
**cURL:**
```bash
curl -X POST http://localhost:3001/chat/<GROUP_CHAT_ID>/leave -H "Content-Type: application/json" -d "{\"userId\":\"user_bob\"}"
```
**Expected Output:**
```json
{
  "success": true,
  "leftUserId": "user_bob",
  "chatId": "<GROUP_CHAT_ID>"
}
```

---

#### 10. Delete Group Chat (`DELETE /chat/:chatId`) - Bonus
Allows group admin to delete the group chat and cascade delete all memberships from the relational DB.

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/chat/<GROUP_CHAT_ID>" -Method DELETE -Body '{"adminId":"user_alice"}' -ContentType "application/json"
```
**cURL:**
```bash
curl -X DELETE http://localhost:3001/chat/<GROUP_CHAT_ID> -H "Content-Type: application/json" -d "{\"adminId\":\"user_alice\"}"
```
**Expected Output:**
```json
{
  "success": true,
  "deletedChatId": "<GROUP_CHAT_ID>"
}
```

---

#### 11. Edit Message (`PATCH /chat/:chatId/message/:messageId`) - Bonus
Allows original sender to update message text in Firestore.

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/chat/<CHAT_ID>/message/<MESSAGE_ID>" -Method PATCH -Body '{"senderId":"user_alice","text":"Updated text!"}' -ContentType "application/json"
```
**cURL:**
```bash
curl -X PATCH http://localhost:3001/chat/<CHAT_ID>/message/<MESSAGE_ID> -H "Content-Type: application/json" -d "{\"senderId\":\"user_alice\",\"text\":\"Updated text!\"}"
```

---

#### 12. Delete Message (`DELETE /chat/:chatId/message/:messageId`) - Bonus
Soft-deletes message content in Firestore (`isDeleted: true`, text replaced with `[This message was deleted]`).

**PowerShell:**
```powershell
Invoke-RestMethod -Uri "http://localhost:3001/chat/<CHAT_ID>/message/<MESSAGE_ID>" -Method DELETE -Body '{"senderId":"user_alice"}' -ContentType "application/json"
```
**cURL:**
```bash
curl -X DELETE http://localhost:3001/chat/<CHAT_ID>/message/<MESSAGE_ID> -H "Content-Type: application/json" -d "{\"senderId\":\"user_alice\"}"
```

---

## 📋 API Summary Matrix

| API | Method | Endpoint | Primary Store |
|---|---|---|---|
| **1. Create/Get Chat** | `POST` | `/chat/create` | Relational DB |
| **2. Send Message** | `POST` | `/chat/:chatId/message/send` | Firebase Firestore |
| **3. Get Messages** | `GET` | `/chat/:chatId/messages?limit=50` | Firebase Firestore |
| **4. Mark Read** | `POST` | `/chat/:chatId/message/:messageId/read` | Firebase Firestore |
| **5. Update Last Seen** | `POST` | `/chat/:chatId/lastseen` | Firebase Firestore |
| **6. List User Chats** | `GET` | `/user/:userId/chats` | Relational DB |
| **Create Group** | `POST` | `/chat/group/create` | Relational DB |
| **Add Members** | `POST` | `/chat/:chatId/members/add` | Relational DB |
| **Leave Group** | `POST` | `/chat/:chatId/leave` | Relational DB |
| **Delete Group** | `DELETE`| `/chat/:chatId` | Relational DB |
| **Edit Message** | `PATCH`| `/chat/:chatId/message/:messageId` | Firebase Firestore |
| **Delete Message** | `DELETE`| `/chat/:chatId/message/:messageId` | Firebase Firestore |
| **Swagger Docs** | `GET` | `/api/docs` | OpenAPI UI |

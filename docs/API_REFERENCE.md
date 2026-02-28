# DevNet StudyLab -- API Reference

> **Last updated:** 2026-02-27
> **Version:** 1.0.0

---

## Table of Contents

1. [Next.js API Routes (Web Backend)](#nextjs-api-routes-web-backend)
2. [Lab Engine API (FastAPI :8100)](#lab-engine-api-fastapi-8100)
3. [Mock Meraki Dashboard API (:8201)](#mock-meraki-dashboard-api-8201)
4. [Mock Catalyst Center API (:8202)](#mock-catalyst-center-api-8202)
5. [Mock Webex API (:8203)](#mock-webex-api-8203)

---

## Next.js API Routes (Web Backend)

Base URL: `http://localhost:3000`

---

### POST /api/chat

AI Tutor chat endpoint. Streams Claude responses back to the client using chunked transfer encoding.

**Authentication:** None (server-side API key from environment)

**Request Body:**

```json
{
  "messages": [
    { "role": "user", "content": "Explain REST API authentication methods" },
    { "role": "assistant", "content": "There are several common..." },
    { "role": "user", "content": "Can you give me a Python example?" }
  ],
  "domain": "apis"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `messages` | `Array<{role, content}>` | Yes | Conversation history. Each message must have `role` ("user" or "assistant") and `content` (string). |
| `domain` | `string \| null` | No | Domain slug to activate domain-specific system prompt. One of: `software-dev`, `apis`, `cisco-platforms`, `deployment-security`, `infrastructure-automation`, `network-fundamentals`. |

**Response:** Streaming `text/plain; charset=utf-8`

The response is a raw text stream (not SSE, not JSON). Each chunk contains a fragment of the assistant's response text. The client accumulates chunks to build the full message.

**Response Headers:**
```
Content-Type: text/plain; charset=utf-8
Cache-Control: no-cache
Transfer-Encoding: chunked
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{"error": "Messages array is required and must not be empty."}` | Missing or empty messages array |
| 400 | `{"error": "Each message must have a role and content."}` | Malformed message object |
| 400 | `{"error": "Message role must be 'user' or 'assistant'."}` | Invalid role value |
| 401 | `{"error": "TUTOR_ANTHROPIC_KEY is not configured on the server."}` | Missing API key in environment |
| 429 | `{"error": "..."}` | Anthropic rate limit exceeded |
| 500 | `{"error": "Internal server error"}` | Unhandled exception |

---

### GET /api/flashcards

List all flashcards, optionally filtered by domain.

**Authentication:** None

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | `string` | No | Domain slug to filter (e.g., `apis`, `software-dev`) |

**Response:** `200 OK`

```json
{
  "flashcards": [
    {
      "id": "fc-001",
      "question": "What does REST stand for?",
      "answer": "Representational State Transfer",
      "explanation": "REST is an architectural style...",
      "domain": "Understanding & Using APIs",
      "domainSlug": "apis",
      "objectiveCode": "2.1",
      "difficulty": "easy",
      "tags": ["rest", "api"]
    }
  ]
}
```

---

### GET /api/flashcards/progress

Retrieve the authenticated user's flashcard SM-2 progress from the database.

**Authentication:** Session (returns empty object when unauthenticated)

**Response:** `200 OK`

```json
{
  "progress": {
    "fc-001": {
      "ease": 2.6,
      "interval": 4,
      "repetitions": 3,
      "nextReview": "2026-03-01",
      "lastReview": "2026-02-25"
    }
  }
}
```

---

### POST /api/flashcards/progress

Save flashcard review result. Persists to both localStorage (client-side) and the database (server-side, fire-and-forget).

**Authentication:** Optional (persists to DB only when authenticated)

**Request Body:**

```json
{
  "flashcardId": "fc-001",
  "quality": 3,
  "currentProgress": {
    "ease": 2.5,
    "interval": 1,
    "repetitions": 1
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `flashcardId` | `string` | Yes | Flashcard identifier |
| `quality` | `number` | Yes | SM-2 rating (1=Again, 2=Hard, 3=Good, 4=Easy) |
| `currentProgress` | `object \| null` | Yes | Current SM-2 state or null for new cards |

**Response:** `200 OK`

```json
{ "ok": true }
```

---

### GET /api/exams

List available practice exams, optionally filtered by domain.

**Authentication:** None

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | `string` | No | Domain slug to filter questions |

**Response:** `200 OK`

```json
{
  "exams": [
    {
      "id": "practice-1",
      "title": "DevNet Associate Practice Exam 1",
      "questionCount": 63,
      "timeLimit": 120,
      "passingScore": 70
    }
  ]
}
```

---

### GET /api/exams/{examId}

Get a specific exam with questions (answers stripped for the client).

**Authentication:** None

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `examId` | `string` | Exam identifier (e.g., `practice-1`) |

**Response:** `200 OK`

Returns the exam object with questions. Correct answers are stripped to prevent cheating.

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 404 | `{"error": "Exam \"...\" not found"}` | Invalid exam ID |

---

### POST /api/exams/{examId}/grade

Grade a submitted exam and optionally persist the attempt.

**Authentication:** Optional (persists to DB when authenticated)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `examId` | `string` | Exam identifier |

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | `string` | No | Domain filter applied during the exam |

**Request Body:**

```json
{
  "answers": {
    "q-001": "B",
    "q-002": ["A", "C"]
  },
  "timeTaken": 3600
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `answers` | `Record<string, string \| string[]>` | Yes | Map of question ID to selected answer(s) |
| `timeTaken` | `number` | Yes | Time in seconds |

**Response:** `200 OK`

```json
{
  "score": 78,
  "totalQuestions": 63,
  "correctCount": 49,
  "passed": true,
  "timeTaken": 3600,
  "questions": [...],
  "domainScores": {...}
}
```

---

### GET /api/exams/attempts

Retrieve past exam attempts for the authenticated user.

**Authentication:** Session (returns empty array when unauthenticated)

**Response:** `200 OK`

```json
{
  "attempts": [
    {
      "id": "att-001",
      "score": 78,
      "totalQuestions": 63,
      "domainFilter": null,
      "timeTakenSeconds": 3600,
      "createdAt": "2026-02-27T10:00:00Z"
    }
  ]
}
```

---

### GET /api/labs

List all available labs, optionally filtered by type or domain.

**Authentication:** None

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `type` | `string` | No | Lab category (e.g., `python`, `api`) |
| `domain` | `string` | No | Domain slug |

**Response:** `200 OK`

Returns an array of lab metadata.

---

### GET /api/labs/{slug}

Get a specific lab by slug (solution code stripped).

**Authentication:** None

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Lab slug (e.g., `python-data-parsing`) |

**Response:** `200 OK`

---

### POST /api/labs/{slug}/run

Execute submitted code for a lab and grade the result.

**Authentication:** Optional (persists attempt to DB when authenticated)

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Lab slug |

**Request Body:**

```json
{
  "code": "import json\n...",
  "language": "python"
}
```

**Response:** `200 OK`

```json
{
  "passed": true,
  "output": "...",
  "errors": "",
  "score": 1.0,
  "feedback": "All tests passed!"
}
```

---

### GET /api/labs/attempts

Retrieve lab completion statuses for the authenticated user.

**Authentication:** Session (returns empty object when unauthenticated)

**Response:** `200 OK`

```json
{
  "attempts": {
    "python-data-parsing": {
      "labSlug": "python-data-parsing",
      "status": "completed",
      "lastAttemptAt": "2026-02-27T10:00:00Z"
    }
  }
}
```

---

### GET /api/study/{slug}

Get a study guide by domain slug.

**Authentication:** None

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `slug` | `string` | Domain slug (e.g., `software-dev`) |

**Response:** `200 OK`

Returns the study guide content.

---

### GET /api/study/progress

Retrieve completed study objectives for the authenticated user.

**Authentication:** Session (returns empty array when unauthenticated)

**Response:** `200 OK`

```json
{
  "completedObjectives": ["1.1", "1.2", "2.1"]
}
```

---

### POST /api/study/progress

Toggle a study objective's completion status.

**Authentication:** Optional (persists to DB when authenticated)

**Request Body:**

```json
{
  "objectiveCode": "1.1",
  "completed": true
}
```

**Response:** `200 OK`

```json
{ "ok": true }
```

---

### GET /api/dashboard/stats

Aggregated dashboard statistics for the authenticated user.

**Authentication:** Session (returns null when unauthenticated)

**Response:** `200 OK`

```json
{
  "stats": {
    "overallProgress": 48,
    "bestExamScore": 85,
    "domains": [...],
    "recentActivity": [...]
  }
}
```

---

### POST /api/auth/[...nextauth]

Auth.js authentication handler. Supports credentials-based login.

**Authentication:** None

See [Auth.js documentation](https://authjs.dev/) for the full NextAuth REST API.

---

## Lab Engine API (FastAPI :8100)

Base URL: `http://localhost:8100`

OpenAPI docs available at `http://localhost:8100/docs`

---

### GET /health

Service health check.

**Authentication:** None

**Response:** `200 OK`

```json
{
  "status": "healthy",
  "service": "lab-engine",
  "version": "1.0.0",
  "mock_apis": ["meraki", "catalyst-center", "webex"]
}
```

---

### GET /api/v1/exercises

List all available exercises.

**Authentication:** None

**Response:** `200 OK`

```json
{
  "exercises": [
    {
      "id": "ex-001",
      "title": "List Meraki Organizations",
      "description": "Use the Meraki Dashboard API to retrieve all organizations.",
      "difficulty": "beginner",
      "api": "meraki",
      "hints": [
        "Use GET /api/v1/organizations",
        "Include the X-Cisco-Meraki-API-Key header"
      ],
      "expected_output_contains": "DevNet Sandbox"
    }
  ]
}
```

---

### GET /api/v1/exercises/{exercise_id}

Get details of a specific exercise.

**Authentication:** None

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `exercise_id` | `string` | Exercise identifier (e.g., `ex-001`) |

**Response:** `200 OK`

```json
{
  "id": "ex-001",
  "title": "List Meraki Organizations",
  "description": "Use the Meraki Dashboard API to retrieve all organizations.",
  "difficulty": "beginner",
  "api": "meraki",
  "hints": [
    "Use GET /api/v1/organizations",
    "Include the X-Cisco-Meraki-API-Key header"
  ],
  "expected_output_contains": "DevNet Sandbox"
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 404 | `{"detail": "Exercise not found"}` | Invalid exercise ID |

---

### POST /api/v1/grade

Grade a submitted code solution against an exercise's expected output.

**Authentication:** None

**Request Body:**

```json
{
  "exercise_id": "ex-001",
  "code": "import requests\nresponse = requests.get('http://localhost:8201/api/v1/organizations', headers={'X-Cisco-Meraki-API-Key': 'devnet-studylab-meraki-key'})\nprint(response.json())",
  "language": "python"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `exercise_id` | `string` | Yes | -- | Exercise to grade against |
| `code` | `string` | Yes | -- | Student's source code |
| `language` | `string` | No | `"python"` | Programming language |

**Response:** `200 OK`

```json
{
  "passed": true,
  "output": "[{'id': '549236', 'name': 'DevNet Sandbox', ...}]",
  "errors": "",
  "score": 1.0,
  "exercise_id": "ex-001",
  "feedback": "Great work! Your solution produces the expected output."
}
```

| Field | Type | Description |
|-------|------|-------------|
| `passed` | `boolean` | Whether the submission passed |
| `output` | `string` | Captured stdout from execution |
| `errors` | `string` | Captured stderr or error messages |
| `score` | `float` | 0.0 (fail), 0.25 (partial), 1.0 (pass) |
| `exercise_id` | `string` | Echo of the submitted exercise ID |
| `feedback` | `string \| null` | Human-readable feedback message |

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 404 | `{"detail": "Exercise not found"}` | Invalid exercise ID |

---

### POST /api/v1/sandbox/run

Execute arbitrary code in a sandboxed subprocess. For open-ended practice without exercise-specific validation.

**Authentication:** None

**Request Body:**

```json
{
  "code": "print('Hello, DevNet!')",
  "language": "python",
  "timeout": 10
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `code` | `string` | Yes | -- | Source code to execute |
| `language` | `string` | No | `"python"` | Programming language |
| `timeout` | `integer` | No | `10` | Max execution time in seconds |

**Response:** `200 OK`

```json
{
  "output": "Hello, DevNet!",
  "errors": "",
  "exit_code": 0
}
```

| Field | Type | Description |
|-------|------|-------------|
| `output` | `string` | Captured stdout |
| `errors` | `string` | Captured stderr |
| `exit_code` | `integer` | 0 for success, 1 for errors |

---

## Mock Meraki Dashboard API (:8201)

Base URL: `http://localhost:8201`

This mock API simulates the Cisco Meraki Dashboard API v1. It serves pre-populated data for two organizations with multiple networks, devices, clients, and switch ports.

### Authentication

All endpoints require the `X-Cisco-Meraki-API-Key` header.

**Valid API keys for development:**
- `6bec40cf957de430a6f1f2baa056b99a4fac9ea0`
- `devnet-studylab-meraki-key`

**Auth error response:** `401 Unauthorized`
```json
{
  "errors": ["Missing API key. Please include X-Cisco-Meraki-API-Key header."]
}
```

---

### GET /api/v1/organizations

List all organizations accessible by the API key.

**Headers:** `X-Cisco-Meraki-API-Key: <key>`

**Response:** `200 OK`

```json
[
  {
    "id": "549236",
    "name": "DevNet Sandbox",
    "url": "https://n18.meraki.com/o/549236/manage/organization/overview",
    "api": { "enabled": true },
    "licensing": { "model": "co-term" },
    "cloud": { "region": { "name": "North America" } }
  },
  {
    "id": "682154",
    "name": "StudyLab Corp",
    "url": "https://n18.meraki.com/o/682154/manage/organization/overview",
    "api": { "enabled": true },
    "licensing": { "model": "per-device" },
    "cloud": { "region": { "name": "North America" } }
  }
]
```

---

### GET /api/v1/organizations/{orgId}/networks

List all networks in an organization.

**Headers:** `X-Cisco-Meraki-API-Key: <key>`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `orgId` | `string` | Organization ID (e.g., `549236`) |

**Response:** `200 OK`

```json
[
  {
    "id": "L_636248610738797898",
    "organizationId": "549236",
    "name": "DevNet Sandbox ALWAYS ON",
    "productTypes": ["appliance", "switch", "wireless"],
    "timeZone": "America/Los_Angeles",
    "tags": ["sandbox", "always-on"],
    "enrollmentString": null,
    "notes": "Always-on sandbox for DevNet learning",
    "isBoundToConfigTemplate": false
  }
]
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 404 | `{"errors": ["Organization not found"]}` | Invalid org ID |

---

### GET /api/v1/networks/{networkId}/devices

List all devices in a network.

**Headers:** `X-Cisco-Meraki-API-Key: <key>`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `networkId` | `string` | Network ID (e.g., `L_636248610738797898`) |

**Response:** `200 OK`

```json
[
  {
    "serial": "Q2QN-9J8L-SLPD",
    "name": "MX67-Sandbox-Appliance",
    "mac": "e0:55:3d:17:c4:22",
    "model": "MX67",
    "networkId": "L_636248610738797898",
    "firmware": "MX 18.107.2",
    "lanIp": "10.10.10.1",
    "tags": ["appliance", "sandbox"],
    "address": "500 Terry A Francine Blvd, San Francisco, CA 94158",
    "lat": 37.7697,
    "lng": -122.3933
  }
]
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 404 | `{"errors": ["Network not found"]}` | Invalid network ID |

---

### GET /api/v1/networks/{networkId}/clients

List clients in a network.

**Headers:** `X-Cisco-Meraki-API-Key: <key>`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `networkId` | `string` | Network ID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `timespan` | `integer` | `86400` | Timespan in seconds to look back |
| `perPage` | `integer` | `10` | Number of clients per page |

**Response:** `200 OK`

```json
[
  {
    "id": "k74272e",
    "mac": "22:33:44:55:66:01",
    "description": "Elliot-MacBook",
    "ip": "10.10.10.100",
    "vlan": 1,
    "switchport": "3",
    "status": "Online",
    "firstSeen": "2025-01-15T08:30:00Z",
    "lastSeen": "2026-02-27T14:22:00Z",
    "manufacturer": "Apple",
    "os": "macOS",
    "user": "elliot",
    "ssid": null
  }
]
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 404 | `{"errors": ["Network not found"]}` | Invalid network ID |

---

### GET /api/v1/devices/{serial}/switchPorts

List switch ports for a switch device.

**Headers:** `X-Cisco-Meraki-API-Key: <key>`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `serial` | `string` | Device serial number (must be a switch model) |

**Response:** `200 OK`

```json
[
  {
    "portId": "1",
    "name": "Uplink to MX67",
    "tags": ["uplink"],
    "enabled": true,
    "poeEnabled": false,
    "type": "trunk",
    "vlan": 1,
    "allowedVlans": "all",
    "isolationEnabled": false,
    "rstpEnabled": true,
    "stpGuard": "disabled",
    "linkNegotiation": "Auto negotiate",
    "portScheduleId": null,
    "udld": "Alert only",
    "accessPolicyType": "Open"
  }
]
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{"errors": ["This endpoint is only available for switch devices"]}` | Non-switch device serial |
| 404 | `{"errors": ["Device not found"]}` | Invalid serial number |

---

### PUT /api/v1/devices/{serial}

Update a device's properties (name, tags, address, notes).

**Headers:** `X-Cisco-Meraki-API-Key: <key>`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `serial` | `string` | Device serial number |

**Request Body:**

```json
{
  "name": "MX67-Renamed",
  "tags": ["appliance", "updated"],
  "address": "123 New Address, City, ST 12345",
  "notes": "Updated via API"
}
```

All fields are optional. Only provided fields are updated.

**Response:** `200 OK` -- Returns the updated device object.

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 404 | `{"errors": ["Device not found"]}` | Invalid serial number |

---

## Mock Catalyst Center API (:8202)

Base URL: `http://localhost:8202`

This mock API simulates the Cisco Catalyst Center (formerly DNA Center) Intent API. It provides pre-populated data for five network devices, a site hierarchy, and host endpoints.

### Authentication

Two-step authentication process matching the real Catalyst Center:

1. **Obtain a token** via `POST /dna/system/api/v1/auth/token` with HTTP Basic auth
2. **Use the token** in the `X-Auth-Token` header for all subsequent requests

**Valid credentials:**
- `admin` / `admin`
- `devnetuser` / `Cisco123!`

**Pre-authorized tokens:**
- `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.studylab-mock-catalyst-token`
- `devnet-studylab-catalyst-token`

**Auth error response:** `401 Unauthorized`
```json
{
  "response": {
    "errorCode": "UNAUTHORIZED",
    "message": "Missing X-Auth-Token header"
  }
}
```

---

### POST /dna/system/api/v1/auth/token

Authenticate and receive an access token.

**Headers:** `Authorization: Basic <base64(username:password)>`

**Response:** `200 OK`

```json
{
  "Token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.studylab-mock-catalyst-token"
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `{"response": {"errorCode": "UNAUTHORIZED", "message": "Authorization header with Basic credentials required"}}` | Missing Basic auth header |
| 401 | `{"response": {"errorCode": "UNAUTHORIZED", "message": "Invalid Basic auth encoding"}}` | Malformed base64 |
| 401 | `{"response": {"errorCode": "UNAUTHORIZED", "message": "Invalid username or password"}}` | Wrong credentials |

---

### GET /dna/intent/api/v1/network-device

List all network devices.

**Headers:** `X-Auth-Token: <token>`

**Response:** `200 OK`

```json
{
  "response": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "hostname": "cat9300-floor1.studylab.local",
      "managementIpAddress": "10.10.20.51",
      "platformId": "C9300-24T",
      "softwareVersion": "17.9.4a",
      "softwareType": "IOS-XE",
      "role": "ACCESS",
      "upTime": "72 days, 14:22:33",
      "serialNumber": "FCW2214L0VK",
      "macAddress": "00:1e:bd:c4:22:01",
      "reachabilityStatus": "Reachable",
      "collectionStatus": "Managed",
      "family": "Switches and Hubs",
      "type": "Cisco Catalyst 9300 Switch"
    }
  ],
  "version": "1.0"
}
```

---

### GET /dna/intent/api/v1/network-device/{id}

Get a specific network device by ID.

**Headers:** `X-Auth-Token: <token>`

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | `string` | Device UUID |

**Response:** `200 OK`

```json
{
  "response": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "hostname": "cat9300-floor1.studylab.local",
    "managementIpAddress": "10.10.20.51",
    "platformId": "C9300-24T",
    "softwareVersion": "17.9.4a",
    "role": "ACCESS"
  },
  "version": "1.0"
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 404 | `{"response": {"errorCode": "RESOURCE_NOT_FOUND", "message": "Device with id ... not found"}}` | Invalid device ID |

---

### GET /dna/intent/api/v1/network-health

Get overall network health summary.

**Headers:** `X-Auth-Token: <token>`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `timestamp` | `string` | No | ISO timestamp for historical data |

**Response:** `200 OK`

```json
{
  "response": [
    {
      "healthScore": 92,
      "totalCount": 5,
      "goodCount": 4,
      "fairCount": 1,
      "badCount": 0,
      "unmonCount": 0,
      "time": "2026-02-27T10:00:00+00:00",
      "category": "ACCESS"
    }
  ],
  "healthDistributeDetails": {
    "totalCount": 5,
    "goodPercentage": 80,
    "badPercentage": 0,
    "fairPercentage": 20,
    "unmonPercentage": 0
  },
  "version": "1.0"
}
```

---

### GET /dna/intent/api/v1/site

List the site hierarchy (areas, buildings, floors).

**Headers:** `X-Auth-Token: <token>`

**Response:** `200 OK`

```json
{
  "response": [
    {
      "id": "d7a8b9c0-1234-5678-9abc-d7a8b9c0e1f2",
      "name": "Global",
      "parentId": null,
      "additionalInfo": [
        { "nameSpace": "Location", "attributes": { "type": "area" } }
      ]
    },
    {
      "id": "f9c0d1e2-3456-789a-bcde-f9c0d1e2a3b4",
      "name": "Building A",
      "parentId": "e8b9c0d1-2345-6789-abcd-e8b9c0d1f2a3",
      "additionalInfo": [
        {
          "nameSpace": "Location",
          "attributes": {
            "type": "building",
            "address": "500 Terry A Francine Blvd, San Francisco, CA",
            "latitude": "37.7697",
            "longitude": "-122.3933"
          }
        }
      ]
    }
  ]
}
```

---

### GET /dna/intent/api/v1/host

List host endpoints connected to the network.

**Headers:** `X-Auth-Token: <token>`

**Response:** `200 OK`

```json
{
  "response": [
    {
      "id": "aabbccdd-1111-2222-3333-aabbccddee01",
      "hostType": "WIRED",
      "hostIp": "10.10.20.100",
      "hostMac": "aa:bb:cc:dd:ee:01",
      "hostName": "DESKTOP-LAB01",
      "connectedNetworkDeviceId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "connectedNetworkDeviceIpAddress": "10.10.20.51",
      "connectedInterfaceName": "GigabitEthernet1/0/5",
      "vlanId": "10",
      "lastUpdated": "2026-02-26 10:05:00",
      "healthScore": [{ "healthType": "OVERALL", "reason": "", "score": 10 }]
    }
  ]
}
```

---

## Mock Webex API (:8203)

Base URL: `http://localhost:8203`

This mock API simulates the Webex Teams / Messaging REST API. It provides pre-populated rooms, messages, memberships, and a current user profile.

### Authentication

All endpoints require the `Authorization` header with a Bearer token.

**Header:** `Authorization: Bearer <token>`

**Valid tokens for development:**
- `NWIzYWJkMzAtODQ2YS00YmE5LTk5MDktZDc5ZTM1Y2IwOTgw`
- `devnet-studylab-webex-token`

**Auth error response:** `401 Unauthorized`
```json
{
  "message": "The request requires a valid access token set in the Authorization header.",
  "errors": [
    {
      "description": "The request requires a valid access token set in the Authorization header."
    }
  ],
  "trackingId": "STUDYLAB_MOCK_abc123def456"
}
```

---

### GET /v1/people/me

Get the current authenticated user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

```json
{
  "id": "Y2lzY29zcGFyazovL3VzL1BFT1BMRS8xMjM0NTY3ODkw",
  "emails": ["devnet_student@studylab.local"],
  "phoneNumbers": [{ "type": "work", "value": "+1 555-0199" }],
  "displayName": "DevNet Student",
  "nickName": "DevNet",
  "firstName": "DevNet",
  "lastName": "Student",
  "avatar": "https://avatar.example.com/devnet_student.png",
  "orgId": "Y2lzY29zcGFyazovL3VzL09SR0FOSVpBVElPTi9hYmNk",
  "created": "2025-01-15T08:00:00.000Z",
  "lastModified": "2026-02-20T12:00:00.000Z",
  "lastActivity": "2026-02-27T09:30:00.000Z",
  "status": "active",
  "type": "person"
}
```

---

### GET /v1/rooms

List rooms (spaces) the user belongs to.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `max` | `integer` | `100` | Maximum number of rooms to return |
| `type` | `string` | -- | Filter by room type (`group` or `direct`) |
| `sortBy` | `string` | -- | Sort order |

**Response:** `200 OK`

```json
{
  "items": [
    {
      "id": "Y2lzY29zcGFyazovL3VzL1JPT00vYWJjZGVmMDEyMzQ1",
      "title": "DevNet Study Group",
      "type": "group",
      "isLocked": false,
      "lastActivity": "2026-02-27T08:30:00.000Z",
      "creatorId": "Y2lzY29zcGFyazovL3VzL1BFT1BMRS8xMjM0NTY3ODkw",
      "created": "2025-06-01T10:00:00.000Z",
      "isPublic": false,
      "isAnnouncementOnly": false
    }
  ]
}
```

---

### POST /v1/rooms

Create a new room.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "title": "Python Study Group",
  "type": "group"
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | `string` | Yes | -- | Room title |
| `type` | `string` | No | `"group"` | Room type |

**Response:** `201 Created`

```json
{
  "id": "Y2lzY29zcGFyazovL3VzL1JPT00vYWJjMTIzNDU2Nzg5",
  "title": "Python Study Group",
  "type": "group",
  "isLocked": false,
  "lastActivity": "2026-02-27T10:00:00.000Z",
  "creatorId": "Y2lzY29zcGFyazovL3VzL1BFT1BMRS8xMjM0NTY3ODkw",
  "created": "2026-02-27T10:00:00.000Z",
  "isPublic": false,
  "isAnnouncementOnly": false
}
```

---

### GET /v1/messages

List messages in a room.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `roomId` | `string` | Yes | -- | Room ID to list messages from |
| `max` | `integer` | No | `50` | Maximum messages to return |

**Response:** `200 OK`

```json
{
  "items": [
    {
      "id": "Y2lzY29zcGFyazovL3VzL01FU1NBR0UvbXNnMDAxMDAx",
      "roomId": "Y2lzY29zcGFyazovL3VzL1JPT00vYWJjZGVmMDEyMzQ1",
      "roomType": "group",
      "text": "Welcome to the DevNet Study Group!",
      "personId": "Y2lzY29zcGFyazovL3VzL1BFT1BMRS8xMjM0NTY3ODkw",
      "personEmail": "devnet_student@studylab.local",
      "created": "2025-06-01T10:05:00.000Z"
    }
  ]
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 404 | `{"message": "Room not found", "errors": [...]}` | Invalid room ID |

---

### POST /v1/messages

Send a message to a room.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "roomId": "Y2lzY29zcGFyazovL3VzL1JPT00vYWJjZGVmMDEyMzQ1",
  "text": "Hello from the DevNet StudyLab!",
  "markdown": "**Hello** from the DevNet StudyLab!"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `roomId` | `string` | Yes | Target room ID |
| `text` | `string` | Conditional | Plain text message (required if no markdown) |
| `markdown` | `string` | Conditional | Markdown-formatted message (required if no text) |

**Response:** `201 Created`

```json
{
  "id": "Y2lzY29zcGFyazovL3VzL01FU1NBR0Uv...",
  "roomId": "Y2lzY29zcGFyazovL3VzL1JPT00vYWJjZGVmMDEyMzQ1",
  "roomType": "group",
  "text": "Hello from the DevNet StudyLab!",
  "personId": "Y2lzY29zcGFyazovL3VzL1BFT1BMRS8xMjM0NTY3ODkw",
  "personEmail": "devnet_student@studylab.local",
  "created": "2026-02-27T10:05:00.000Z"
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{"message": "text or markdown is required", ...}` | Neither text nor markdown provided |
| 404 | `{"message": "Room not found", ...}` | Invalid room ID |

---

### GET /v1/memberships

List memberships (room members).

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `roomId` | `string` | No | -- | Filter by room ID. If omitted, returns all memberships. |
| `max` | `integer` | No | `100` | Maximum memberships to return |

**Response:** `200 OK`

```json
{
  "items": [
    {
      "id": "Y2lzY29zcGFyazovL3VzL01FTUJFUlNISVAvbWVtMDAxMDAx",
      "roomId": "Y2lzY29zcGFyazovL3VzL1JPT00vYWJjZGVmMDEyMzQ1",
      "personId": "Y2lzY29zcGFyazovL3VzL1BFT1BMRS8xMjM0NTY3ODkw",
      "personEmail": "devnet_student@studylab.local",
      "personDisplayName": "DevNet Student",
      "isModerator": true,
      "isMonitor": false,
      "created": "2025-06-01T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 404 | `{"message": "Room not found", ...}` | Invalid room ID (when roomId is provided) |

---

### POST /v1/memberships

Add a member to a room.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**

```json
{
  "roomId": "Y2lzY29zcGFyazovL3VzL1JPT00vYWJjZGVmMDEyMzQ1",
  "personEmail": "new_member@studylab.local",
  "isModerator": false
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `roomId` | `string` | Yes | -- | Target room ID |
| `personId` | `string` | Conditional | -- | Person ID (required if no personEmail) |
| `personEmail` | `string` | Conditional | -- | Person email (required if no personId) |
| `isModerator` | `boolean` | No | `false` | Whether the member is a moderator |

**Response:** `201 Created`

```json
{
  "id": "Y2lzY29zcGFyazovL3VzL01FTUJFUlNISVAv...",
  "roomId": "Y2lzY29zcGFyazovL3VzL1JPT00vYWJjZGVmMDEyMzQ1",
  "personId": "Y2lzY29zcGFyazovL3VzL1BFT1BMRS8...",
  "personEmail": "new_member@studylab.local",
  "personDisplayName": "New Member",
  "isModerator": false,
  "isMonitor": false,
  "created": "2026-02-27T10:05:00.000Z"
}
```

**Error Responses:**

| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{"message": "personId or personEmail is required", ...}` | Neither personId nor personEmail provided |
| 404 | `{"message": "Room not found", ...}` | Invalid room ID |

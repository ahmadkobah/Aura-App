# Aura App

Aura App is a document intelligence platform. It turns scanned documents, PDFs and images
into searchable, structured data by combining optical character recognition (OCR), handwriting
recognition (ICR) and natural language processing (NLP) behind a single web application.

---

## Table of Contents

1. [Overview](#overview)
2. [Project Status](#project-status)
3. [How It Works](#how-it-works)
4. [Components](#components)
5. [Technology Stack](#technology-stack)
6. [Project Structure](#project-structure)
7. [Getting Started](#getting-started)
8. [Configuration](#configuration)
9. [API Reference](#api-reference)
10. [Data Model](#data-model)
11. [Security](#security)
12. [Logging and Monitoring](#logging-and-monitoring)
13. [Known Issues](#known-issues)
14. [Roadmap](#roadmap)
15. [Contributing](#contributing)
16. [License](#license)

---

## Overview

### Purpose

Organisations still receive a large share of their information as paper, scans and PDF files:
invoices, contracts, forms and letters. Reading these documents by hand and typing their
content into other systems is slow, expensive and error-prone.

Aura App automates this work. A user uploads a document, the platform extracts its text,
recognises its structure, and stores the result so that it can be searched, reviewed and
reused.

### Intended users

- **Business users** who need to digitise and search incoming documents.
- **Administrators** who manage users, document templates and processing jobs.
- **Developers** who want to integrate document processing into other systems through a REST API.

### Core capabilities (target design)

- Upload of PDF, PNG, JPG, JPEG, TIFF, DOC and DOCX files (up to 50 MB by default)
- Text extraction from printed documents (OCR) with a confidence score per page
- Recognition of handwritten text (ICR)
- Language detection, keyword and entity extraction (NLP)
- Template-based field extraction, for example invoice number, date and total from an invoice
- Full-text search across processed documents
- Role-based access for users and administrators
- Background processing through a job queue, so large documents do not block the user

---

## Project Status

Aura App is in an **early development stage (version 1.2)**. The foundation and the OCR engine
are in place. Most business features are designed but not yet implemented.

| Component | Status | Notes |
|-----------|--------|-------|
| OCR engine | Working | Standalone FastAPI service with Tesseract and EasyOCR |
| Backend server foundation | Working | Security middleware, configuration, MongoDB connection, logging, error handling |
| Health and readiness checks | Working | `/health`, `/health/live`, `/health/ready` |
| Database initialisation | Working | Collections, indexes and default templates created by `mongo-init.js` |
| Feature API routes | Placeholder | Auth, documents, jobs, users, search and admin return "Coming soon" |
| Web frontend | Planned | Build configuration exists; application source code is not yet written |
| ICR engine | Planned | Referenced in configuration only |
| NLP engine | Planned | Referenced in configuration only |
| Document intelligence orchestrator | Planned | Referenced in configuration only |
| Automated tests | Planned | Test tooling is configured; no tests exist yet |

---

## How It Works

### Architecture

Aura App follows a service-oriented design. A Node.js backend is the single entry point for
clients. Specialised Python services do the heavy processing work, and an orchestrator
coordinates them.

```
                         +----------------------+
                         |   Web Frontend       |
                         |   React + Vite       |
                         |   port 5173          |
                         +----------+-----------+
                                    |
                                    | HTTPS / REST (JSON)
                                    v
                         +----------------------+        +------------------+
                         |   Backend API        |------->|  MongoDB         |
                         |   Node.js + Express  |        |  port 27017      |
                         |   port 3000          |        +------------------+
                         +----------+-----------+
                                    |                    +------------------+
                                    +------------------->|  Redis           |
                                    |  job queue (Bull)  |  port 6379       |
                                    v                    +------------------+
                         +----------------------+
                         | Document Intelligence|
                         | Orchestrator         |
                         | port 8000            |
                         +---+-------+-------+--+
                             |       |       |
                 +-----------+       |       +-----------+
                 v                   v                   v
        +----------------+  +----------------+  +----------------+
        |  OCR engine    |  |  ICR engine    |  |  NLP engine    |
        |  port 8001     |  |  port 8002     |  |  port 8003     |
        +----------------+  +----------------+  +----------------+
```

### Document processing flow

1. **Upload.** The user uploads a file through the frontend. The backend validates the file
   type and size, stores the file and creates a `documents` record with status `pending`.
2. **Queue.** The backend creates a `jobs` record and places a processing job on the Redis
   queue. The user gets an immediate response and does not wait for processing to finish.
3. **Orchestration.** The orchestrator picks up the job and decides which engines to call.
4. **Extraction.** The OCR engine reads printed text, the ICR engine reads handwriting, and the
   NLP engine detects language, keywords and entities.
5. **Field mapping.** If a template matches, for example "Invoice", the extracted text is
   mapped to structured fields such as invoice number, date and total.
6. **Storage.** Results are written back to the `documents` record and the status changes to
   `completed`.
7. **Search and review.** The user can now search, view and export the processed document.

Steps 1 to 3 and 5 to 7 are part of the target design. Step 4 is currently available for OCR
through the standalone OCR engine.

---

## Components

### Backend API (`backend/`)

A TypeScript application on Express. It is the only service that clients talk to directly.

What is implemented:

- **Server bootstrap** (`src/server.ts`): middleware setup, route registration, graceful
  shutdown on `SIGINT` and `SIGTERM`.
- **Configuration** (`src/config/environment.ts`): loads environment variables, applies
  defaults, and stops the server on start-up if required values are missing or invalid.
- **Database** (`src/config/database.ts`): a single shared MongoDB connection with connection
  pooling, reconnect events and a ping-based health check.
- **Security middleware**: Helmet security headers with a content security policy, CORS limited
  to the configured frontend origin, and rate limiting on all `/api` routes.
- **Error handling** (`src/middleware/errorHandler.ts`): one central handler that converts
  database, validation and JWT errors into clear HTTP responses. In production it hides
  internal error details from the client.
- **Logging** (`src/utils/logger.ts`): structured logging with Winston to the console and to
  rotating log files.

### OCR engine (`engines/ocr/`)

A Python service on FastAPI that extracts printed text from images and PDF files.

Processing steps:

1. The uploaded file is written to a temporary file.
2. PDF files are converted into one image per page (`pdf2image`, Poppler).
3. Each image is optionally pre-processed with OpenCV to improve accuracy:
   - conversion to grayscale
   - Gaussian blur to reduce noise
   - Otsu thresholding to create a clean black-and-white image
   - automatic deskewing when the page is rotated by more than 0.5 degrees
4. Text is extracted with one of two engines:
   - **Tesseract** (default): fast and reliable for clean printed text.
   - **EasyOCR**: a deep-learning engine that handles harder images better.
5. The language of the extracted text is detected (`langdetect`).
6. The service returns the full text, the average confidence (0 to 1), the detected language,
   per-page results and the processing time.
7. The temporary file is deleted.

The Docker image installs Tesseract language data for English, Arabic, French, German and
Spanish.

### Frontend (`client/`)

A React single-page application built with Vite. The build setup is complete: the development
server on port 5173, an API proxy to the backend, code splitting for vendor libraries, and a
production build served by Nginx. The application source code (`client/src`) is not yet written.

### Infrastructure (`infra/`)

- **Docker Compose** (`infra/compose/docker-compose.yml`): defines the full stack on one private
  network, with persistent volumes for MongoDB, Redis and uploaded files.
- **Dockerfiles** (`infra/docker/`): multi-stage builds for the backend (development and
  production), the frontend (development, and production with Nginx) and the OCR engine. The
  production images run as non-root users and include health checks.
- **Database seed** (`infra/compose/mongo-init.js`): creates collections, indexes, a default
  admin user record and two default templates (Invoice and Contract).

---

## Technology Stack

### Backend

| Technology | Purpose |
|------------|---------|
| Node.js 18 | Runtime |
| Express 4 | HTTP server and routing |
| TypeScript 5 | Static typing (strict mode) |
| Mongoose 8 | MongoDB object modelling |
| Bull + Redis | Background job queue |
| jsonwebtoken, bcryptjs | Authentication and password hashing |
| Joi, express-validator | Request validation |
| Helmet, cors, express-rate-limit | HTTP security |
| Multer, Sharp | File upload and image handling |
| Winston, Morgan | Application and HTTP request logging |
| Swagger (swagger-jsdoc, swagger-ui-express) | API documentation |
| Nodemailer | Email notifications |

### Frontend

| Technology | Purpose |
|------------|---------|
| React 18 | User interface |
| Vite 4 | Development server and build tool |
| React Router 6 | Page routing |
| TanStack Query 5 | Server state and caching |
| React Hook Form + Zod | Forms and validation |
| React Dropzone | Drag-and-drop file upload |
| Tailwind CSS 3 | Styling |
| Lucide React, React Hot Toast | Icons and notifications |

### OCR engine

| Technology | Purpose |
|------------|---------|
| Python 3.9 | Runtime |
| FastAPI + Uvicorn | HTTP API |
| Tesseract (pytesseract) | Primary OCR engine |
| EasyOCR | Deep-learning OCR engine |
| OpenCV, NumPy, Pillow | Image pre-processing |
| pdf2image (Poppler) | PDF to image conversion |
| langdetect | Language detection |
| Redis | Result caching |

### Data and infrastructure

| Technology | Purpose |
|------------|---------|
| MongoDB 7 | Primary database |
| Redis 7 | Job queue and cache |
| Docker, Docker Compose | Containerisation and local orchestration |
| Nginx | Serves the production frontend build |

### Development tools

Jest, Supertest and ts-jest (backend tests), Vitest and Testing Library (frontend tests),
ESLint, Prettier, Nodemon and ts-node.

---

## Project Structure

```
Aura-App/
|-- backend/                     Node.js + Express API (TypeScript)
|   |-- src/
|   |   |-- config/              Environment configuration and MongoDB connection
|   |   |-- middleware/          Error handler and 404 handler
|   |   |-- routes/              Health, auth, documents, jobs, users, search, admin
|   |   |-- utils/               Logger
|   |   `-- server.ts            Application entry point
|   |-- package.json
|   `-- tsconfig.json
|-- client/                      React + Vite frontend (configuration only)
|   |-- package.json
|   |-- tsconfig.json
|   `-- vite.config.ts
|-- engines/
|   `-- ocr/                     Python OCR service
|       |-- app.py
|       `-- requirements.txt
|-- infra/
|   |-- compose/                 docker-compose.yml and MongoDB initialisation script
|   `-- docker/                  Dockerfiles for backend, frontend and OCR engine
|-- .env.example                 Template for environment variables
`-- package.json                 Root scripts for the whole project
```

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- Python 3.9 or later
- MongoDB 7 and Redis 7, installed locally or run with Docker
- Tesseract OCR and Poppler, if you run the OCR engine without Docker
- Docker and Docker Compose, for the container setup

### 1. Clone the repository

```bash
git clone https://github.com/ahmadkobah/Aura-App.git
cd Aura-App
```

### 2. Configure the environment

```bash
cp .env.example .env
```

Edit `.env` and set at least `MONGODB_URI`, `REDIS_URL` and `JWT_SECRET`. See
[Configuration](#configuration) for every option.

### 3. Run the backend

```bash
cd backend
npm install
npm run dev
```

The API starts on `http://localhost:3000`. Open `http://localhost:3000/health` to check that
the backend can reach MongoDB.

### 4. Run the OCR engine

```bash
cd engines/ocr
pip install -r requirements.txt
python app.py
```

The OCR engine starts on `http://localhost:8001`.

### 5. Run with Docker (optional)

```bash
npm run docker:up      # start the stack
npm run docker:logs    # follow the logs
npm run docker:down    # stop the stack
```

The Compose file also defines the planned ICR, NLP and orchestrator services. Comment them
out until those services exist (see [Known Issues](#known-issues)).

### Root scripts

| Command | Description |
|---------|-------------|
| `npm run install:all` | Install backend and frontend dependencies |
| `npm run dev` | Start backend and frontend together |
| `npm run build` | Build backend and frontend |
| `npm run test` | Run backend and frontend tests |
| `npm run lint` | Lint backend and frontend |
| `npm run docker:up` | Start the Docker stack |
| `npm run docker:down` | Stop the Docker stack |
| `npm run docker:logs` | Follow the Docker logs |

---

## Configuration

All settings are read from environment variables. `.env.example` contains a complete template.
Never commit a real `.env` file.

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | Yes | | MongoDB connection string |
| `MONGODB_DB_NAME` | No | `aura-app` | Database name |
| `REDIS_URL` | Yes | | Redis connection string |
| `JWT_SECRET` | Yes | | Secret for signing tokens; at least 32 characters |
| `JWT_EXPIRES_IN` | No | `1h` | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Refresh token lifetime |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `PORT` | No | `3000` | Backend port |
| `HOST` | No | `0.0.0.0` | Backend bind address |
| `UPLOAD_PATH` | No | `./uploads` | Folder for uploaded files |
| `MAX_FILE_SIZE` | No | `52428800` | Maximum upload size in bytes (50 MB) |
| `ALLOWED_FILE_TYPES` | No | `pdf,png,jpg,jpeg,tiff,doc,docx` | Allowed file extensions |
| `OCR_SERVICE_URL` | No | `http://localhost:8001` | OCR engine address |
| `ICR_SERVICE_URL` | No | `http://localhost:8002` | ICR engine address |
| `NLP_SERVICE_URL` | No | `http://localhost:8003` | NLP engine address |
| `DOC_INTEL_SERVICE_URL` | No | `http://localhost:8000` | Orchestrator address |
| `BULL_REDIS_URL` | No | value of `REDIS_URL` | Redis for the job queue |
| `JOB_CONCURRENCY` | No | `5` | Parallel processing jobs |
| `JOB_TIMEOUT` | No | `300000` | Job timeout in milliseconds (5 minutes) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | No | | Email server for notifications |
| `CORS_ORIGIN` | No | `http://localhost:5173` | Allowed frontend origin |
| `BCRYPT_ROUNDS` | No | `12` | Password hashing cost |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window (15 minutes) |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Requests per window and IP address |
| `LOG_LEVEL` | No | `info` | `error`, `warn`, `info`, `http` or `debug` |
| `LOG_FORMAT` | No | `combined` | HTTP log format (Morgan) |

---

## API Reference

### Backend (port 3000)

| Method | Path | Status | Description |
|--------|------|--------|-------------|
| GET | `/` | Working | Service name, version and status |
| GET | `/api` | Working | List of API route groups |
| GET | `/health` | Working | Overall health including MongoDB response time; returns 503 when unhealthy |
| GET | `/health/live` | Working | Liveness probe for container platforms |
| GET | `/health/ready` | Working | Readiness probe; returns 503 when the database is not reachable |
| GET | `/api/auth` | Placeholder | Authentication |
| GET | `/api/documents` | Placeholder | Document management |
| GET | `/api/jobs` | Placeholder | Processing jobs |
| GET | `/api/users` | Placeholder | User management |
| GET | `/api/search` | Placeholder | Document search |
| GET | `/api/admin` | Placeholder | Administration |

### OCR engine (port 8001)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/extract` | Extract text from an uploaded image or PDF (multipart field `file`) |
| GET | `/health` | Service health and available engines |
| GET | `/` | Service name and endpoint list |

Example request:

```bash
curl -X POST http://localhost:8001/extract -F "file=@invoice.pdf"
```

Example response:

```json
{
  "text": "INVOICE No. 2024-001 ...",
  "confidence": 0.91,
  "language": "en",
  "pages": [
    { "page_number": 1, "text": "INVOICE No. 2024-001 ...", "confidence": 0.91, "word_count": 182 }
  ],
  "processing_time": 2.4,
  "engine": "tesseract"
}
```

---

## Data Model

The database is initialised by `infra/compose/mongo-init.js`.

| Collection | Purpose | Indexes |
|------------|---------|---------|
| `users` | Accounts, roles and permissions | `email` (unique), `role`, `isActive` |
| `documents` | Uploaded documents and their processing results | `userId`, `status`, `createdAt`, `tags`, NLP keywords |
| `jobs` | Processing jobs and their state | `documentId`, `userId`, `status`, `type`, `createdAt` |
| `templates` | Field definitions for structured extraction | `name` (unique), `createdBy`, `isActive` |

Default templates:

- **Invoice**: invoice number, date, total, vendor, line items
- **Contract**: contract number, parties, effective date, expiration date, terms

---

## Security

- **HTTP headers.** Helmet sets secure headers, including a content security policy.
- **CORS.** Only the configured frontend origin may call the API.
- **Rate limiting.** By default each IP address may make 100 API requests per 15 minutes.
- **Configuration checks.** The server does not start without `MONGODB_URI`, `REDIS_URL` and a
  `JWT_SECRET` of at least 32 characters.
- **Error responses.** In production, internal error details and stack traces are not sent to
  clients.
- **Containers.** Production images run as non-root users.
- **Secrets.** `.env` files are excluded from Git. The values in `.env.example` are placeholders
  only and must be replaced before deployment.

---

## Logging and Monitoring

- Application logs are written to the console and to `backend/logs/`:
  - `error.log`: errors only
  - `combined.log`: all log entries
  - `exceptions.log`: uncaught exceptions
- Log files rotate at 5 MB, and the last 5 files are kept.
- HTTP requests are logged through Morgan.
- Health endpoints support Docker health checks and Kubernetes-style liveness and readiness probes.

---

## Known Issues

- **Docker Compose:** the ICR, NLP and orchestrator services are defined, but their source
  folders and Dockerfiles do not exist yet, so `docker compose up` stops with an error. Comment
  out these services until they are implemented.
- **Frontend:** `client/src` does not exist yet, so the frontend cannot start, and `npm run dev`
  at the root starts only the backend successfully. The production frontend image also expects
  an `nginx.conf` file that is not in the repository.
- **Backend path aliases:** the source code imports modules with the `@/` alias. ts-node and the
  compiled output need `tsconfig-paths` (or a similar tool) to resolve these imports.
- **Seed script:** `npm run seed` refers to `backend/src/scripts/seed.ts`, which does not exist.
  Use `infra/compose/mongo-init.js` for initial data.
- **OCR language default:** the OCR engine uses the language code `en` by default, but Tesseract
  expects three-letter codes such as `eng`.
- **Health checks:** the Dockerfiles use `curl` for health checks, but `curl` is not installed in
  the base images.

---

## Roadmap

1. Authentication: registration, login, token refresh, roles and permissions
2. Document upload, storage and listing
3. Job queue connection between the backend and the OCR engine
4. Frontend: login, upload, document list, document viewer and search
5. ICR engine for handwritten text
6. NLP engine for entities, keywords and classification
7. Document intelligence orchestrator and template-based field extraction
8. API documentation with Swagger
9. Automated tests for the backend, the frontend and the OCR engine
10. Production deployment configuration

---

## Contributing

1. Create a branch from `main`, for example `feature/document-upload`.
2. Keep each change small and focused, and write clear commit messages.
3. Run `npm run lint` and `npm run test` before you open a pull request.
4. Update this README when you add or change a feature, a setting or an endpoint.

---

## License

This project is licensed under the MIT License.

Author: Ahmad Kobah

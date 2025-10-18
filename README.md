# 🔮 Aura App - Document Intelligence Platform

A comprehensive document processing platform that combines OCR, ICR, and NLP technologies to extract, analyze, and manage document content intelligently.

## 🏗️ Architecture

### Core Components
- **Backend**: Node.js with Express (MVC pattern)
- **Frontend**: React.js with Vite
- **Database**: MongoDB
- **Engines**: Python-based OCR, ICR, and NLP services
- **Orchestration**: Document Intelligence Service
- **Infrastructure**: Docker containerization

### Features
- 📄 Multi-format document processing (PDF, images, scanned documents)
- 🤖 Advanced OCR with confidence scoring
- ✍️ Intelligent Character Recognition (ICR) for handwritten text
- 🧠 Natural Language Processing (entity extraction, sentiment analysis)
- 🔍 Advanced search and filtering
- 👥 Role-based access control
- 📊 Real-time processing dashboard
- 🔐 JWT-based authentication

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Docker & Docker Compose
- MongoDB

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/ahmadkobah/Aura-App.git
   cd Aura-App
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose -f infra/compose/docker-compose.yml up -d
   ```

3. **Or run individually**
   ```bash
   # Backend
   cd backend
   npm install
   npm run dev

   # Frontend
   cd client
   npm install
   npm run dev

   # Python Services
   cd engines/ocr
   pip install -r requirements.txt
   python app.py
   ```

## 📁 Project Structure

```
Aura-App/
├── backend/                 # Node.js MVC Backend
│   └── src/
│       ├── config/          # Configuration files
│       ├── controllers/     # Route controllers
│       ├── middleware/      # Custom middleware
│       ├── routes/          # API routes
│       ├── services/        # Business logic
│       ├── repositories/    # Data access layer
│       └── utils/           # Utility functions
├── client/                  # React Frontend
│   └── src/
│       ├── components/      # Reusable components
│       ├── pages/          # Page components
│       ├── contexts/       # React contexts
│       └── services/       # API services
├── engines/                # Python ML Services
│   ├── ocr/                # OCR engine
│   ├── icr/                # ICR engine
│   └── nlp/                # NLP engine
├── services/               # Microservices
│   ├── doc-intel/          # Document intelligence orchestrator
│   └── model-registry/     # ML model management
├── packages/               # Shared packages
│   ├── shared-contracts/   # Type definitions
│   └── shared-utils/       # Common utilities
├── infra/                  # Infrastructure
│   ├── docker/             # Dockerfiles
│   ├── compose/            # Docker Compose files
│   └── k8s/                # Kubernetes manifests
└── scripts/                # Utility scripts
    ├── seed/               # Database seeding
    └── dev/                # Development tools
```

## 🔧 Configuration

Copy `.env.example` to `.env` and configure:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/aura-app
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h

# Services
OCR_SERVICE_URL=http://localhost:8001
ICR_SERVICE_URL=http://localhost:8002
NLP_SERVICE_URL=http://localhost:8003
DOC_INTEL_SERVICE_URL=http://localhost:8000

# File Storage
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=50MB
```

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd client
npm test

# Python service tests
cd engines/ocr
pytest
```

## 📚 API Documentation

API documentation is available at:
- Development: http://localhost:3000/api/docs
- Swagger UI with interactive endpoints
- Postman collection in `backend/src/docs/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Documentation](./docs/)
- [API Reference](./backend/src/docs/)
- [Contributing Guidelines](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)
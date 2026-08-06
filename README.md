# ComplianceIQ

ComplianceIQ is an AI-powered compliance management platform that helps organizations analyze contracts and regulatory documents, identify compliance risks, and obtain reliable insights using Retrieval-Augmented Generation (RAG) and Large Language Models (LLMs).

The platform combines AI, semantic search, and document processing to automate compliance assessments and provide grounded answers based on uploaded documents.

---

## Overview

ComplianceIQ simplifies the analysis of legal and compliance documents by transforming unstructured information into actionable insights. Users can upload contracts, evaluate compliance risks, identify missing clauses, and interact with an AI assistant that answers questions using the content of their documents rather than relying solely on the language model.

The project demonstrates the integration of modern AI techniques with a scalable web application architecture.

---

## Features

### Document Management

- Upload compliance and legal documents
- Organize and manage document collections
- Store document metadata and analysis history

### AI Document Analysis

- Analyze contracts and compliance documents
- Identify compliance risks and missing clauses
- Generate compliance scores and recommendations
- Highlight potential regulatory issues

### Retrieval-Augmented Generation (RAG)

- Process uploaded documents
- Split documents into semantic chunks
- Generate embeddings
- Store embeddings in ChromaDB
- Retrieve relevant context before generating responses
- Reduce hallucinations by grounding answers in document content

### AI Compliance Assistant

- Ask questions about uploaded documents
- Receive contextual answers based on retrieved information
- Reference relevant document sections
- Maintain conversation history

### Dashboard

- View uploaded documents
- Track previous analyses
- Monitor compliance assessments
- Review detected risks

### Authentication

- Secure user authentication
- JWT-based authorization
- Protected API endpoints

---

## Architecture

```
                     Client
                        │
                        ▼
                React Frontend
                        │
                        ▼
                Express Backend
                  │          │
                  │          │
                  ▼          ▼
            PostgreSQL    RAG Service
                               │
                               ▼
                           ChromaDB
                               │
                               ▼
                        Vector Retrieval
                               │
                               ▼
                               LLM
```

---

## RAG Workflow

```
Document Upload
       │
       ▼
Text Extraction
       │
       ▼
Document Chunking
       │
       ▼
Embedding Generation
       │
       ▼
ChromaDB Storage
       │
       ▼
Similarity Search
       │
       ▼
Relevant Context
       │
       ▼
LLM Response
```

---

## Technology Stack

### Frontend

- React
- TypeScript
- Tailwind CSS

### Backend

- Node.js
- Express.js
- REST API
- JWT Authentication

### Database

- PostgreSQL

### AI & Machine Learning

- Large Language Models (LLMs)
- Retrieval-Augmented Generation (RAG)
- Embedding Models
- ChromaDB

### DevOps

- Docker
- Docker Compose
- GitHub Actions

---

## Project Structure

```
ComplianceIQ
│
├── frontend/              # React application
│
├── backend/               # REST API and business logic
│
├── rag-service/           # RAG pipeline and AI services
│
├── docker-compose.yml
│
└── README.md
```

---

## Installation

Clone the repository:

```bash
git clone https://github.com/HajarBoulmane/complianceiq.git
cd complianceiq
```

Install dependencies for each service:

```bash
npm install
```

Configure the required environment variables:

```env
DATABASE_URL=
JWT_SECRET=
OPENAI_API_KEY=
CHROMA_HOST=
CHROMA_PORT=
```

Run the application:

```bash
docker compose up -d
```

---

## Future Improvements

- Multi-tenant architecture
- Role-Based Access Control (RBAC)
- Audit logging
- Compliance framework mapping (GDPR, ISO 27001, etc.)
- AI response evaluation
- Automated regulatory updates
- Security monitoring and vulnerability scanning
- CI/CD deployment pipeline

---


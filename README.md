# 🤖 WhatsApp RAG Chatbot

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

A powerful monorepo featuring an AI-driven WhatsApp chatbot for e-commerce, built with a modern tech stack. This project utilizes Retrieval-Augmented Generation (RAG) to provide accurate product recommendations and process orders directly through WhatsApp.

## 🌟 Features

-   **AI Sales Agent**: Powered by **DeepSeek LLM**, acting as a friendly salesperson named "Mohamed".
-   **RAG Architecture**: Uses **Pinecone** for vector search to retrieve relevant product info from the catalog.
-   **WhatsApp Integration**: Built with **Baileys** to interact directly on WhatsApp.
-   **Order Management**: Captures and saves customer orders to **MongoDB**.
-   **Smart Discounting**: Intelligent negotiation logic with discount guardrails.
-   **Multi-language Support**: Automatically detects and responds in English or French / Darija.
-   **Modern Dashboard**: React-based frontend for managing products, viewing orders, and monitoring the system.

## 🏗 Architecture

This project is a monorepo managed with **PNPM Workspaces**:

-   **`apps/backend`**: Node.js/Express server.
    -   Handles WhatsApp socket connection.
    -   Manages RAG logic with DeepSeek & Pinecone.
    -   Exposes API endpoints for the frontend.
-   **`apps/frontend`**: React (Vite) application.
    -   Admin dashboard for product management.
    -   Visualizes chat history and orders.
    -   Built with TailwindCSS and GSAP for animations.

## 🚀 Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18+)
-   [PNPM](https://pnpm.io/) (`npm install -g pnpm`)
-   [Docker](https://www.docker.com/) & Docker Compose
-   **API Keys**:
    -   DeepSeek API Key
    -   Pinecone API Key & Index

### Environment Setup

1.  **Root `.env`**:
    Create a `.env` file in the root directory for Docker Compose:

    ```env
    MONGO_URI=mongodb://mongo:27017/rag_chatbot
    PORT=3000
    ```

2.  **Backend `.env`**:
    Create a `.env` file in `apps/backend/`:

    ```env
    PORT=3000
    MONGO_URI=mongodb://localhost:27017/rag_chatbot # Use 'mongo' instead of 'localhost' if running via Docker
    
    # AI & Vector DB
    DEEPSEEK_API_KEY=your_deepseek_key
    DEEPSEEK_MODEL=deepseek-chat
    PINECONE_API_KEY=your_pinecone_key
    PINECONE_INDEX=your_index_name

    # WhatsApp (Optional - Baileys handles auth via file system)
    ```

3.  **Frontend `.env`**:
    Create a `.env` file in `apps/frontend/` if needed (e.g., for API URL overrides).
    
    ```env
    VITE_API_URL=http://localhost:3000
    ```

### 🏃 Running the Project

#### Option 1: Using Docker (Recommended)

Build and start all services (MongoDB, Backend, Frontend):

```bash
docker-compose up --build
```

-   **Frontend**: [http://localhost:5173](http://localhost:5173)
-   **Backend**: [http://localhost:3000](http://localhost:3000)

#### Option 2: Local Development

1.  **Install dependencies**:
    ```bash
    pnpm install
    ```

2.  **Start Services**:
    
    In one terminal (Frontend):
    ```bash
    pnpm dev:frontend
    ```

    In another terminal (Backend):
    ```bash
    # Ensure you have a local MongoDB running or update MONGO_URI
    pnpm dev:backend
    ```

## 🛠️ Tech Stack Details

### Backend
-   **Runtime**: Node.js
-   **Framework**: Express.js
-   **AI/LLM**: DeepSeek API (OpenAI compatible)
-   **Vector DB**: Pinecone
-   **Database**: MongoDB (Mongoose)
-   **WhatsApp**: @whiskeysockets/baileys
-   **Language**: TypeScript

### Frontend
-   **Framework**: React (Vite)
-   **Styling**: TailwindCSS
-   **Animations**: GSAP
-   **State Management**: React Query / Context
-   **Language**: TypeScript

## 📝 Usage Guide

1.  **Seeding Data**: Use the Frontend dashboard to "Seed Data". This embeds your products into Pinecone.
2.  **QR Code**: Scan the QR code printed in the backend terminal (or exposed via API) to link your WhatsApp account.
3.  **Chatting**: Send a message to the linked WhatsApp number. The AI agent "Mohamed" will reply.

## 🤝 Contributing

1.  Fork the repository
2.  Create your feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit your changes (`git commit -m 'Add some amazing feature'`)
4.  Push to the branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

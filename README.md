# RAG Chatbot Monorepo

This project is a monorepo containing a **React** frontend and an **Express** backend, utilizing **MongoDB**, **Pinecone**, and **Google Gemini** for a RAG (Retrieval-Augmented Generation) chatbot.

## Prerequisites

- [Docker](https://www.docker.com/) and Docker Compose
- [Google Gemini API Key](https://makersuite.google.com/app/apikey)
- [Pinecone API Key & Index](https://www.pinecone.io/)
- [MongoDB](https://www.mongodb.com/) (Managed via Docker)

## Configuration

1.  Create a `.env` file in the root directory:

    ```env
    MONGO_URI=mongodb://mongo:27017/rag_chatbot
    GEMINI_API_KEY=your_gemini_api_key
    PINECONE_API_KEY=your_pinecone_api_key
    PINECONE_INDEX=your_index_name
    PORT=3000
    ```

## Running with Docker

1.  Build and start the containers:

    ```bash
    docker-compose up --build
    ```

2.  Access the application:
    -   **Frontend**: [http://localhost:5173](http://localhost:5173)
    -   **Backend API**: [http://localhost:3000](http://localhost:3000)

## Recommended Workflow

1.  **Seed Data**:
    -   Open the Frontend.
    -   Click the **"Seed Data"** button in the top right.
    -   This will:
        -   Clear existing products.
        -   Insert sample products into MongoDB.
        -   Generate embeddings using Gemini.
        -   Upload vectors to Pinecone.

2.  **Chat**:
    -   Type a question like *"Do you have running shoes?"*.
    -   The system will search Pinecone and use Gemini to generate a response.

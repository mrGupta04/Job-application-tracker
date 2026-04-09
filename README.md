# Job Application Tracker

A MERN stack application for tracking job applications with AI assistance.

## Features

- User authentication (register/login)
- Kanban board for application tracking
- AI-powered job description parsing
- AI-generated resume suggestions

## Tech Stack

- Frontend: React, TypeScript, Tailwind CSS, Vite
- Backend: Node.js, Express, TypeScript
- Database: MongoDB
- AI: OpenAI API

## Setup

1. Clone the repo
2. Install dependencies for backend and frontend
3. Set up environment variables (see .env.example)
4. Run MongoDB
5. Start backend: `npm run dev`
6. Start frontend: `npm run dev`

## Environment Variables

- MONGO_URI: MongoDB connection string
- JWT_SECRET: Secret for JWT
- OPENAI_API_KEY: OpenAI API key
- PORT: Backend port (default 5000)

## Decisions

- Used React Query for state management
- JWT for authentication
- Mongoose for MongoDB ODM
- OpenAI for AI features
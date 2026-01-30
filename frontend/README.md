# Multi-RAG AI Workspace - Frontend

A professional Next.js frontend for the Multi-RAG AI Workspace Platform with a black and cream color theme.

## Features

- 🔐 Authentication (Login/Register)
- 📊 Dashboard with navigation
- 💬 Chat interface for each RAG type
- 📁 File upload (PDF/CSV)
- 📈 Usage counter and quota tracking
- 🎨 Professional black and cream UI theme

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file:
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── app/                    # Next.js app router pages
│   ├── dashboard/         # Dashboard and RAG pages
│   ├── login/            # Login page
│   ├── register/         # Register page
│   └── layout.tsx        # Root layout
├── components/            # React components
│   ├── chat/            # Chat components
│   ├── layout/          # Layout components
│   ├── rag/             # RAG page component
│   ├── upload/          # File upload components
│   ├── usage/           # Usage counter
│   └── ui/              # UI components (Button, Input, Card)
├── lib/                  # Utilities
│   ├── api.ts           # API client
│   └── utils.ts         # Helper functions
├── store/                # State management
│   └── authStore.ts     # Auth store (Zustand)
└── types/               # TypeScript types
```

## RAG Types

- **Support**: Company documentation RAG (PDF)
- **Resume**: Resume analysis RAG (PDF)
- **Expense**: Expense tracking RAG (CSV)
- **General**: General purpose AI assistant

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Zustand (State management)
- Axios (HTTP client)
- React Icons

## Color Theme

- **Light Pinkish Gray**: Primary background (#f5f3f0)
- **Black**: Primary accent color for buttons and highlights (#000000)
- **Dark Gray**: Text and secondary elements (#1a1a1a)

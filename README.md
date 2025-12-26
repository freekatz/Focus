# Focus

English | [中文](README_zh.md)

A modern, minimalist RSS reader with AI-powered insights. Designed for vibe reading with a card-based swipe interface.

## Features

- **Card-based Reading** - Tinder-style swipe interface for quick article triage
- **AI Insights** - Summarize articles and generate key takeaways using multiple AI providers
- **RSS Subscriptions** - Subscribe to your favorite sources with automatic fetching
- **Smart Library** - Organize saved articles with favorites, archives, and trash
- **Personal RSS Feed** - Export your saved articles as an RSS/Atom feed
- **Zotero Integration** - Export articles directly to your Zotero library
- **Dark Mode** - Beautiful light and dark themes
- **Responsive Design** - Optimized for both desktop and mobile

## Tech Stack

**Frontend:**
- React 19 + TypeScript
- Tailwind CSS
- Vite

**Backend:**
- FastAPI (Python)
- SQLAlchemy (async) + SQLite/PostgreSQL
- LangChain (multi-provider AI support)

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.10+
- (Optional) AI API key (OpenAI, Anthropic, Google, or Ollama)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/katz/focus.git
   cd focus
   ```

2. **Setup Backend**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration

   pip install -r requirements.txt
   python run.py
   ```

3. **Setup Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Access the app**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Default Login

- Username: `admin`
- Password: `focus123`

## Configuration

Key environment variables in `backend/.env`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Database connection string | SQLite |
| `SECRET_KEY` | JWT secret key | Change in production! |
| `AI_PROVIDER` | AI provider (openai/anthropic/google/ollama) | openai |
| `AI_MODEL` | Model name | gpt-4o-mini |
| `AI_API_KEY` | API key for AI provider | - |
| `RSS_FETCH_INTERVAL` | Auto-fetch interval (minutes) | 30 |

See [.env.example](backend/.env.example) for all options.

## Deployment

For production deployment instructions, see [docs/deployment.md](docs/deployment.md).

## License

[MIT License](LICENSE) - Copyright (c) 2025 Katz

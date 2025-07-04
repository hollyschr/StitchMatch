# StitchMatch
Find Perfect Patterns for Your Stash

A full-stack web application for managing and browsing patterns using a FastAPI backend with a SQLite database and a React (Vite) frontend.

## Backend (FastAPI + SQLite)

### Setup
1. Create and activate a virtual environment:
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Run the backend server:
   ```bash
   uvicorn app:app --reload
   ```
   The API will be available at [http://127.0.0.1:8000](http://127.0.0.1:8000)

## Frontend (React + Vite)

### Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the frontend development server:
   ```bash
   npm run dev
   ```
   The app will be available at [http://localhost:5173](http://localhost:5173)

## Project Structure
- `app.py` - FastAPI backend
- `StitchMatch.db` - SQLite database
- `frontend/` - React frontend app
- `requirements.txt` - Python dependencies
- `.gitignore` - Files and folders to ignore in git

## Notes
- Make sure the backend is running before using the frontend.
- The frontend communicates with the backend via HTTP API endpoints.

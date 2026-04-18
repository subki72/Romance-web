# Sweet Memories

Sweet Memories is a romantic memory journal for couples. It lets two people keep poems, photos, videos, and a shared music playlist in one place, with data stored in Supabase and served through a small Express backend.

## Features

- Password-protected access
- Editable couple names
- Anniversary day counter
- Poetry section with create, edit, and delete actions
- Photo and video gallery with captions and lightbox viewing
- Audio playlist with play, pause, next, previous, and volume controls
- Floating heart animations and responsive layout
- Supabase-backed storage for app data and uploaded media

## Tech Stack

- Frontend: HTML, CSS, and Vanilla JavaScript ES modules
- Backend: Node.js and Express
- Database: Supabase PostgreSQL
- Media storage: Supabase Storage
- Upload handling: Multer in memory storage
- Environment variables: dotenv
- Cross-origin support: cors

## Project Structure

```text
web-romance/
|-- src/
|   |-- index.html
|   |-- main.js
|   |-- api.js
|   |-- state.js
|   |-- ui.js
|   `-- style.css
|-- server.js
|-- supabase-setup.sql
|-- package.json
|-- package-lock.json
|-- .gitignore
`-- README.md
```

## How It Works

- `server.js` serves the static frontend from the project root and exposes the API endpoints.
- The frontend loads `src/index.html`, which imports `src/main.js` as a module.
- `src/main.js` handles UI behavior, modal flows, gallery actions, playlist controls, and authentication state.
- `src/api.js` communicates with the backend endpoints.
- App data is saved in the `app_data` table in Supabase.
- Uploaded media is sent to Supabase Storage in the `memories` bucket.

## Prerequisites

- Node.js 14 or newer
- npm
- A Supabase project

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Supabase

Run `supabase-setup.sql` in your Supabase SQL editor to create the required table.

Create a storage bucket named `memories` for media uploads.

### 3. Configure environment variables

Create a `.env` file in the project root with the following values:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
APP_PASSWORD=your-app-password
PORT=3000
NODE_ENV=development
```

### 4. Run the app
```bash
npm run dev
```

The app will be available at `http://localhost:3000`.

## Available Scripts

- `npm run dev` starts the Express server in development mode
- `npm start` starts the Express server in production mode

## API Endpoints

All protected endpoints expect the app password in the `Authorization` header.

- `POST /api/verify` verifies the login password
- `GET /api/data` returns the saved app data
- `POST /api/data` saves the app data
- `POST /api/upload` uploads a media file to Supabase Storage
- `DELETE /api/upload/:filename` deletes a media file from Supabase Storage

## Notes

- `src/` contains the entire frontend application.
- `db.json` and `tailwind.config.js` are not part of the current runtime implementation.
- `uploads/` is not used by the current upload flow, which streams files directly to Supabase Storage.

## Security Notes

- The app password is stored only on the server side and sent through the `Authorization` header during requests.
- The Supabase service role key must stay in the backend environment and should never be exposed in frontend code.
- Use HTTPS in production.

## License

This project is licensed under the MIT License.

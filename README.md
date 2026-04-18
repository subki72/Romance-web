# Sweet Memories 

A beautiful, interactive web application for couples to share and preserve their cherished memories together. Store poems, photos, videos, and create a shared music playlist—all in one intimate digital space.

## Features 

- **Password-Protected Access** - Secure your memories with a simple password authentication
- **Couple Names** - Personalize the app with both partners' names
- **Anniversary Counter** - Track days together with an animated counter
- **Poetry Section** - Write, edit, and share poems with timestamps
- **Photo & Video Gallery** - Upload and organize photos and videos with captions
  - Drag-and-drop file upload
  - Lightbox viewer for full-screen viewing
  - Video support with play indicators
- **Music Playlist** - Build a shared playlist of your favorite songs
  - Audio player with controls (play, pause, next, previous)
  - Volume control and progress bar
  - Playlist management
- **Floating Hearts Animation** - Romantic animated background elements
- **Responsive Design** - Works beautifully on desktop, tablet, and mobile devices
- **Cloud Storage** - All data and media stored securely with Supabase
- **Real-time Sync** - Changes sync instantly across devices

## Tech Stack 

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Node.js with Express.js
- **Database & Storage**: Supabase (PostgreSQL + Cloud Storage)
- **File Upload**: Multer
- **Styling**: Tailwind CSS
- **CORS**: Enabled for cross-origin requests

## Prerequisites 

Before you begin, ensure you have:

- Node.js (v14 or higher)
- npm or yarn
- A Supabase account (free tier available at [supabase.com](https://supabase.com))

## Installation 

### 1. Clone the Repository

```bash
git clone <repository-url>
cd sweet-memories
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a new project on [Supabase](https://supabase.com)
2. In your Supabase dashboard, go to **SQL Editor** and run the provided `supabase-setup.sql` file to create the necessary tables
3. Create a storage bucket named `memories` for media files
4. Get your credentials:
   - Project URL (from Settings → API)
   - Service Role Key (from Settings → API)

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
APP_PASSWORD=your-secure-password-here
PORT=3000
NODE_ENV=development
```

Replace the values with your actual Supabase credentials and choose a secure password.

### 5. Run the Application

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

The application will be available at `http://localhost:3000`

## Usage 

### First Time Setup

1. Open the app in your browser
2. Enter the password you set in the `.env` file
3. Personalize the app by editing the couple names
4. Set your anniversary date to start the counter

### Adding Memories

**Poems:**
- Click "Add Poem" button
- Enter title and poem text
- Click "Save" to add to your collection
- Edit or delete poems anytime

**Photos & Videos:**
- Click "Add Memory" button
- Drag and drop files or click to browse
- Supports images (JPG, PNG, GIF, WebP) and videos (MP4, WebM, MOV)
- Add a caption (optional)
- Click "Upload" to save

**Music:**
- Click "Add Song" button
- Enter song title and artist name
- Upload an audio file (MP3, WAV, OGG, etc.)
- Click "Upload" to add to playlist

### Music Player Controls

- **Play/Pause**: Click the play button or press spacebar
- **Next/Previous**: Use arrow buttons or click songs in the playlist
- **Volume**: Adjust with the volume slider
- **Progress**: Click on the progress bar to seek

## Project Structure 

```
sweet-memories/
├── src/
│   ├── index.html          # Main HTML file
│   ├── main.js             # Application logic
│   ├── api.js              # API communication
│   ├── state.js            # Application state management
│   ├── ui.js               # UI utilities
│   └── style.css           # Styling
├── assets/                 # Static images
├── uploads/                # Local file uploads (development)
├── server.js               # Express server
├── package.json            # Dependencies
├── tailwind.config.js      # Tailwind configuration
├── supabase-setup.sql      # Database schema
├── .env.example            # Environment variables template
└── README.md               # This file
```

## API Endpoints 

All endpoints require the `Authorization` header with the app password.

### Authentication
- `POST /api/verify` - Verify password

### Data Management
- `GET /api/data` - Fetch all app data
- `POST /api/data` - Save app data

### Media Management
- `POST /api/upload` - Upload media file
- `DELETE /api/upload/:filename` - Delete media file

## Database Schema 

The app uses a single `app_data` table with the following structure:

```sql
CREATE TABLE app_data (
  id INT PRIMARY KEY,
  data JSONB,
  updated_at TIMESTAMP
);
```

The `data` column stores:
- `poems`: Array of poem objects
- `photos`: Array of photo/video objects
- `playlist`: Array of song objects
- `anniversary`: Anniversary date string
- `name1`: First partner's name
- `name2`: Second partner's name

## Security Considerations 

- Passwords are transmitted in request headers (use HTTPS in production)
- All media files are stored in Supabase Cloud Storage
- Service role key should never be exposed in frontend code
- Consider implementing additional authentication for production use

## Deployment 

### Heroku Deployment

1. Create a Heroku account and install the Heroku CLI
2. Login: `heroku login`
3. Create app: `heroku create your-app-name`
4. Set environment variables:
   ```bash
   heroku config:set SUPABASE_URL=your-url
   heroku config:set SUPABASE_SERVICE_KEY=your-key
   heroku config:set APP_PASSWORD=your-password
   ```
5. Deploy: `git push heroku main`

### Other Platforms

The app can be deployed to any Node.js hosting platform (Vercel, Railway, Render, etc.). Ensure environment variables are properly configured.

## Troubleshooting 

**"Wrong password, sweetie 💔"**
- Check that the password in `.env` matches what you're entering
- Ensure the `APP_PASSWORD` environment variable is set

**"Failed to load data"**
- Verify Supabase credentials are correct
- Check that the `app_data` table exists in your database
- Ensure your Supabase project is active

**"Failed to upload file"**
- Check file size (max 50MB)
- Verify the `memories` storage bucket exists in Supabase
- Ensure storage bucket permissions allow uploads

**Audio not playing**
- Some browsers block autoplay audio; user interaction is required
- Check browser console for CORS errors
- Verify the audio file format is supported

## Contributing 

Feel free to fork this project and submit pull requests for any improvements.

## License 

This project is licensed under the ISC License.

## Support 

For issues, questions, or suggestions, please open an issue on the repository.

---

Made with ❤️ for couples who want to preserve their memories together.

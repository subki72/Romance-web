const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');

// Load environment variables in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Supabase Client ───
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (src/, assets/)
app.use('/', express.static(__dirname));

// Redirect root to the main app
app.get('/', (req, res) => {
  res.redirect('/src/index.html');
});

// Multer: store in memory (we'll upload buffer to Supabase Storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max
});

// ─── API: Get App Data ───
app.get('/api/data', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('app_data')
      .select('data')
      .eq('id', 1)
      .single();

    if (error && error.code === 'PGRST116') {
      // Row doesn't exist yet, return defaults
      return res.json({
        poems: [],
        photos: [],
        playlist: [],
        anniversary: null,
        name1: "Your Name",
        name2: "Partner"
      });
    }
    if (error) throw error;
    res.json(data.data);
  } catch (err) {
    console.error('GET /api/data error:', err.message);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// ─── API: Save App Data ───
app.post('/api/data', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('app_data')
      .upsert({ id: 1, data: req.body, updated_at: new Date().toISOString() })
      .select();

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/data error:', err.message);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// ─── API: Upload Media File ───
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const ext = path.extname(req.file.originalname);
    const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;

    const { data, error } = await supabase.storage
      .from('memories')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '31536000',
        upsert: false
      });

    if (error) throw error;

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('memories')
      .getPublicUrl(fileName);

    res.json({ url: urlData.publicUrl });
  } catch (err) {
    console.error('POST /api/upload error:', err.message);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// ─── API: Delete Media File ───
app.delete('/api/upload/:filename', async (req, res) => {
  try {
    const { error } = await supabase.storage
      .from('memories')
      .remove([req.params.filename]);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/upload error:', err.message);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

app.listen(PORT, () => {
  console.log(`Sweet Memories server running at http://localhost:${PORT}`);
});

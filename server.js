const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const TMDB_API_KEY = 'YOUR_TMDB_API_KEY';

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data', 'users.json');
const PFPS_DIR = path.join(__dirname, 'data', 'users-pfps');

// Middleware
app.use(express.json({ limit: '50mb' }));

// Block access to data files - must come before static middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/data/') || req.path.endsWith('.json')) {
    return res.status(403).send('Forbidden');
  }
  next();
});

app.use(express.static(__dirname));
app.use('/pfps', express.static(PFPS_DIR));

// Helper functions
function readUsers() {
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return { users: [] };
  }
}

function writeUsers(data) {
  const tempFile = DATA_FILE + '.tmp';
  fs.writeFileSync(tempFile, JSON.stringify(data, null, 2));
  fs.renameSync(tempFile, DATA_FILE);
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function generateDeviceCode() {
  return crypto.randomBytes(7).toString('base64').replace(/[+/=]/g, '').substring(0, 14);
}

// Initialize data file
if (!fs.existsSync(DATA_FILE)) {
  writeUsers({ users: [] });
}

// TMDB Proxy - keeps API key server-side
app.get('/api/tmdb/*', (req, res) => {
  const tmdbPath = req.params[0];
  const urlObj = new URL(`https://api.themoviedb.org/3/${tmdbPath}`);
  urlObj.searchParams.set('api_key', TMDB_API_KEY);
  
  const queryParams = new URL(req.url, `http://${req.headers.host}`).searchParams;
  for (const [key, value] of queryParams) {
    urlObj.searchParams.set(key, value);
  }
  
  https.get(urlObj.toString(), (proxyRes) => {
    let data = '';
    proxyRes.on('data', chunk => data += chunk);
    proxyRes.on('end', () => res.json(JSON.parse(data)));
  }).on('error', err => res.status(500).json({ error: err.message }));
});

// API Routes

// Authorize with device code
app.post('/api/authorize', (req, res) => {
  const { deviceCode } = req.body;
  
  if (!deviceCode) {
    return res.status(400).json({ error: 'Device code required' });
  }
  
  const data = readUsers();
  
  // Find user with this device code
  for (const user of data.users) {
    if (user.devices && user.devices[deviceCode]) {
      return res.json({ 
        success: true, 
        user: { 
          username: user.username, 
          settings: user.settings,
          recentlyWatched: user.recentlyWatched 
        }
      });
    }
  }
  
  return res.status(401).json({ error: 'Invalid device code' });
});

// Register new user
app.post('/api/register', (req, res) => {
  const { username, password, deviceCode } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  const data = readUsers();
  
  // Check if user exists
  if (data.users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  // Generate device code for this device
  const newDeviceCode = deviceCode || generateDeviceCode();
  
  // Create new user
  const newUser = {
    username,
    password: hashPassword(password),
    createdAt: new Date().toISOString(),
    settings: {
      theme: 'dark',
      avatar: '&#128100;'
    },
    recentlyWatched: [],
    devices: {
      [newDeviceCode]: { addedAt: new Date().toISOString() }
    }
  };
  
  data.users.push(newUser);
  writeUsers(data);
  
  res.json({ success: true, deviceCode: newDeviceCode, user: { username: newUser.username, settings: newUser.settings } });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password, deviceCode } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  const data = readUsers();
  const userIndex = data.users.findIndex(u => u.username === username && u.password === hashPassword(password));
  
  if (userIndex === -1) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const user = data.users[userIndex];
  
  // Generate device code if not provided or new device
  let newDeviceCode = deviceCode;
  if (!newDeviceCode || !user.devices || !user.devices[newDeviceCode]) {
    newDeviceCode = generateDeviceCode();
    if (!user.devices) user.devices = {};
    user.devices[newDeviceCode] = { addedAt: new Date().toISOString() };
    data.users[userIndex] = user;
    writeUsers(data);
  }
  
  res.json({ 
    success: true, 
    deviceCode: newDeviceCode,
    user: { 
      username: user.username, 
      settings: user.settings,
      recentlyWatched: user.recentlyWatched 
    } 
  });
});

// Get user data
app.get('/api/user/:username', (req, res) => {
  const { username } = req.params;
  const data = readUsers();
  const user = data.users.find(u => u.username === username);
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  res.json({ 
    username: user.username, 
    settings: user.settings,
    recentlyWatched: user.recentlyWatched 
  });
});

// Update user settings
app.put('/api/user/:username/settings', (req, res) => {
  const { username } = req.params;
  const { settings } = req.body;
  
  const data = readUsers();
  const userIndex = data.users.findIndex(u => u.username === username);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  data.users[userIndex].settings = { ...data.users[userIndex].settings, ...settings };
  writeUsers(data);
  
  res.json({ success: true, settings: data.users[userIndex].settings });
});

// Upload avatar
app.post('/api/user/:username/avatar', (req, res) => {
  const { username } = req.params;
  const { avatar } = req.body;
  
  if (!avatar || !avatar.startsWith('data:image')) {
    return res.status(400).json({ error: 'Invalid image data' });
  }
  
  const data = readUsers();
  const userIndex = data.users.findIndex(u => u.username === username);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const matches = avatar.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!matches) {
    return res.status(400).json({ error: 'Invalid image format' });
  }
  
  const ext = matches[1];
  const base64Data = matches[2];
  const filename = `${username}_${Date.now()}.${ext}`;
  const filepath = path.join(PFPS_DIR, filename);
  
  fs.writeFileSync(filepath, Buffer.from(base64Data, 'base64'));
  
  if (!data.users[userIndex].settings) data.users[userIndex].settings = {};
  data.users[userIndex].settings.avatar = `/pfps/${filename}`;
  writeUsers(data);
  
  res.json({ success: true, avatar: data.users[userIndex].settings.avatar });
});

// Update recently watched
app.put('/api/user/:username/recently-watched', (req, res) => {
  const { username } = req.params;
  const { recentlyWatched } = req.body;
  
  const data = readUsers();
  const userIndex = data.users.findIndex(u => u.username === username);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  data.users[userIndex].recentlyWatched = recentlyWatched;
  writeUsers(data);
  
  res.json({ success: true });
});

// Add/Update recently watched item (single item)
app.post('/api/user/:username/recently-watched', (req, res) => {
  const { username } = req.params;
  const item = req.body;
  
  if (!item) {
    return res.status(400).json({ error: 'Item required' });
  }
  
  const data = readUsers();
  const userIndex = data.users.findIndex(u => u.username === username);
  
  if (userIndex === -1) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Remove existing entry for same media
  if (!data.users[userIndex].recentlyWatched) data.users[userIndex].recentlyWatched = [];
  data.users[userIndex].recentlyWatched = data.users[userIndex].recentlyWatched.filter(
    r => !(r.id === item.id && r.type === item.type)
  );
  
  // Add to front
  data.users[userIndex].recentlyWatched.unshift(item);
  
  // Keep max 20 items
  if (data.users[userIndex].recentlyWatched.length > 20) {
    data.users[userIndex].recentlyWatched = data.users[userIndex].recentlyWatched.slice(0, 20);
  }
  
  writeUsers(data);
  
  res.json({ success: true });
});

// Delete account
app.delete('/api/user/:username', (req, res) => {
  const { username } = req.params;
  const { password } = req.body;
  
  const data = readUsers();
  const user = data.users.find(u => u.username === username && u.password === hashPassword(password));
  
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  data.users = data.users.filter(u => u.username !== username);
  writeUsers(data);
  
  res.json({ success: true });
});

// Serve the app (bind to all interfaces for cross-device access)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`WHMedia running on http://0.0.0.0:${PORT}`);
  console.log(`Access from this device: http://localhost:${PORT}`);
});

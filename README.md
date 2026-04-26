# WHMedia

A self-hosted media streaming dashboard for movies and TV shows.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   node server.js
   ```
   Or use the provided script: `./Start WHMedia.sh`

3. Open in browser: `http://localhost:3001`
   - From other devices on your network: `http://YOUR_DEVICE_IP:3001`

## Changing the TMDB API Key

The app uses The Movie Database (TMDB) API. To use your own API key:

1. Get a free API key at: https://www.themoviedb.org/settings/api

2. Open `server.js` and update this line (near the top):
   ```javascript
   const TMDB_API_KEY = 'YOUR_NEW_API_KEY_HERE';
   ```

3. Restart the server

## Features

- Search movies and TV shows
- Stream via embedded video sources (VidSRC, XPrime)
- User accounts with device-based login
- Sync settings and watch history across devices
- Multiple themes
- Avatar selection

## Data Storage

- User data: `data/users.json`
- Profile pictures: `data/users-pfps/`

**Security:** The `data/` folder is blocked from public access.

## Video Sources

The app includes these streaming sources:
- VidSRC (vidsrc-embed.ru)
- VidSRC (vidsrc.me)
- XPrime

## Accessing from Other Devices

On your network, use your computer's local IP address:
- Windows: `ipconfig` in Command Prompt
- macOS/Linux: `ip a` or `ifconfig`

Then access from other devices at `http://192.168.x.x:3001`

## Troubleshooting

- **Page shows "Error loading":** Restart the server
- **Can't connect from other device:** Make sure your firewall allows port 3001
- **Video not loading:** Try a different video source in Settings





Themes:

Dark
<img width="691" height="1135" alt="image" src="https://github.com/user-attachments/assets/00928706-7356-4c44-aa94-3a93007ba678" />

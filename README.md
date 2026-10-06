# 🎤 Pinoy Karaoke – Videoke Web App

A free, Pinoy-style karaoke (videoke) web app for barkada nights, birthdays, and inuman sessions.

## Features

- **Create Room** → get a short code + QR code
- **Big Screen Player** – open on TV / laptop / projector
- **Phone Controllers** – everyone joins with their phone (no app install)
- **Queue system** – fair, real-time song queue
- **YouTube powered** – paste any karaoke video link or use popular OPM list
- **Pinoy scoring** – classic videoke-style scores with Tagalog reactions
- **Mobile-first controller** – search, popular songs, queue management

## Quick Start

### 1. Install dependencies

```bash
cd pinoy-karaoke
npm install
```

### 2. Run the server

```bash
npm start
```

Open **http://localhost:3000**

### 3. How to use

1. Click **Create Room**
2. On your TV/laptop → click **Open Player**
3. On phones → scan the QR or open the Controller link / enter the room code
4. Search or pick popular OPM songs → add to queue
5. Sing! Scores appear automatically after each song

## Project Structure

```
pinoy-karaoke/
├── server.js          # Express + Socket.io backend
├── package.json
├── public/
│   ├── index.html     # Landing / create-join
│   ├── player.html    # Big screen player
│   ├── controller.html# Phone remote
│   ├── join.html      # QR landing page
│   ├── css/style.css
│   └── js/
│       ├── home.js
│       ├── player.js
│       └── controller.js
```

## Tips for Best Experience

- Use a TV or large monitor for the **Player**
- Phones join as **Controller**
- For more songs: search YouTube for “Song Title karaoke”, copy the link, paste into the search box
- Works best on the same Wi-Fi network (or deploy online)

## Deploy on Railway (recommended)

Railway supports Socket.io and persistent Node processes — perfect for this app.

### Steps

1. **Push to GitHub**
   - Create a new repo on GitHub
   - Upload / push the entire `pinoy-karaoke` folder

2. **Deploy on Railway**
   - Go to [railway.app](https://railway.app) and sign in (GitHub is easiest)
   - Click **New Project** → **Deploy from GitHub repo**
   - Select your `pinoy-karaoke` repo
   - Railway auto-detects Node.js and runs `npm install` + `npm start`
   - Wait for the build to finish

3. **Get a public URL**
   - Open the service → **Settings** → **Networking** → **Generate Domain**
   - You’ll get something like `https://pinoy-karaoke-production-xxxx.up.railway.app`

4. **Done!**  
   Open the URL → Create Room → share the code/QR with your barkada.

### Notes
- No extra environment variables needed
- Free trial / hobby plan is enough for parties
- Rooms are in-memory (they reset if the service restarts)

## Tech Stack

- Node.js + Express
- Socket.io (real-time rooms & queue)
- YouTube IFrame API
- Tailwind CSS (CDN)
- Vanilla JS

## Notes

- Scoring is fun/simulated (not real pitch detection) — classic Pinoy videoke style
- YouTube videos depend on what is available and not blocked
- For commercial/venue use, proper music licensing (e.g. FILSCAP) is required

Made with ❤️ for every Pinoy who loves to kanta.

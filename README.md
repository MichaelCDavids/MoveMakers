# MoveMakers — Make Gesture App

[![projectcodeX Hackathon](https://img.shields.io/badge/projectcodeX-December_Hackathon-blue.svg)](https://www.projectcodex.co)
[![Teachable Machine](https://img.shields.io/badge/Google-Teachable_Machine_Pose-green.svg)](https://teachablemachine.withgoogle.com/)
[![Node.js Runtime](https://img.shields.io/badge/Node.js-22_Express-brightgreen.svg)](https://nodejs.org)
[![Repository](https://img.shields.io/badge/GitHub-MichaelCDavids%2FMoveMakers-informational.svg)](https://github.com/MichaelCDavids/MoveMakers)

**MoveMakers** is an interactive, browser-based computer vision game developed for the **projectcodeX December Hackathon** by **Hurley Surf Coders** (Michael C Davids, Phumlani Arendse, Sesethu).

The game uses **Google's Teachable Machine PoseNet** model (`@teachablemachine/pose` + TensorFlow.js) to recognize full-body and upper-body human gestures in real-time through the player's webcam, giving instant audio and visual feedback.

---

## 🎮 Game Challenges & Gestures

Players are prompted to perform 4 distinct gestures sequentially:

| Challenge | Gesture Name | Pose Description | Feedback Sound |
| :---: | :---: | :--- | :---: |
| **#1** | **🍽️ Hungry** | Bring your hand up towards your mouth as if taking a bite. | `bell.mp3` |
| **#2** | **👀 I See You** | Hold index and middle fingers in a V-shape pointing towards your eyes. | `bell.mp3` |
| **#3** | **🤫 Quiet Down** | Hold index finger upright vertically across your lips (shh gesture). | `bell.mp3` |
| **#4** | **💃 Get Busy** | Raise both arms and groove rhythmically in front of the camera. | `jinglebells.mp3` |

---

## 🚀 Key Features & HUD Interface

- **Live Viewfinder Camera HUD**:
  - Sci-fi targeting brackets (`[ ]`), centering reticle, and scanning beam overlay.
  - Live status indicator: `LIVE • POSE TRACKING`, `SIMULATION READY`, or `STANDBY`.
  - Camera flip button (horizontal mirroring).
- **Real-Time Prediction Meter**:
  - Live probability cards (0–100%) for all 4 trained gesture classes simultaneously.
  - Active target gesture is automatically highlighted with a glowing border.
- **Audio Feedback System**:
  - Celebratory chime (`bell.mp3`) on successful gesture detection.
  - Hint sound (`error.mp3`) on missed/unrecognized poses.
  - Victory fanfare (`jinglebells.mp3`) upon completing all 4 challenges.
  - Sound ON/OFF mute toggle button in the HUD.
- **Interactive Simulation Controls**:
  - Built-in test buttons (`🍽️ Hungry`, `👀 I See You`, `🤫 Quiet Down`, `💃 Get Busy`) allow testing and playing even when a physical webcam is not attached or access is denied.
- **Leaderboard & Player Tracker**:
  - Player registration (Name, Age) on home screen.
  - Real-time leaderboard with rank, name, age, and gestures completed.

---

## 🏗️ Architecture

```
MoveMakers/
├── server.js                      # Express HTTP server & template engine (port 3000)
├── database.sql                   # SQL schema for PostgreSQL persistence
├── package.json                   # Dependencies (express, handlebars, hbs)
├── .env.example                   # Environment configuration template
├── README.md                      # Complete project documentation
├── views/                         # Handlebars templates
│   ├── header.handlebars          # Common header, meta tags & Bootstrap navigation
│   ├── footer.handlebars          # Common footer & script bundle
│   ├── index.handlebars           # Landing page wrapper
│   ├── start_form.handlebars      # Player registration form & gesture preview showcase
│   ├── start.handlebars           # Main Game Screen with Camera HUD & Prediction meters
│   └── scoreboard.handlebars      # MoveMakers Leaderboard table
└── public/                        # Static web assets
    ├── audio/
    │   ├── bell.mp3               # Success chime
    │   ├── error.mp3              # Incorrect pose alert
    │   └── jinglebells.mp3        # Victory celebration music
    ├── css/
    │   ├── app.css                # Base stylesheet
    │   └── cover.css              # Dark theme & Camera HUD styling
    ├── js/
    │   └── model.js               # Teachable Machine inference & HUD game loop
    └── images/
        └── quiet_down.jpg         # Pose reference asset
```

### Machine Learning Specifications
- **Framework**: `@teachablemachine/pose` v0.8.6 + `@tensorflow/tfjs` v1.3.1
- **Model URL**: `https://teachablemachine.withgoogle.com/models/C8EwO48qN/`
- **Architecture**: MobileNetV1 PoseNet with 17 body keypoints (output stride 16, input resolution 257)
- **Classes**: `Hungry`, `ISeeYou`, `QuietDown`, `GetBusy`
- **Inference Engine**: Client-side WebGL / Canvas execution at 30+ FPS

---

## 🛠️ Quickstart (Running Locally)

### Prerequisites
- Node.js 18+ (Node.js 22 recommended)
- npm

### Installation
```bash
git clone https://github.com/MichaelCDavids/MoveMakers.git
cd MoveMakers
npm install
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## 📡 API Routes

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | Redirects to `/index` |
| `GET` | `/index` | Renders Home landing page & player registration form |
| `POST` | `/add/player` | Registers player `{ name, age }` and redirects to `/start` |
| `GET` | `/start` | Launches the Camera HUD & Teachable Machine Pose challenge |
| `GET` | `/scoreboard` | Displays the MoveMakers leaderboard |
| `GET` | `/api/players` | Returns JSON array of all registered players and scores |
| `POST` | `/api/score` | Records score progress `{ playerId, score }` |

---

## 📤 Pushing Changes to Your GitHub Repository

To push the updated codebase to your repository (**[MichaelCDavids/MoveMakers](https://github.com/MichaelCDavids/MoveMakers)**):

```bash
# 1. Initialize git (if not already initialized)
git init

# 2. Add remote origin
git remote add origin https://github.com/MichaelCDavids/MoveMakers.git

# 3. Stage all files
git add .

# 4. Commit changes
git commit -m "Enhance Camera HUD, add probability meters, modernize Express Handlebars architecture"

# 5. Push to your master branch
git branch -M master
git push -u origin master
```

*(Note: When pushing, use your GitHub Personal Access Token or SSH key for authentication).*

---

## 👥 Credits

- **Hurley Surf Coders**:
  - Michael C Davids ([@MichaelCDavids](https://github.com/MichaelCDavids))
  - Phumlani Arendse ([@PhumlaniDev](https://github.com/PhumlaniDev))
  - Sesethu
- **projectcodeX** December Hackathon
- **Google Teachable Machine** Community Libraries
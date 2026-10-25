import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import handlebars from 'handlebars';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

// In-memory player database (replaces PostgreSQL from Java JDBI)
const playerList = [
  { playerId: 1, playerName: 'Michael', playerAge: 24, score: 4 },
  { playerId: 2, playerName: 'Phumlani', playerAge: 22, score: 4 },
  { playerId: 3, playerName: 'Sesethu', playerAge: 21, score: 3 },
];
let nextPlayerId = 4;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Configure Handlebars view rendering
const viewsDir = path.join(__dirname, 'views');

// Pre-register all Handlebars partials
function registerAllPartials() {
  if (!fs.existsSync(viewsDir)) return;
  const files = fs.readdirSync(viewsDir);
  files.forEach(file => {
    if (file.endsWith('.handlebars')) {
      const content = fs.readFileSync(path.join(viewsDir, file), 'utf8');
      // Register with exact filename and without extension
      handlebars.registerPartial(file, content);
      handlebars.registerPartial(file.replace('.handlebars', ''), content);
    }
  });
}
registerAllPartials();

// Custom render function matching Spark Java: render(model, templatePath)
function renderTemplate(templateName, data = {}) {
  const filePath = path.join(viewsDir, templateName.endsWith('.handlebars') ? templateName : `${templateName}.handlebars`);
  const templateSource = fs.readFileSync(filePath, 'utf8');
  const compiled = handlebars.compile(templateSource);
  return compiled(data);
}

// Routes matching Java Spark App.java
app.get('/', (req, res) => {
  res.redirect('/index');
});

app.get('/index', (req, res) => {
  const html = renderTemplate('index.handlebars', { activeHome: true });
  res.send(html);
});

app.post('/add/player', (req, res) => {
  const name = (req.body.name || 'Anonymous').trim();
  const age = parseInt(req.body.age, 10) || 0;
  
  const newPlayer = {
    playerId: nextPlayerId++,
    playerName: name,
    playerAge: age,
    score: 0
  };
  playerList.push(newPlayer);
  console.log(`[MoveMakers] Added player: ${name}, age: ${age}`);
  
  res.redirect('/start');
});

app.get('/start', (req, res) => {
  const html = renderTemplate('start.handlebars', { activePlay: true });
  res.send(html);
});

app.get('/scoreboard', (req, res) => {
  const html = renderTemplate('scoreboard.handlebars', {
    activeScoreboard: true,
    playerList: [...playerList].reverse(),
  });
  res.send(html);
});

// JSON API routes
app.get('/api/players', (req, res) => {
  res.json(playerList);
});

app.post('/api/score', (req, res) => {
  const { playerId, score } = req.body;
  const p = playerList.find(x => x.playerId === playerId);
  if (p) {
    p.score = (p.score || 0) + (score || 1);
  }
  res.json({ success: true, playerList });
});

app.listen(PORT, HOST, () => {
  console.log(`[MoveMakers] Server listening on http://${HOST}:${PORT}`);
});

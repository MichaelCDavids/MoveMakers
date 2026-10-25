import express from 'express';
import { engine } from 'express-handlebars';
import pkg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const { Pool } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Initialize Express FIRST
const app = express();
const PORT = process.env.PORT || 3000;

// 2. Configure Handlebars View Engine
app.engine('.handlebars', engine({ 
    extname: '.handlebars',
    defaultLayout: false,
    layoutsDir: path.join(__dirname, 'views'),
    partialsDir: path.join(__dirname, 'views') 
}));
app.set('view engine', '.handlebars');
app.set('views', path.join(__dirname, 'views'));

// PostgreSQL Connection Pool (Render requires SSL)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('Connected to Render PostgreSQL database successfully!');
});

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Home / Start Page Route
app.get('/', (req, res) => {
    res.render('index', { title: 'MoveMakers - Registration' });
});

app.get('/start', (req, res) => {
    res.render('start', { title: 'MoveMakers - Game' });
});

// 2. Player Registration Route (Handles POST from start form)
app.post('/add/player', async (req, res) => {
    try {
        const { name, age } = req.body;
        console.log(`[DB] Registering player -> Name: ${name}, Age: ${age}`);
        
        const query = `
            INSERT INTO Player (player_name, player_age, score, created_at) 
            VALUES ($1, $2, $3, NOW()) 
            RETURNING *;
        `;
        const values = [name, parseInt(age, 10), 0];
        const result = await pool.query(query, values);
        const newPlayer = result.rows[0];

        console.log('[DB] Player successfully saved:', newPlayer);

        // Render game view (index) and pass the active player object
        res.render('start', { player: newPlayer });
    } catch (err) {
        console.error('Database error during player registration:', err);
        res.status(500).send('Internal Server Error: Unable to register player.');
    }
});

// 3. Update Player Score Route
app.post('/api/score', async (req, res) => {
    try {
        const { score } = req.body;
        
        // Update score for the most recent player session
        const query = `
            UPDATE Player 
            SET score = $1 
            WHERE player_id = (SELECT player_id FROM Player ORDER BY created_at DESC LIMIT 1) 
            RETURNING *;
        `;
        const result = await pool.query(query, [score]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'No active player found to update.' });
        }

        res.status(200).json({ success: true, player: result.rows[0] });
    } catch (err) {
        console.error('Database error updating score:', err);
        res.status(500).json({ error: 'Internal server error while saving score.' });
    }
});

// 4. Leaderboard / Scoreboard Route
app.get('/scoreboard', async (req, res) => {
    try {
        const query = `
            SELECT player_id AS "playerId", player_name AS "playerName", player_age AS "playerAge", score 
            FROM Player 
            ORDER BY score DESC, created_at ASC 
            LIMIT 10;
        `;
        const result = await pool.query(query);
        const playerList = result.rows;

        // Render the scoreboard template passing playerList
        res.render('scoreboard', { playerList });
    } catch (err) {
        console.error('Database error fetching scoreboard:', err);
        res.status(500).send('Internal Server Error: Unable to load leaderboard.');
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`MoveMakers server running at http://localhost:${PORT}`);
});
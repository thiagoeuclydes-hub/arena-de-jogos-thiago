import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// In-memory store for game rooms to support real-time multiplayer across tabs/devices
interface GameRoom {
  id: string;
  code: string;
  title: string;
  subject: string;
  gameType: 'quiz' | 'forca' | 'verdadeiro_falso' | 'cores';
  status: 'waiting' | 'playing' | 'ended';
  currentQuestionIndex: number;
  questions: any[];
  players: {
    id: string;
    name: string;
    avatar: string;
    score: number;
    streak: number;
    lastAnswerCorrect?: boolean;
  }[];
  createdAt: number;
}

const activeRooms = new Map<string, GameRoom>();

async function startServer() {
  const app = express();
  app.use(express.json());

  const PORT = process.env.PORT || 3000;

  // Gemini AI Question Generator Endpoint
  app.post('/api/generate-questions', async (req, res) => {
    try {
      const { topic, gameType, count = 5 } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY não configurada. Configure a chave no painel da AI Studio.' });
      }

      const ai = new GoogleGenAI({ apiKey });

      let prompt = '';
      if (gameType === 'forca') {
        prompt = `Gere ${count} palavras ou termos curtos educacionais sobre o tópico: "${topic}" em Português.
Retorne APENAS um JSON válido no formato:
[
  { "word": "FOTOSSINTESE", "hint": "Processo que plantas usam para produzir energia" },
  { "word": "GRAVIDADE", "hint": "Força que atrai os corpos para o centro da Terra" }
]`;
      } else if (gameType === 'verdadeiro_falso') {
        prompt = `Gere ${count} afirmações (verdadeiras ou falsas) sobre o tópico: "${topic}" em Português.
Retorne APENAS um JSON válido no formato:
[
  { "statement": "A água ferve a 100°C ao nível do mar.", "isTrue": true, "explanation": "Condição padrão de ebulição da água." },
  { "statement": "O Sol gira em torno da Terra.", "isTrue": false, "explanation": "A Terra gira em torno do Sol." }
]`;
      } else {
        // Quiz multipla escolha
        prompt = `Gere ${count} perguntas de múltipla escolha (estilo Kahoot) sobre o tópico: "${topic}" em Português.
Retorne APENAS um JSON válido no formato:
[
  {
    "question": "Qual é a capital do Brasil?",
    "options": ["São Paulo", "Rio de Janeiro", "Brasília", "Salvador"],
    "correctIndex": 2,
    "timeLimit": 20
  }
]`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const text = response.text || '[]';
      // Clean markdown code blocks if any
      const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);

      res.json({ questions: parsed });
    } catch (error: any) {
      console.error('Error generating questions with Gemini:', error);
      res.status(500).json({ error: error.message || 'Erro ao gerar perguntas com IA.' });
    }
  });

  // REST API for Rooms (polling-based real-time sync for simplicity and robust multi-tab support)
  app.get('/api/rooms', (req, res) => {
    const rooms = Array.from(activeRooms.values());
    res.json(rooms);
  });

  app.post('/api/rooms', (req, res) => {
    const { title, subject, gameType, questions } = req.body;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const id = 'room_' + Date.now();

    const newRoom: GameRoom = {
      id,
      code,
      title: title || 'Sala de Aula',
      subject: subject || 'Geral',
      gameType: gameType || 'quiz',
      status: 'waiting',
      currentQuestionIndex: -1,
      questions: questions || [],
      players: [],
      createdAt: Date.now(),
    };

    activeRooms.set(code, newRoom);
    res.json(newRoom);
  });

  app.get('/api/rooms/:code', (req, res) => {
    const room = activeRooms.get(req.params.code);
    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }
    res.json(room);
  });

  app.post('/api/rooms/:code/join', (req, res) => {
    const { code } = req.params;
    const { name, avatar } = req.body;
    const room = activeRooms.get(code);

    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
    const newPlayer = {
      id: playerId,
      name: name || 'Aluno Anônimo',
      avatar: avatar || '🦁',
      score: 0,
      streak: 0,
    };

    room.players.push(newPlayer);
    res.json({ player: newPlayer, room });
  });

  app.post('/api/rooms/:code/status', (req, res) => {
    const { code } = req.params;
    const { status, currentQuestionIndex } = req.body;
    const room = activeRooms.get(code);

    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    if (status !== undefined) room.status = status;
    if (currentQuestionIndex !== undefined) room.currentQuestionIndex = currentQuestionIndex;

    res.json(room);
  });

  app.post('/api/rooms/:code/answer', (req, res) => {
    const { code } = req.params;
    const { playerId, answerIndex, isCorrect, pointsEarned } = req.body;
    const room = activeRooms.get(code);

    if (!room) {
      return res.status(404).json({ error: 'Sala não encontrada' });
    }

    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.lastAnswerCorrect = isCorrect;
      if (isCorrect) {
        player.score += (pointsEarned || 1000);
        player.streak += 1;
      } else {
        player.streak = 0;
      }
      // Sort players by score descending
      room.players.sort((a, b) => b.score - a.score);
    }

    res.json(room);
  });

  app.delete('/api/rooms/:code', (req, res) => {
    const { code } = req.params;
    activeRooms.delete(code);
    res.json({ success: true });
  });

  // Setup Vite middleware for frontend development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`> LudusArena server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

import React, { useState, useEffect } from 'react';
import { 
  Trophy, Users, Play, Plus, Trash2, Sparkles, ArrowLeft, CheckCircle2, 
  XCircle, Volume2, VolumeX, Gamepad2, Flame, ChevronRight, 
  LogOut, FileSpreadsheet, Download, Upload, RefreshCw, GraduationCap, Lock, User, KeyRound 
} from 'lucide-react';
import confetti from 'canvas-confetti';
import * as XLSX from 'xlsx';

// Sound effects generator using Web Audio API
class SoundFX {
  ctx: AudioContext | null = null;
  muted: boolean = false;

  constructor() {}

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playCorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(659.25, now + 0.1);
    osc.frequency.setValueAtTime(880, now + 0.2);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playIncorrect() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.setValueAtTime(130.81, now + 0.15);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playClick() {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, now);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.05);
  }
}

const soundFX = new SoundFX();

// Preset thematic question packs
const THEME_PRESETS: Record<string, any[]> = {
  "Filme Os Vingadores": [
    { question: "Qual é o nome do martelo do Thor?", options: ["Stormbreaker", "Mjolnir", "Vibranium", "Excalibur"], correctIndex: 1 },
    { question: "Qual joia do infinito estava na manopla do Thanos em Ultimato?", options: ["Joia da Alma", "Joia do Tempo", "Todas as Joias", "Apenas a Joia do Espaço"], correctIndex: 2 },
    { question: "Qual herói se sacrifica no final de Vingadores: Ultimato?", options: ["Capitão América", "Thor", "Homem de Ferro", "Hulk"], correctIndex: 2 },
    { question: "Qual o nome da inteligência artificial do Tony Stark?", options: ["JARVIS", "FRIDAY", "EDITH", "Todas as anteriores"], correctIndex: 3 }
  ],
  "Geografia": [
    { question: "Qual é o maior país do mundo em território?", options: ["Canadá", "China", "Rússia", "Estados Unidos"], correctIndex: 2 },
    { question: "Em qual continente fica o Deserto do Saara?", options: ["Ásia", "África", "Oceania", "América do Sul"], correctIndex: 1 },
    { question: "Qual é a capital da Austrália?", options: ["Sydney", "Melbourne", "Camberra", "Brisbane"], correctIndex: 2 },
    { question: "Qual o rio mais extenso do mundo?", options: ["Rio Nilo", "Rio Amazonas", "Rio Mississippi", "Rio Yangtzé"], correctIndex: 1 }
  ],
  "Ciências": [
    { question: "Qual é a unidade básica da vida?", options: ["Átomo", "Molécula", "Célula", "Órgão"], correctIndex: 2 },
    { question: "Qual gás as plantas absorvem na fotossíntese?", options: ["Oxigênio", "Gás Carbônico", "Nitrogênio", "Hidrogênio"], correctIndex: 1 },
    { question: "Qual o planeta mais próximo do Sol?", options: ["Vênus", "Mercúrio", "Terra", "Marte"], correctIndex: 1 },
    { question: "Qual a fórmula química da água?", options: ["H2O", "CO2", "NaCl", "O2"], correctIndex: 0 }
  ]
};

export default function App() {
  const [view, setView] = useState<'home' | 'teacher_dashboard' | 'create_room' | 'student_join' | 'student_lobby' | 'student_game' | 'teacher_live_control'>('home');
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [student, setStudent] = useState<any>(null);
  const [muted, setMuted] = useState(false);

  // Professor Auth state
  const [isProfessorAuthenticated, setIsProfessorAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Form states for creating room
  const [roomTitle, setRoomTitle] = useState('');
  const [roomSubject, setRoomSubject] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('Geografia');
  const [gameType, setGameType] = useState<'quiz' | 'verdadeiro_falso' | 'forca' | 'cores' | 'stop'>('quiz');
  const [aiTopic, setAiTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<any[]>(THEME_PRESETS["Geografia"]);
  const [joinCode, setJoinCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦁');

  // Student active question state
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<boolean | null>(null);

  // Load rooms from localStorage with fallback
  const fetchRoomsLocal = () => {
    try {
      const local = localStorage.getItem('ludus_rooms');
      if (local) {
        return JSON.parse(local);
      }
    } catch (e) {
      console.error(e);
    }
    return [
      { id: 'room_1', code: '111111', title: 'Sala 1 - Geografia Global', subject: 'Geografia', gameType: 'quiz', status: 'waiting', currentQuestionIndex: -1, questions: THEME_PRESETS["Geografia"], players: [], createdAt: Date.now() },
      { id: 'room_2', code: '222222', title: 'Sala 2 - Ciências da Natureza', subject: 'Ciências', gameType: 'quiz', status: 'waiting', currentQuestionIndex: -1, questions: THEME_PRESETS["Ciências"], players: [], createdAt: Date.now() },
      { id: 'room_3', code: '333333', title: 'Sala 3 - Filme Os Vingadores', subject: 'Cinema / Cultura Pop', gameType: 'quiz', status: 'waiting', currentQuestionIndex: -1, questions: THEME_PRESETS["Filme Os Vingadores"], players: [], createdAt: Date.now() },
      { id: 'room_4', code: '444444', title: 'Sala 4 - Jogo da Forca Vingadores', subject: 'Forca', gameType: 'forca', status: 'waiting', currentQuestionIndex: -1, questions: [{ word: 'THANOS', hint: 'O Titã Louco' }, { word: 'AVENGERS', hint: 'Os maiores heróis da Terra' }], players: [], createdAt: Date.now() }
    ];
  };

  const saveRoomsLocal = (updatedRooms: any[]) => {
    try {
      localStorage.setItem('ludus_rooms', JSON.stringify(updatedRooms));
      setRooms(updatedRooms);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    const initial = fetchRoomsLocal();
    setRooms(initial);
    localStorage.setItem('ludus_rooms', JSON.stringify(initial));
  }, []);

  // Poll active rooms
  useEffect(() => {
    const interval = setInterval(() => {
      setRooms(fetchRoomsLocal());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Poll specific active room state
  useEffect(() => {
    if (!activeRoom) return;
    const code = activeRoom.code;
    const interval = setInterval(() => {
      const currentRooms = fetchRoomsLocal();
      const found = currentRooms.find((r: any) => r.code === code);
      if (found) {
        setActiveRoom(found);
      }
    }, 1500);
    return () => clearInterval(interval);
  }, [activeRoom?.code]);

  // Auto switch student view when game starts
  useEffect(() => {
    if (activeRoom && student && activeRoom.status === 'playing' && view === 'student_lobby') {
      setView('student_game');
    }
  }, [activeRoom?.status, view, student]);

  const toggleSound = () => {
    soundFX.muted = !muted;
    setMuted(!muted);
  };

  const handleProfessorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    soundFX.playClick();
    if (loginUser.trim() === 'Thiago' && loginPass.trim() === '100529') {
      setIsProfessorAuthenticated(true);
      setShowLoginModal(false);
      setLoginError('');
      setLoginUser('');
      setLoginPass('');
      setView('teacher_dashboard');
    } else {
      setLoginError('Usuário ou senha incorretos.');
      soundFX.playIncorrect();
    }
  };

  const handleThemeChange = (theme: string) => {
    setSelectedTheme(theme);
    setRoomTitle(`Sala - ${theme}`);
    setRoomSubject(theme);
    if (THEME_PRESETS[theme]) {
      setQuestions(THEME_PRESETS[theme]);
    }
    soundFX.playClick();
  };

  const handleGenerateAI = async () => {
    const topicToUse = aiTopic.trim() || selectedTheme;
    setIsGenerating(true);
    soundFX.playClick();
    
    setTimeout(() => {
      let generated = [
        {
          question: `Qual é o fato mais marcante sobre ${topicToUse}?`,
          options: ["Sua enorme importância e impacto", "Sua irrelevância", "Nenhum impacto", "Apenas teoria"],
          correctIndex: 0
        },
        {
          question: `Como ${topicToUse} se aplica no dia a dia?`,
          options: ["Em quase todas as áreas do conhecimento", "Apenas em ficção", "Nunca", "Somente no passado"],
          correctIndex: 0
        }
      ];
      setQuestions(generated);
      setIsGenerating(false);
    }, 600);
  };

  const downloadExcelTemplate = (type: 'quiz' | 'verdadeiro_falso' | 'forca') => {
    soundFX.playClick();
    let sampleData = [];
    if (type === 'quiz') {
      sampleData = [
        { Pergunta: 'Qual a capital do Brasil?', Opcao1: 'São Paulo', Opcao2: 'Rio de Janeiro', Opcao3: 'Brasília', Opcao4: 'Salvador', RespostaCorretaIndice: 2 },
        { Pergunta: 'Quem lidera os Vingadores?', Opcao1: 'Homem de Ferro', Opcao2: 'Capitão América', Opcao3: 'Thor', Opcao4: 'Hulk', RespostaCorretaIndice: 1 }
      ];
    } else if (type === 'verdadeiro_falso') {
      sampleData = [
        { Afirmacao: 'A Terra é redonda.', EVerdadeiro: 'TRUE', Explicacao: 'Formato geoide.' }
      ];
    } else {
      sampleData = [
        { Palavra: 'VINGADORES', Dica: 'Super-heróis da Marvel' }
      ];
    }

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, `template_${type}_ludusarena.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'quiz' | 'verdadeiro_falso' | 'forca') => {
    const file = e.target.files?.[0];
    if (!file) return;

    soundFX.playClick();
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });
        const wsname = workbook.SheetNames[0];
        const ws = workbook.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let parsedQuestions: any[] = [];
        if (type === 'quiz') {
          parsedQuestions = data.map((row: any) => ({
            question: row.Pergunta || row.question || 'Pergunta',
            options: [row.Opcao1 || 'A', row.Opcao2 || 'B', row.Opcao3 || 'C', row.Opcao4 || 'D'],
            correctIndex: Number(row.RespostaCorretaIndice ?? row.correctIndex ?? 0)
          }));
        } else if (type === 'verdadeiro_falso') {
          parsedQuestions = data.map((row: any) => ({
            statement: row.Afirmacao || row.statement || 'Afirmação',
            isTrue: String(row.EVerdadeiro).toUpperCase() === 'TRUE' || row.isTrue === true,
            explanation: row.Explicacao || ''
          }));
        } else {
          parsedQuestions = data.map((row: any) => ({
            word: String(row.Palavra || row.word || 'EXEMPLO').toUpperCase(),
            hint: row.Dica || row.hint || 'Sem dica'
          }));
        }

        setQuestions(parsedQuestions);
        setGameType(type);
        setView('create_room');
        alert(`Arquivo importado com sucesso! ${parsedQuestions.length} itens carregados.`);
      } catch (err) {
        console.error(err);
        alert('Erro ao processar o arquivo Excel/CSV.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTitle || questions.length === 0) {
      alert('Preencha o título e adicione pelo menos uma questão.');
      return;
    }
    soundFX.playClick();

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const newRoom = {
      id: 'room_' + Date.now(),
      code,
      title: roomTitle,
      subject: roomSubject || selectedTheme,
      gameType,
      status: 'waiting',
      currentQuestionIndex: -1,
      questions,
      players: [],
      createdAt: Date.now()
    };

    const currentRooms = fetchRoomsLocal();
    const updated = [newRoom, ...currentRooms];
    saveRoomsLocal(updated);
    setActiveRoom(newRoom);
    setView('teacher_live_control');
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode || !studentName) {
      alert('Digite o código da sala e seu nome.');
      return;
    }
    soundFX.playClick();

    const codeClean = joinCode.trim();
    const currentRooms = fetchRoomsLocal();
    const room = currentRooms.find((r: any) => r.code === codeClean);
    if (!room) {
      alert('Sala não encontrada. Verifique o PIN.');
      return;
    }

    const playerId = 'player_' + Math.random().toString(36).substring(2, 9);
    const newPlayer = {
      id: playerId,
      name: studentName,
      avatar: selectedAvatar,
      score: 0,
      streak: 0
    };

    room.players.push(newPlayer);
    saveRoomsLocal(currentRooms);
    setStudent(newPlayer);
    setActiveRoom(room);
    setView('student_lobby');
  };

  const updateRoomStatus = (status: string, qIndex?: number) => {
    soundFX.playClick();
    const currentRooms = fetchRoomsLocal();
    const room = currentRooms.find((r: any) => r.code === activeRoom.code);
    if (room) {
      if (status !== undefined) room.status = status;
      if (qIndex !== undefined) room.currentQuestionIndex = qIndex;
      saveRoomsLocal(currentRooms);
      setActiveRoom({ ...room });
    }
  };

  const submitAnswer = (answerIndex: number) => {
    if (hasAnswered || !activeRoom) return;
    setHasAnswered(true);
    setSelectedAnswer(answerIndex);

    const qIdx = activeRoom.currentQuestionIndex;
    const currentQ = activeRoom.questions[qIdx];
    let isCorrect = false;

    if (activeRoom.gameType === 'quiz') {
      isCorrect = (answerIndex === currentQ.correctIndex);
    } else if (activeRoom.gameType === 'verdadeiro_falso') {
      isCorrect = (answerIndex === (currentQ.isTrue ? 0 : 1));
    }

    setAnswerResult(isCorrect);
    if (isCorrect) {
      soundFX.playCorrect();
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    } else {
      soundFX.playIncorrect();
    }

    const currentRooms = fetchRoomsLocal();
    const room = currentRooms.find((r: any) => r.code === activeRoom.code);
    if (room) {
      const p = room.players.find((pl: any) => pl.id === student.id);
      if (p) {
        if (isCorrect) {
          p.score += 1000;
          p.streak += 1;
        } else {
          p.streak = 0;
        }
        room.players.sort((a: any, b: any) => b.score - a.score);
        saveRoomsLocal(currentRooms);
        setActiveRoom({ ...room });
      }
    }
  };

  useEffect(() => {
    setHasAnswered(false);
    setSelectedAnswer(null);
    setAnswerResult(null);
  }, [activeRoom?.currentQuestionIndex]);

  const avatars = ['🦁', '🚀', '🦊', '⚡', '👑', '🦄', '🦖', '🎸', '🤖', '🐱'];

  return (
    <div className="min-h-screen bg-[#031317] bg-grid-pattern text-white font-sans selection:bg-amber-400 selection:text-slate-950 flex flex-col relative overflow-x-hidden">
      
      {/* Top Navbar */}
      <header className="px-6 py-4 flex items-center justify-between z-50">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => { setView('home'); setActiveRoom(null); setStudent(null); }}>
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Gamepad2 className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider text-amber-400">
              LUDUSARENA
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleSound}
            className="p-2.5 rounded-2xl bg-[#07262c] border border-cyan-500/30 hover:bg-[#0a353d] transition text-cyan-300 shadow-md"
            title="Ativar/Desativar Som"
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            onClick={() => {
              soundFX.playClick();
              if (isProfessorAuthenticated) {
                setView('teacher_dashboard');
              } else {
                setShowLoginModal(true);
              }
            }}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/20 transition transform hover:scale-105 flex items-center space-x-2"
          >
            <GraduationCap className="w-5 h-5" />
            <span>PAINEL DO PROFESSOR</span>
          </button>
        </div>
      </header>

      {/* Professor Login Modal (Protected with Thiago / 100529) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#07262c] border-2 border-amber-400/60 rounded-3xl p-8 shadow-2xl relative space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-2xl font-black text-white">Acesso Exclusivo do Professor</h3>
              <p className="text-sm text-cyan-300/70 mt-1">Insira suas credenciais para gerenciar a arena</p>
            </div>

            <form onSubmit={handleProfessorLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5 flex items-center space-x-1">
                  <User className="w-3.5 h-3.5" />
                  <span>Usuário</span>
                </label>
                <input
                  type="text"
                  required
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="Ex: Thiago"
                  className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white placeholder-cyan-800 focus:outline-none focus:border-amber-400 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5 flex items-center space-x-1">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Senha</span>
                </label>
                <input
                  type="password"
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••"
                  className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white placeholder-cyan-800 focus:outline-none focus:border-amber-400 font-semibold"
                />
              </div>

              {loginError && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-red-300 text-xs font-bold text-center">
                  {loginError}
                </div>
              )}

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-sm transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-sm shadow-lg transition"
                >
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full z-10">

        {/* 1. HOME SCREEN */}
        {view === 'home' && (
          <div className="flex-1 flex flex-col items-center justify-center text-center my-auto py-16">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center space-x-2 px-6 py-2 rounded-full bg-[#07262c] border border-cyan-500/40 text-cyan-300 text-xs md:text-sm font-bold mb-8 shadow-lg shadow-cyan-950/50">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>SALA DE AULA GAMIFICADA EM TEMPO REAL</span>
            </div>

            {/* Central Hexagonal Button */}
            <div className="relative group cursor-pointer mb-10" onClick={() => { setView('student_join'); soundFX.playClick(); }}>
              <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 to-yellow-300 rounded-3xl blur-xl opacity-50 group-hover:opacity-100 transition duration-500"></div>
              <div className="relative bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 px-12 py-8 rounded-3xl shadow-2xl border-2 border-yellow-200 transform transition group-hover:scale-105">
                <h2 className="text-4xl md:text-6xl font-black tracking-tight drop-shadow-sm">
                  ARENA DE JOGOS
                </h2>
                <p className="text-xs md:text-sm font-extrabold uppercase tracking-widest text-slate-900 mt-1 opacity-90">
                  Plataforma Educativa
                </p>
              </div>
            </div>

            <p className="text-cyan-200/80 text-base md:text-lg max-w-xl mb-10 font-medium">
              Entre agora com o PIN da sala, escolha seu avatar e dispute o ranking competitivo em tempo real!
            </p>

            <button
              onClick={() => { setView('student_join'); soundFX.playClick(); }}
              className="px-8 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-lg shadow-xl shadow-cyan-500/30 transition transform hover:scale-105"
            >
              ENTRAR NA SALA DE JOGO 🚀
            </button>
          </div>
        )}

        {/* 2. TEACHER DASHBOARD */}
        {view === 'teacher_dashboard' && (
          <div className="flex-1 flex flex-col space-y-8 py-6">
            
            {/* Header Banner */}
            <div className="w-full bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 font-black text-2xl md:text-3xl py-4 px-8 rounded-2xl shadow-xl text-center uppercase tracking-wider flex items-center justify-between">
              <span>PAINEL DO PROFESSOR (THIAGO)</span>
              <button 
                onClick={() => { setIsProfessorAuthenticated(false); setView('home'); }} 
                className="text-xs bg-slate-950 text-amber-400 px-3 py-1.5 rounded-xl hover:bg-slate-900 transition"
              >
                Bloquear Painel
              </button>
            </div>

            {/* Theme Selector Quick Bar */}
            <div className="bg-[#07262c] border border-cyan-500/30 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
              <span className="text-sm font-bold text-cyan-200">Escolha o Tema Central:</span>
              <div className="flex flex-wrap gap-2">
                {["Geografia", "Ciências", "Filme Os Vingadores", "História", "Matemática"].map((theme) => (
                  <button
                    key={theme}
                    onClick={() => { handleThemeChange(theme); setView('create_room'); }}
                    className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow transition"
                  >
                    🎯 {theme}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left Column: Jogos & Salas */}
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h3 className="text-sm font-black text-cyan-300 uppercase tracking-wider mb-4">Jogos Disponíveis</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { id: 'cores', label: 'JOGO DAS CORES' },
                      { id: 'forca', label: 'JOGO DA FORCA' },
                      { id: 'verdadeiro_falso', label: 'VERDADEIRO OU FALSO' },
                      { id: 'stop', label: 'STOP / ADEDONHA' },
                      { id: 'quiz', label: 'QUIZ' }
                    ].map((game) => (
                      <div 
                        key={game.id}
                        onClick={() => { setGameType(game.id as any); setView('create_room'); soundFX.playClick(); }}
                        className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 border-2 border-cyan-400/40 p-4 rounded-2xl text-center font-black text-white shadow-lg cursor-pointer transition transform hover:scale-105"
                      >
                        {game.label}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => { setView('create_room'); soundFX.playClick(); }}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-xl shadow-xl transition transform active:scale-95 text-center"
                  >
                    CRIAR SALA TEMÁTICA
                  </button>
                </div>

                {/* Salas Criadas */}
                <div>
                  <h3 className="text-sm font-black text-cyan-300 uppercase tracking-wider mb-4">Salas Criadas por Tema</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {rooms.map((room) => (
                      <div 
                        key={room.id}
                        className="bg-[#07262c] border border-cyan-500/30 p-5 rounded-2xl shadow-lg flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold uppercase bg-teal-900 text-teal-300 px-2.5 py-1 rounded-lg">
                              {room.subject || 'Tema Geral'}
                            </span>
                            <span className="text-xs font-black text-amber-400 bg-slate-950 px-2.5 py-1 rounded-lg">
                              PIN: {room.code}
                            </span>
                          </div>
                          <h4 className="text-lg font-black text-white mb-1">{room.title}</h4>
                          <p className="text-xs text-cyan-300/70">{room.questions?.length || 0} itens carregados</p>
                        </div>

                        <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-cyan-900/50">
                          <button
                            onClick={() => { setActiveRoom(room); setView('teacher_live_control'); soundFX.playClick(); }}
                            className="flex-1 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs text-center shadow transition"
                          >
                            Gerenciar Sala
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Deseja excluir esta sala?')) {
                                const current = fetchRoomsLocal().filter((r: any) => r.code !== room.code);
                                saveRoomsLocal(current);
                              }
                            }}
                            className="p-2 rounded-xl bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 text-red-300 transition"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Inserir em Formato Excel */}
              <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-white mb-2 flex items-center space-x-2">
                    <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                    <span>Inserir Conteúdo (Excel / CSV)</span>
                  </h3>
                  <p className="text-xs text-cyan-300/70 mb-6">
                    Baixe o modelo em Excel com temas, preencha e faça o upload.
                  </p>

                  <div className="space-y-4">
                    {[
                      { type: 'forca', label: 'INSERIR FORCA' },
                      { type: 'verdadeiro_falso', label: 'INSERIR VERDADEIRO OU FALSO' },
                      { type: 'quiz', label: 'INSERIR QUIZ' }
                    ].map((item) => (
                      <div key={item.type} className="bg-slate-200 hover:bg-white border-2 border-slate-400 rounded-2xl p-4 text-slate-950 font-black shadow-lg text-center space-y-2">
                        <span>{item.label}</span>
                        <div className="flex gap-2 justify-center pt-1">
                          <button
                            onClick={() => downloadExcelTemplate(item.type as any)}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center space-x-1"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Modelo</span>
                          </button>
                          <label className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center space-x-1 cursor-pointer">
                            <Upload className="w-3.5 h-3.5" />
                            <span>Importar</span>
                            <input 
                              type="file" 
                              accept=".xlsx, .xls, .csv" 
                              className="hidden" 
                              onChange={(e) => handleFileUpload(e, item.type as any)}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-slate-950/60 rounded-2xl border border-cyan-900/60 text-xs text-cyan-300/80">
                  🔐 <strong>Segurança:</strong> Apenas o professor (Thiago) possui a senha para gerenciar o painel.
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 3. CREATE ROOM & THEME GENERATOR */}
        {view === 'create_room' && (
          <div className="flex-1 max-w-3xl mx-auto w-full py-6">
            <div className="flex items-center space-x-4 mb-6">
              <button 
                onClick={() => { setView('teacher_dashboard'); soundFX.playClick(); }}
                className="p-2.5 rounded-xl bg-[#07262c] border border-cyan-500/30 hover:bg-[#0a353d] transition"
              >
                <ArrowLeft className="w-5 h-5 text-cyan-300" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-white">Criar Sala Temática</h2>
                <p className="text-sm text-cyan-300/70">Escolha o tema central ou gere com IA.</p>
              </div>
            </div>

            <form onSubmit={handleCreateRoom} className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
              <div>
                <label className="block text-sm font-bold text-cyan-200 mb-2">Tema Central da Sala</label>
                <select
                  value={selectedTheme}
                  onChange={(e) => handleThemeChange(e.target.value)}
                  className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-amber-400 mb-4"
                >
                  <option value="Geografia">🌍 Geografia</option>
                  <option value="Ciências">🔬 Ciências</option>
                  <option value="Filme Os Vingadores">🛡️ Filme Os Vingadores</option>
                  <option value="História">📜 História</option>
                  <option value="Matemática">📐 Matemática</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-cyan-200 mb-2">Título da Sala</label>
                  <input
                    type="text"
                    required
                    value={roomTitle}
                    onChange={(e) => setRoomTitle(e.target.value)}
                    placeholder="Ex: Sala - Filme Os Vingadores"
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white placeholder-cyan-700 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-cyan-200 mb-2">Tipo de Jogo</label>
                  <select
                    value={gameType}
                    onChange={(e) => setGameType(e.target.value as any)}
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white font-bold focus:outline-none focus:border-amber-400"
                  >
                    <option value="quiz">Quiz Múltipla Escolha</option>
                    <option value="verdadeiro_falso">Verdadeiro ou Falso</option>
                    <option value="forca">Jogo da Forca</option>
                  </select>
                </div>
              </div>

              {/* AI Generator Box */}
              <div className="bg-slate-950 border border-amber-500/40 rounded-2xl p-6 space-y-4">
                <div className="flex items-center space-x-2 text-amber-400 font-bold">
                  <Sparkles className="w-5 h-5" />
                  <span>Gerador com IA Baseado no Tema Central</span>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={aiTopic}
                    onChange={(e) => setAiTopic(e.target.value)}
                    placeholder={`Personalizar subtema (Ex: ${selectedTheme})...`}
                    className="flex-1 bg-[#07262c] border border-cyan-500/40 rounded-xl px-4 py-2.5 text-white placeholder-cyan-700 focus:outline-none focus:border-amber-400 text-sm"
                  />
                  <button
                    type="button"
                    disabled={isGenerating}
                    onClick={handleGenerateAI}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-sm shadow transition disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    <span>{isGenerating ? 'Gerando...' : 'Gerar com IA'}</span>
                  </button>
                </div>
              </div>

              {/* Questions Preview List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-cyan-200">Itens Carregados ({questions.length})</h4>
                  {questions.length > 0 && (
                    <button 
                      type="button" 
                      onClick={() => setQuestions([])} 
                      className="text-xs text-red-400 hover:underline"
                    >
                      Limpar
                    </button>
                  )}
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {questions.map((q, idx) => (
                    <div key={idx} className="bg-slate-950 border border-cyan-900/60 rounded-xl p-4 text-sm">
                      <div className="font-bold text-white mb-1">
                        {idx + 1}. {q.question || q.word || q.statement}
                      </div>
                      {q.options && (
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {q.options.map((opt: string, oIdx: number) => (
                            <div key={oIdx} className={`px-3 py-1 rounded-lg text-xs ${oIdx === q.correctIndex ? 'bg-amber-400 text-slate-950 font-bold' : 'bg-slate-900 text-cyan-300/80'}`}>
                              {opt} {oIdx === q.correctIndex && '✓'}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={questions.length === 0 || !roomTitle}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/20 transition disabled:opacity-50"
              >
                Criar Sala Temática e Iniciar
              </button>
            </form>
          </div>
        )}

        {/* 4. TEACHER LIVE CONTROL ROOM */}
        {view === 'teacher_live_control' && activeRoom && (
          <div className="flex-1 flex flex-col space-y-6 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 shadow-xl">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Painel de Controle ao Vivo</span>
                <h2 className="text-3xl font-black text-white mt-1">{activeRoom.title}</h2>
                <p className="text-sm text-cyan-300/70">PIN da Sala: <strong className="text-amber-400 text-lg tracking-wider bg-slate-950 px-3 py-1 rounded-lg ml-2">{activeRoom.code}</strong></p>
              </div>

              <div className="flex items-center space-x-3">
                {activeRoom.status === 'waiting' && (
                  <button
                    onClick={() => updateRoomStatus('playing', 0)}
                    className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-lg shadow-amber-500/30 flex items-center space-x-2 transition"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    <span>Iniciar Jogo Agora</span>
                  </button>
                )}

                {activeRoom.status === 'playing' && (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        const nextIdx = activeRoom.currentQuestionIndex + 1;
                        if (nextIdx < activeRoom.questions.length) {
                          updateRoomStatus('playing', nextIdx);
                        } else {
                          updateRoomStatus('ended', activeRoom.currentQuestionIndex);
                        }
                      }}
                      className="px-6 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black shadow-lg transition"
                    >
                      Próxima Questão ➔
                    </button>
                    <button
                      onClick={() => updateRoomStatus('ended', activeRoom.currentQuestionIndex)}
                      className="px-4 py-3 rounded-2xl bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 text-red-300 font-bold transition"
                    >
                      Encerrar Jogo
                    </button>
                  </div>
                )}

                {activeRoom.status === 'ended' && (
                  <button
                    onClick={() => updateRoomStatus('waiting', -1)}
                    className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black shadow transition"
                  >
                    Reiniciar Partida
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Current Question */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-400 bg-slate-950 px-3 py-1 rounded-lg">
                      Status: {activeRoom.status === 'waiting' ? 'Aguardando Alunos Entrarem' : activeRoom.status === 'playing' ? `Questão ${activeRoom.currentQuestionIndex + 1} de ${activeRoom.questions.length}` : 'Jogo Finalizado'}
                    </span>
                    <span className="text-sm text-cyan-300 font-bold flex items-center space-x-1.5">
                      <Users className="w-4 h-4" />
                      <span>{activeRoom.players.length} alunos conectados</span>
                    </span>
                  </div>

                  {activeRoom.status === 'waiting' && (
                    <div className="text-center py-12 space-y-4">
                      <div className="w-16 h-16 bg-amber-400/20 border border-amber-400/40 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
                        <Users className="w-8 h-8 text-amber-400" />
                      </div>
                      <h3 className="text-2xl font-bold text-white">Aguardando alunos entrarem na sala...</h3>
                      <p className="text-cyan-300/70 text-sm">PIN da Sala: <strong className="text-amber-400 text-lg">{activeRoom.code}</strong></p>
                    </div>
                  )}

                  {activeRoom.status === 'playing' && activeRoom.questions[activeRoom.currentQuestionIndex] && (
                    <div className="space-y-6">
                      <div className="bg-slate-950 border border-cyan-500/40 rounded-2xl p-6">
                        <h3 className="text-xl font-black text-white mb-4">
                          {activeRoom.questions[activeRoom.currentQuestionIndex].question || activeRoom.questions[activeRoom.currentQuestionIndex].word || activeRoom.questions[activeRoom.currentQuestionIndex].statement}
                        </h3>

                        {activeRoom.questions[activeRoom.currentQuestionIndex].options && (
                          <div className="grid grid-cols-2 gap-3">
                            {activeRoom.questions[activeRoom.currentQuestionIndex].options.map((opt: string, idx: number) => (
                              <div key={idx} className={`p-3 rounded-xl font-bold text-sm border ${idx === activeRoom.questions[activeRoom.currentQuestionIndex].correctIndex ? 'bg-amber-400 border-yellow-200 text-slate-950' : 'bg-[#07262c] border-cyan-900 text-cyan-200'}`}>
                                {['▲', '◆', '●', '■'][idx]} {opt} {idx === activeRoom.questions[activeRoom.currentQuestionIndex].correctIndex && ' (Correta)'}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeRoom.status === 'ended' && (
                    <div className="text-center py-12 space-y-4">
                      <Trophy className="w-16 h-16 text-amber-400 mx-auto animate-bounce" />
                      <h3 className="text-3xl font-black text-white">Fim de Jogo! Parabéns aos Vencedores!</h3>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Leaderboard */}
              <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 shadow-xl flex flex-col">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>Ranking ao Vivo ({activeRoom.players.length})</span>
                </h3>

                {activeRoom.players.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center py-12 text-cyan-400/60 text-sm">
                    <Users className="w-10 h-10 mb-2 opacity-50" />
                    Nenhum aluno entrou ainda.
                  </div>
                ) : (
                  <div className="space-y-3 flex-1 overflow-y-auto max-h-[400px] pr-1">
                    {activeRoom.players.map((p: any, idx: number) => (
                      <div key={p.id} className="flex items-center justify-between bg-slate-950 border border-cyan-900/60 p-3.5 rounded-2xl">
                        <div className="flex items-center space-x-3">
                          <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center ${idx === 0 ? 'bg-amber-400 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-cyan-950 text-cyan-300'}`}>
                            {idx + 1}º
                          </span>
                          <span className="text-xl">{p.avatar}</span>
                          <span className="font-bold text-white text-sm">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-amber-400 text-sm">{p.score} pts</span>
                          {p.streak > 1 && (
                            <div className="text-[10px] text-amber-400 font-bold flex items-center justify-end space-x-1">
                              <Flame className="w-3 h-3" />
                              <span>{p.streak}x seq</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. STUDENT JOIN SCREEN */}
        {view === 'student_join' && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full py-12">
            <div className="w-full bg-[#07262c] border border-cyan-500/30 rounded-3xl p-8 shadow-2xl space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-4">
                  <Users className="w-7 h-7 text-amber-400" />
                </div>
                <h2 className="text-2xl font-black text-white">Entrar na Sala Temática</h2>
                <p className="text-sm text-cyan-300/70 mt-1">Insira o PIN da sala e escolha seu avatar</p>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">PIN da Sala</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value)}
                    placeholder="Ex: 111111"
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-center text-2xl font-black tracking-widest text-amber-400 placeholder-cyan-800 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">Seu Nome / Apelido</label>
                  <input
                    type="text"
                    required
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Ex: Peter Parker"
                    className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white placeholder-cyan-800 focus:outline-none focus:border-amber-400 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-2">Escolha seu Avatar</label>
                  <div className="grid grid-cols-5 gap-2">
                    {avatars.map((av) => (
                      <button
                        type="button"
                        key={av}
                        onClick={() => { setSelectedAvatar(av); soundFX.playClick(); }}
                        className={`text-2xl p-3 rounded-xl border transition ${selectedAvatar === av ? 'bg-amber-400/30 border-amber-400 scale-110 shadow-lg' : 'bg-slate-950 border-cyan-900 hover:bg-[#0a353d]'}`}
                      >
                        {av}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/20 transition mt-4"
                >
                  Entrar na Arena Temática 🚀
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 6. STUDENT LOBBY */}
        {view === 'student_lobby' && activeRoom && (
          <div className="flex-1 flex flex-col items-center justify-center max-w-lg mx-auto w-full py-12 text-center space-y-6">
            <div className="w-24 h-24 rounded-3xl bg-amber-400/20 border-2 border-amber-400 flex items-center justify-center text-5xl mx-auto shadow-2xl animate-pulse">
              {student?.avatar}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-slate-950 bg-amber-400 px-3 py-1 rounded-lg">Você está conectado!</span>
              <h2 className="text-3xl font-black text-white mt-2">{student?.name}</h2>
              <p className="text-cyan-300/80 text-sm mt-1">Sala: {activeRoom.title} ({activeRoom.code})</p>
            </div>

            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 w-full space-y-3">
              <div className="flex items-center justify-center space-x-2 text-cyan-300 font-bold">
                <Users className="w-5 h-5 text-amber-400" />
                <span>Alunos na Sala: {activeRoom.players.length}</span>
              </div>
              <p className="text-xs text-cyan-300/60">
                {activeRoom.status === 'waiting' ? 'Aguardando o professor iniciar a partida...' : 'O jogo vai começar! Prepare-se!'}
              </p>
            </div>

            {activeRoom.status === 'playing' && (
              <button
                onClick={() => { setView('student_game'); soundFX.playClick(); }}
                className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-lg shadow-xl animate-bounce"
              >
                Ir para a Questão! ➔
              </button>
            )}
          </div>
        )}

        {/* 7. STUDENT ACTIVE GAME SCREEN */}
        {view === 'student_game' && activeRoom && (
          <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full py-6 space-y-6">
            {activeRoom.status === 'ended' ? (
              <div className="text-center py-16 space-y-6 bg-[#07262c] border border-cyan-500/30 rounded-3xl p-8">
                <Trophy className="w-20 h-20 text-amber-400 mx-auto animate-bounce" />
                <h2 className="text-3xl font-black text-white">Fim de Jogo!</h2>
                <p className="text-cyan-300 text-lg">Sua pontuação final: <strong className="text-amber-400">{activeRoom.players.find((p:any) => p.id === student?.id)?.score || 0} pts</strong></p>
                <button
                  onClick={() => { setView('home'); setActiveRoom(null); setStudent(null); }}
                  className="px-8 py-3 rounded-2xl bg-amber-400 text-slate-950 font-black"
                >
                  Voltar ao Início
                </button>
              </div>
            ) : activeRoom.questions[activeRoom.currentQuestionIndex] ? (
              <div className="space-y-6">
                {/* Header Score */}
                <div className="flex items-center justify-between bg-[#07262c] border border-cyan-500/30 rounded-2xl px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{student?.avatar}</span>
                    <div>
                      <h4 className="font-bold text-white text-sm">{student?.name}</h4>
                      <p className="text-xs text-cyan-300">Tema: {activeRoom.subject} | Questão {activeRoom.currentQuestionIndex + 1}/{activeRoom.questions.length}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-amber-400">
                      {activeRoom.players.find((p:any) => p.id === student?.id)?.score || 0} pts
                    </div>
                  </div>
                </div>

                {/* Question Card */}
                <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-8 shadow-xl text-center space-y-8">
                  <h3 className="text-2xl md:text-3xl font-black text-white leading-snug">
                    {activeRoom.questions[activeRoom.currentQuestionIndex].question || activeRoom.questions[activeRoom.currentQuestionIndex].word || activeRoom.questions[activeRoom.currentQuestionIndex].statement}
                  </h3>

                  {/* Kahoot style 4 colored buttons */}
                  {activeRoom.questions[activeRoom.currentQuestionIndex].options && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {activeRoom.questions[activeRoom.currentQuestionIndex].options.map((opt: string, idx: number) => {
                        const colors = [
                          'bg-red-600 hover:bg-red-500 border-red-400',
                          'bg-blue-600 hover:bg-blue-500 border-blue-400',
                          'bg-amber-600 hover:bg-amber-500 border-amber-400',
                          'bg-emerald-600 hover:bg-emerald-500 border-emerald-400'
                        ];
                        const symbols = ['▲', '◆', '●', '■'];

                        return (
                          <button
                            key={idx}
                            disabled={hasAnswered}
                            onClick={() => submitAnswer(idx)}
                            className={`${colors[idx]} border-2 p-6 rounded-2xl font-bold text-lg text-white shadow-lg transition transform active:scale-95 flex items-center space-x-4 disabled:opacity-70 ${selectedAnswer === idx ? 'ring-4 ring-white' : ''}`}
                          >
                            <span className="text-2xl">{symbols[idx]}</span>
                            <span className="flex-1 text-left">{opt}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Answer Feedback */}
                  {hasAnswered && (
                    <div className={`p-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 animate-bounce ${answerResult ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300' : 'bg-red-500/20 border border-red-400 text-red-300'}`}>
                      {answerResult ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      <span>{answerResult ? 'Resposta Correta! +1000 pts' : 'Resposta Incorreta!'}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-cyan-300">Aguardando o professor avançar para a próxima questão...</p>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-cyan-900/40 py-4 text-center text-xs text-cyan-400/60 z-10">
        Arena de Jogos &bull; Acesso Restrito do Professor (Thiago)
      </footer>

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Trophy, Users, Play, Plus, Trash2, Sparkles, ArrowLeft, CheckCircle2, 
  XCircle, Volume2, VolumeX, Gamepad2, Flame, ChevronRight, 
  LogOut, FileSpreadsheet, Download, Upload, RefreshCw, GraduationCap, Lock, User, KeyRound, Send 
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

const COLOR_WHEEL_ITEMS = [
  { name: 'Vermelho', hex: '#dc2626' },
  { name: 'Laranja', hex: '#ea580c' },
  { name: 'Amarelo', hex: '#ca8a04' },
  { name: 'Verde', hex: '#16a34a' },
  { name: 'Azul', hex: '#0284c7' },
  { name: 'Roxo', hex: '#9333ea' }
];

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
  const [gameType, setGameType] = useState<'quiz' | 'verdadeiro_falso' | 'forca' | 'cores' | 'stop'>('quiz');
  const [questions, setQuestions] = useState<any[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [studentName, setStudentName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('🦁');

  // Student active question state
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<boolean | null>(null);
  const [lastScoreChange, setLastScoreChange] = useState<number | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

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
      { id: 'room_5', code: '555555', title: 'Sala 5 - Jogo das Cores', subject: 'Cores', gameType: 'cores', status: 'waiting', professorChosenColor: null, questions: [{ id: 1 }], players: [], createdAt: Date.now() }
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

  const handleGameSelect = (type: 'quiz' | 'verdadeiro_falso' | 'forca' | 'cores' | 'stop') => {
    setGameType(type);
    setQuestions([{ id: 1 }]);
    setRoomTitle(type === 'cores' ? 'Sala - Jogo das Cores' : 'Sala de Jogo');
    setRoomSubject(type.toUpperCase());
    setView('create_room');
    soundFX.playClick();
  };

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomTitle) {
      alert('Preencha o título da sala.');
      return;
    }
    soundFX.playClick();

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const newRoom = {
      id: 'room_' + Date.now(),
      code,
      title: roomTitle,
      subject: roomSubject || 'Geral',
      gameType,
      status: 'waiting',
      professorChosenColor: null,
      questions: [{ id: 1 }],
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
      alert('Digite o PIN e seu nome.');
      return;
    }
    soundFX.playClick();

    const codeClean = joinCode.trim();
    const currentRooms = fetchRoomsLocal();
    const room = currentRooms.find((r: any) => r.code === codeClean);
    if (!room) {
      alert('Sala não encontrada.');
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

  // Professor clicks color in Jogo das Cores
  const professorPickColor = (colorName: string) => {
    soundFX.playClick();
    const currentRooms = fetchRoomsLocal();
    const room = currentRooms.find((r: any) => r.code === activeRoom.code);
    if (room) {
      room.professorChosenColor = colorName;
      // Reset student answer status for this round
      room.players.forEach((p: any) => { p.hasAnsweredRound = false; });
      saveRoomsLocal(currentRooms);
      setActiveRoom({ ...room });
    }
  };

  // Student picks color in Jogo das Cores
  const studentPickColor = (colorName: string) => {
    if (hasAnswered || !activeRoom || !activeRoom.professorChosenColor) return;
    setHasAnswered(true);
    setSelectedAnswer(colorName);

    const forbiddenColor = activeRoom.professorChosenColor;
    const isCorrect = (colorName !== forbiddenColor); // Cor certa = cor diferente do professor (+5 pts), Cor errada = mesma cor (-2 pts)

    setAnswerResult(isCorrect);
    const pointsDelta = isCorrect ? 5 : -2;
    setLastScoreChange(pointsDelta);

    if (isCorrect) {
      soundFX.playCorrect();
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    } else {
      soundFX.playIncorrect();
    }

    const currentRooms = fetchRoomsLocal();
    const room = currentRooms.find((r: any) => r.code === activeRoom.code);
    if (room) {
      const p = room.players.find((pl: any) => pl.id === student.id);
      if (p) {
        p.score += pointsDelta;
        room.players.sort((a: any, b: any) => b.score - a.score);
        saveRoomsLocal(currentRooms);
        setActiveRoom({ ...room });
      }
    }
  };

  // Reset student answer status when professor picks a new color
  useEffect(() => {
    setHasAnswered(false);
    setAnswerResult(null);
    setLastScoreChange(null);
    setSelectedAnswer(null);
  }, [activeRoom?.professorChosenColor]);

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
              ARENA DE JOGOS
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

      {/* Professor Login Modal (Thiago / 100529) */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#07262c] border-2 border-amber-400/60 rounded-3xl p-8 shadow-2xl relative space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-amber-400" />
              </div>
              <h3 className="text-2xl font-black text-white">Acesso Exclusivo do Professor</h3>
              <p className="text-sm text-cyan-300/70 mt-1">Insira suas credenciais (Usuário: Thiago, Senha: 100529)</p>
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
            <div className="inline-flex items-center space-x-2 px-6 py-2 rounded-full bg-[#07262c] border border-cyan-500/40 text-cyan-300 text-xs md:text-sm font-bold mb-8 shadow-lg shadow-cyan-950/50">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>SALA DE AULA GAMIFICADA EM TEMPO REAL</span>
            </div>

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
              Entre na sala aberta pelo professor e participe do Jogo das Cores!
            </p>

            <button
              onClick={() => { setView('student_join'); soundFX.playClick(); }}
              className="px-8 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-lg shadow-xl shadow-cyan-500/30 transition transform hover:scale-105"
            >
              ENTRAR NA SALA ABERTA PELO PROFESSOR 🚀
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

            {/* Jogo das Cores Highlight */}
            <div className="bg-[#07262c] border-2 border-amber-400/50 rounded-3xl p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-3">
                <span className="text-xs font-bold uppercase tracking-widest bg-amber-400 text-slate-950 px-3 py-1 rounded-lg">Destaque</span>
                <h3 className="text-3xl font-black text-white">JOGO DAS CORES</h3>
                <p className="text-cyan-200/80 text-sm max-w-xl">
                  Abra uma sala de Jogo das Cores. No painel ao vivo, clique em uma cor para definir a rodada. O aluno deve clicar em uma cor <strong>diferente</strong> da escolhida por você (+5 pts se acertar, -2 pts se errar).
                </p>
              </div>
              <button
                onClick={() => handleGameSelect('cores')}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/20 transition transform hover:scale-105 whitespace-nowrap"
              >
                Criar Sala Jogo das Cores ➔
              </button>
            </div>

            {/* Active Rooms */}
            <div className="space-y-4">
              <h3 className="text-base font-black text-cyan-300 uppercase tracking-wider">Salas Abertas</h3>
              {rooms.length === 0 ? (
                <div className="p-8 text-center bg-[#07262c] border border-cyan-500/30 rounded-3xl text-cyan-300/70">
                  Nenhuma sala aberta. Clique acima para criar a sala do Jogo das Cores.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.map((room) => (
                    <div key={room.id} className="bg-[#07262c] border border-cyan-500/30 p-5 rounded-2xl shadow-lg flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase bg-teal-900 text-teal-300 px-2.5 py-1 rounded-lg">
                            {room.gameType.toUpperCase()}
                          </span>
                          <span className="text-xs font-black text-amber-400 bg-slate-950 px-2.5 py-1 rounded-lg">
                            PIN: {room.code}
                          </span>
                        </div>
                        <h4 className="text-lg font-black text-white mb-1">{room.title}</h4>
                        <p className="text-xs text-cyan-300/70">{room.players.length} alunos conectados</p>
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
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. CREATE ROOM */}
        {view === 'create_room' && (
          <div className="flex-1 max-w-xl mx-auto w-full py-12">
            <div className="flex items-center space-x-4 mb-6">
              <button 
                onClick={() => { setView('teacher_dashboard'); soundFX.playClick(); }}
                className="p-2.5 rounded-xl bg-[#07262c] border border-cyan-500/30 hover:bg-[#0a353d] transition"
              >
                <ArrowLeft className="w-5 h-5 text-cyan-300" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-white">Criar Sala: Jogo das Cores</h2>
                <p className="text-sm text-cyan-300/70">Abra a sala para os alunos entrarem.</p>
              </div>
            </div>

            <form onSubmit={handleCreateRoom} className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-8 space-y-6 shadow-xl">
              <div>
                <label className="block text-sm font-bold text-cyan-200 mb-2">Título da Sala</label>
                <input
                  type="text"
                  required
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  placeholder="Ex: Turma A - Jogo das Cores"
                  className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-4 py-3 text-white placeholder-cyan-700 focus:outline-none focus:border-amber-400 font-semibold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black text-lg shadow-xl shadow-amber-500/20 transition"
              >
                Abrir Sala e Gerar PIN ➔
              </button>
            </form>
          </div>
        )}

        {/* 4. TEACHER LIVE CONTROL ROOM (Jogo das Cores Wheel) */}
        {view === 'teacher_live_control' && activeRoom && (
          <div className="flex-1 flex flex-col space-y-6 py-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 shadow-xl">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Painel do Professor - Jogo das Cores</span>
                <h2 className="text-3xl font-black text-white mt-1">{activeRoom.title}</h2>
                <p className="text-sm text-cyan-300/70">PIN da Sala para os Alunos: <strong className="text-amber-400 text-2xl tracking-wider bg-slate-950 px-4 py-1.5 rounded-xl ml-2">{activeRoom.code}</strong></p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => updateRoomStatus('playing', 0)}
                  className="px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black shadow-lg shadow-amber-500/30 flex items-center space-x-2 transition"
                >
                  <Play className="w-5 h-5 fill-current" />
                  <span>{activeRoom.status === 'waiting' ? 'Iniciar Jogo' : 'Reiniciar Rodada'}</span>
                </button>
                <button
                  onClick={() => updateRoomStatus('ended', 0)}
                  className="px-4 py-3 rounded-2xl bg-red-600/20 border border-red-500/40 hover:bg-red-600/30 text-red-300 font-bold transition"
                >
                  Encerrar Sala
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Color Wheel Control */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-8 shadow-xl text-center space-y-6">
                  <h3 className="text-2xl font-black text-white">
                    Clique em uma cor para a rodada:
                  </h3>
                  <p className="text-cyan-300 text-sm">
                    Cor escolhida por você nesta rodada: <strong className="text-amber-400 text-lg">{activeRoom.professorChosenColor || 'Nenhuma'}</strong>
                  </p>

                  {/* Color Wheel Matching Reference Image 2183e939.png */}
                  <div className="relative w-64 h-64 mx-auto rounded-full border-4 border-slate-800 shadow-2xl overflow-hidden bg-slate-950 flex items-center justify-center p-2">
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-1 p-2">
                      {COLOR_WHEEL_ITEMS.map((c, i) => (
                        <button
                          key={c.name}
                          onClick={() => professorPickColor(c.name)}
                          style={{ backgroundColor: c.hex }}
                          className={`rounded-xl border-2 transition transform hover:scale-105 active:scale-95 font-bold text-xs flex items-center justify-center shadow-lg ${activeRoom.professorChosenColor === c.name ? 'ring-4 ring-white scale-105' : 'border-slate-900/50'}`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                    {/* Center black hub matching reference image */}
                    <div className="w-20 h-20 bg-black rounded-full border-4 border-slate-800 shadow-inner z-10 flex items-center justify-center text-[10px] text-amber-400 font-black uppercase tracking-widest text-center px-1">
                      PROFESSOR
                    </div>
                  </div>

                  <div className="text-xs text-cyan-300/70 pt-2">
                    Regra: O aluno ganha <strong className="text-emerald-400">+5 pontos</strong> se clicar em uma cor diferente, e perde <strong className="text-red-400">-2 pontos</strong> se clicar na mesma cor.
                  </div>
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
                    Nenhum aluno entrou na sala ainda.
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
                <h2 className="text-2xl font-black text-white">Entrar na Sala Jogo das Cores</h2>
                <p className="text-sm text-cyan-300/70 mt-1">Insira o PIN fornecido pelo professor</p>
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
                    placeholder="Ex: 555555"
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
                    placeholder="Ex: Maria Silva"
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
                  Entrar na Sala 🚀
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
              <span className="text-xs font-bold uppercase tracking-widest text-slate-950 bg-amber-400 px-3 py-1 rounded-lg">Você entrou na sala!</span>
              <h2 className="text-3xl font-black text-white mt-2">{student?.name}</h2>
              <p className="text-cyan-300/80 text-sm mt-1">Sala: {activeRoom.title} ({activeRoom.code})</p>
            </div>

            <div className="bg-[#07262c] border border-cyan-500/30 rounded-3xl p-6 w-full space-y-3">
              <div className="flex items-center justify-center space-x-2 text-cyan-300 font-bold">
                <Users className="w-5 h-5 text-amber-400" />
                <span>Alunos na Sala: {activeRoom.players.length}</span>
              </div>
              <p className="text-xs text-cyan-300/60">
                {activeRoom.status === 'waiting' ? 'Aguardando o professor iniciar...' : 'O Jogo das Cores começou!'}
              </p>
            </div>

            {activeRoom.status === 'playing' && (
              <button
                onClick={() => { setView('student_game'); soundFX.playClick(); }}
                className="w-full py-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-lg shadow-xl animate-bounce"
              >
                Jogar Jogo das Cores! ➔
              </button>
            )}
          </div>
        )}

        {/* 7. STUDENT ACTIVE GAME SCREEN - JOGO DAS CORES (Color Wheel & Rules) */}
        {view === 'student_game' && activeRoom && (
          <div className="flex-1 flex flex-col max-w-xl mx-auto w-full py-6 space-y-6 text-center">
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
            ) : (
              <div className="space-y-6">
                {/* Header Score */}
                <div className="flex items-center justify-between bg-[#07262c] border border-cyan-500/30 rounded-2xl px-6 py-4">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{student?.avatar}</span>
                    <h4 className="font-bold text-white text-sm">{student?.name}</h4>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-amber-400">
                      {activeRoom.players.find((p:any) => p.id === student?.id)?.score || 0} pts
                    </div>
                  </div>
                </div>

                {/* Game Card */}
                <div className="bg-[#07262c] border-2 border-cyan-500/40 rounded-3xl p-8 shadow-2xl space-y-6">
                  <div className="bg-red-500/20 border border-red-500/40 py-3 px-4 rounded-2xl text-red-300 font-black text-lg animate-pulse">
                    NÃO PODE APERTAR NA COR: <span className="underline uppercase">{activeRoom.professorChosenColor || 'AGUARDANDO O PROFESSOR ESCOLHER...'}</span>
                  </div>

                  <p className="text-xs text-cyan-300/80">
                    Clique em qualquer outra cor diferente da proibida pelo professor! (<strong className="text-emerald-400">+5 pts</strong> / <strong className="text-red-400">-2 pts</strong>)
                  </p>

                  {/* Color Wheel Matching Reference Image 2183e939.png */}
                  <div className="relative w-64 h-64 mx-auto rounded-full border-4 border-slate-800 shadow-2xl overflow-hidden bg-slate-950 flex items-center justify-center p-2">
                    <div className="absolute inset-0 grid grid-cols-2 grid-rows-3 gap-1 p-2">
                      {COLOR_WHEEL_ITEMS.map((c) => (
                        <button
                          key={c.name}
                          disabled={!activeRoom.professorChosenColor || hasAnswered}
                          onClick={() => studentPickColor(c.name)}
                          style={{ backgroundColor: c.hex }}
                          className={`rounded-xl border-2 border-slate-900/50 hover:scale-105 active:scale-95 font-bold text-xs flex items-center justify-center shadow-lg transition disabled:opacity-50 ${selectedAnswer === c.name ? 'ring-4 ring-white' : ''}`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                    {/* Center black hub */}
                    <div className="w-20 h-20 bg-black rounded-full border-4 border-slate-800 shadow-inner z-10 flex items-center justify-center text-[10px] text-cyan-300 font-black uppercase tracking-widest text-center px-1">
                      ARENA
                    </div>
                  </div>

                  {/* Feedback */}
                  {hasAnswered && (
                    <div className={`p-4 rounded-2xl font-bold text-lg flex items-center justify-center space-x-2 animate-bounce ${answerResult ? 'bg-emerald-500/20 border border-emerald-400 text-emerald-300' : 'bg-red-500/20 border border-red-400 text-red-300'}`}>
                      {answerResult ? <CheckCircle2 className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                      <span>{answerResult ? `Correta! +5 pts` : `Errou! A cor era proibida! -2 pts`}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-cyan-900/40 py-4 text-center text-xs text-cyan-400/60 z-10">
        Jogo das Cores &bull; Regra: Não pode apertar na cor escolhida pelo professor (+5 / -2)
      </footer>

    </div>
  );
}

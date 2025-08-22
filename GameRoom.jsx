import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trophy, ArrowLeft, Swords } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { createPageUrl } from "@/lib/utils"; // 修正路径
import { motion } from "framer-motion";
import { useUser } from "@clerk/clerk-react";

const RoundHistory = ({ room, me, opponent }) => {
    if (room.current_round <= 1) return null;

    const history = Array.from({ length: room.current_round - 1 }, (_, i) => {
        const roundNum = i + 1;
        const myNum = me.numbers[i];
        const oppNum = opponent.numbers ? opponent.numbers[i] : '?';
        const winner = myNum > oppNum ? 'me' : (oppNum > myNum ? 'opponent' : 'tie');
        return { roundNum, myNum, oppNum, winner };
    });

    return (
        <div className="mt-6">
            <h3 className="text-center text-lg font-semibold text-slate-300 mb-2">Round History</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                {history.reverse().map(r => (
                    <div key={r.roundNum} className="flex justify-between items-center bg-slate-800/50 p-2 rounded-lg text-sm">
                        <span className="font-bold text-slate-400">Round {r.roundNum}</span>
                        <div className="flex items-center gap-2">
                           <Badge variant={r.winner === 'me' ? 'default' : 'secondary'} className={r.winner === 'me' ? 'bg-green-500/80' : ''}>{me.name}: {r.myNum}</Badge>
                           <span className="text-slate-500">vs</span>
                           <Badge variant={r.winner === 'opponent' ? 'default' : 'secondary'} className={r.winner === 'opponent' ? 'bg-red-500/80' : ''}>{opponent.name || 'Opponent'}: {r.oppNum}</Badge>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};


export default function GameRoom() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [room, setRoom] = useState(null);
  const [playerNumber, setPlayerNumber] = useState("");
  const [gamePhase, setGamePhase] = useState("loading"); // waiting, playing, round_complete, game_complete
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const location = useLocation();
  const roomId = useMemo(() => new URLSearchParams(location.search).get('room'), [location.search]);

  const loadRoom = useCallback(async () => {
    if (!roomId) { setError("No room ID provided."); return; }
    try {
      const response = await fetch(`/api/room/${roomId}`);
      if (response.status === 404) throw new Error("Game room not found.");
      if (!response.ok) throw new Error("Could not load the game room.");
      let currentRoom = await response.json();
      currentRoom.player1_numbers = JSON.parse(currentRoom.player1_numbers || '[]');
      currentRoom.player2_numbers = JSON.parse(currentRoom.player2_numbers || '[]');
      setRoom(currentRoom);
    } catch (err) {
      console.error("Failed to load room:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  const me = useMemo(() => {
    if (!room || !user) return null;
    const isPlayer1 = room.player1_id === user.id;
    return isPlayer1 ? 
        { id: room.player1_id, name: room.player1_full_name, score: room.player1_score, numbers: room.player1_numbers } : 
        { id: room.player2_id, name: room.player2_full_name, score: room.player2_score, numbers: room.player2_numbers };
  }, [room, user]);

  const opponent = useMemo(() => {
    if (!room || !user) return null;
    const isPlayer1 = room.player1_id === user.id;
    return isPlayer1 ? 
        { id: room.player2_id, name: room.player2_full_name, score: room.player2_score, numbers: room.player2_numbers } : 
        { id: room.player1_id, name: room.player1_full_name, score: room.player1_score, numbers: room.player1_numbers };
  }, [room, user]);

  const remainingPoints = useMemo(() => {
    if (!me || !me.numbers) return 100;
    return 100 - me.numbers.reduce((sum, num) => sum + num, 0);
  }, [me]);

  const submitNumber = async () => {
    setError(null);
    const number = parseInt(playerNumber, 10);

    if (!room || !user || isNaN(number) || number < 0 || number > 100) {
        setError("Please enter a valid number between 0 and 100.");
        return;
    }
    if (number > remainingPoints) {
        setError(`You only have ${remainingPoints} points remaining.`);
        return;
    }
    
    try {
        const response = await fetch(`/api/room/${room.id}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, number }),
        });
        const resData = await response.json();
        if (!response.ok) throw new Error(resData.error || "Failed to submit number");
        
        setPlayerNumber("");
        resData.player1_numbers = JSON.parse(resData.player1_numbers || '[]');
        resData.player2_numbers = JSON.parse(resData.player2_numbers || '[]');
        setRoom(resData);
    } catch (error) {
        console.error("Failed to submit number:", error);
        setError(error.message);
    }
  };

  const processRound = useCallback(async (currentRoom) => {
    if (!currentRoom) return;
    try {
        const response = await fetch(`/api/room/${currentRoom.id}/process-round`, { method: 'POST' });
        if (!response.ok) return;
        const updatedRoom = await response.json();
        updatedRoom.player1_numbers = JSON.parse(updatedRoom.player1_numbers || '[]');
        updatedRoom.player2_numbers = JSON.parse(updatedRoom.player2_numbers || '[]');
        setRoom(updatedRoom);
    } catch (e) { console.error("Failed to process round", e); }
  }, []);

  useEffect(() => {
    if (isLoaded && user) {
        loadRoom();
        const interval = setInterval(loadRoom, 3000);
        return () => clearInterval(interval);
    }
    if (isLoaded && !user) { navigate(createPageUrl("Dashboard")); }
  }, [isLoaded, user, loadRoom, navigate]);
  
  useEffect(() => {
    if (!room || !me) return;
    if (room.status === "completed") {
      setGamePhase("game_complete");
    } else if (room.status === "in_progress") {
        const p1_submitted = room.player1_numbers.length >= room.current_round;
        const p2_submitted = room.player2_id && room.player2_numbers.length >= room.current_round;
        if (p1_submitted && p2_submitted) {
            setGamePhase("round_complete");
            const timer = setTimeout(() => processRound(room), 2500);
            return () => clearTimeout(timer);
        } else {
            setGamePhase("playing");
        }
    } else {
      setGamePhase("waiting");
    }
  }, [room, me, processRound]);

  if (isLoading || !isLoaded || !me || !opponent) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-100 mb-4">{error || "Room not found."}</h1>
          <Button onClick={() => navigate(createPageUrl("Dashboard"))}><ArrowLeft className="w-4 h-4 mr-2" />Return to Dashboard</Button>
        </div>
      </div>
    );
  }
  
  const myNumberSubmitted = me.numbers.length >= room.current_round;
  const hasOpponent = !!opponent.id;

  return (
    <div className="min-h-screen bg-slate-900 p-6 flex flex-col items-center justify-center">
      <Card className="w-full max-w-4xl glass-effect border-slate-700">
        <CardHeader className="text-center relative">
          <Button onClick={() => navigate(createPageUrl("Dashboard"))} variant="ghost" className="absolute top-4 left-4"><ArrowLeft className="w-5 h-5 mr-2" /> Back</Button>
          <CardTitle className="text-3xl font-bold text-slate-100">{room.room_name}</CardTitle>
          <p className="text-slate-400">Round <span className="font-bold text-slate-200">{room.current_round}</span> of <span className="font-bold text-slate-200">{room.rounds}</span></p>
        </CardHeader>
        <CardContent className="px-4 md:px-6 py-6">
            <div className="flex justify-between items-center mb-6">
                <div className="text-center w-2/5">
                    <p className="font-bold text-xl text-blue-400 truncate">{me.name || 'You'}</p>
                    <p className="text-4xl font-bold text-slate-100">{me.score}</p>
                </div>
                <div className="text-center w-1/5">
                    <Swords className="w-8 h-8 text-slate-500 mx-auto"/>
                </div>
                <div className="text-center w-2/5">
                    <p className="font-bold text-xl text-red-400 truncate">{opponent.name || 'Waiting...'}</p>
                    <p className="text-4xl font-bold text-slate-100">{hasOpponent ? opponent.score : '-'}</p>
                </div>
            </div>
            
            <motion.div key={gamePhase} initial={{ opacity: 0, y:10 }} animate={{ opacity: 1, y:0 }} className="text-center p-4 min-h-[160px] flex flex-col items-center justify-center">
                {gamePhase === 'waiting' && (
                    <div className="text-center p-8">
                        <h2 className="text-xl text-slate-200 mb-4">Waiting for another player to join...</h2>
                        <p className="text-slate-400">Share Room Code: <strong className="text-yellow-400 text-lg tracking-widest">{room.room_code}</strong></p>
                    </div>
                )}
                {gamePhase === 'playing' && (
                     <div className="w-full max-w-sm mx-auto">
                        <h2 className="text-xl text-slate-200 mb-2">{myNumberSubmitted ? "Waiting for opponent..." : "Submit your number!"}</h2>
                        <p className="text-sm text-cyan-400 mb-4">You have <span className="font-bold">{remainingPoints}</span> points remaining.</p>
                        <Input type="number" value={playerNumber} onChange={e => setPlayerNumber(e.target.value)} disabled={myNumberSubmitted} placeholder="Enter a number (0-100)" className="bg-slate-800 border-slate-600 text-slate-100 text-center text-2xl h-12"/>
                        <Button onClick={submitNumber} disabled={myNumberSubmitted || !playerNumber} className="mt-4 w-full bg-blue-600 hover:bg-blue-700">Submit</Button>
                        {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                     </div>
                )}
                {gamePhase === 'round_complete' && (
                    <div className="text-center p-8">
                        <h2 className="text-2xl font-bold text-slate-200 mb-2">Round Complete!</h2>
                        <p className="text-slate-300">Calculating results and starting next round...</p>
                    </div>
                )}
                 {gamePhase === 'game_complete' && (
                    <div className="text-center p-8">
                        <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
                        <h2 className="text-3xl font-bold text-slate-100 mb-2">Game Over!</h2>
                        <p className="text-xl text-slate-300">
                            {room.winner_id === user.id ? "Congratulations, You Won!" : (room.winner_id ? "You Lost." : "It's a Tie!")}
                        </p>
                    </div>
                )}
            </motion.div>
            
            {hasOpponent && <RoundHistory room={room} me={me} opponent={opponent} />}
        </CardContent>
      </Card>
    </div>
  );
}

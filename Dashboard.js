import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Users, Gamepad2, Search, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useUser, SignInButton, SignedIn, SignedOut } from "@clerk/clerk-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, isLoaded } = useUser();
  const [rooms, setRooms] = useState([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [rounds, setRounds] = useState("3");
  const [joinCode, setJoinCode] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadRooms = useCallback(async () => {
    try {
      const response = await fetch('/api/rooms'); // 使用相对路径
      if (!response.ok) throw new Error("Failed to load rooms");
      const activeRooms = await response.json();
      setRooms(activeRooms);
    } catch (error) {
      console.error("Failed to load rooms:", error);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) {
      if (user) {
        loadRooms();
      }
      setIsLoading(false);
    }
  }, [isLoaded, user, loadRooms]);

  const createRoom = async () => {
    if (!roomName.trim() || !user) return;
    try {
      const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const response = await fetch('/api/rooms', { // 使用相对路径
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_name: roomName,
          room_code: roomCode,
          rounds: parseInt(rounds),
          player1_id: user.id,
          player1_full_name: user.fullName
        }),
      });
      if (!response.ok) throw new Error('Failed to create room');
      const newRoom = await response.json();
      navigate(`${createPageUrl("GameRoom")}?room=${newRoom.id}`);
    } catch (error) {
      console.error("Failed to create room:", error);
    }
  };

  const handleJoinRoom = async (room) => {
    if (!user) return;
    if (room.player1_id === user.id || room.player2_id) {
        navigate(`${createPageUrl("GameRoom")}?room=${room.id}`);
        return;
    }
    try {
        const response = await fetch('/api/join-by-code', { // 使用相对路径
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                room_code: room.room_code,
                user: { id: user.id, full_name: user.fullName }
            }),
        });
        if (!response.ok) throw new Error('Failed to join room');
        const joinedRoom = await response.json();
        navigate(`${createPageUrl("GameRoom")}?room=${joinedRoom.id}`);
    } catch (error) {
        console.error("Failed to join room:", error);
    }
  }

  const joinByCode = async () => {
    if (!joinCode.trim() || !user) return;
    try {
      const response = await fetch('/api/join-by-code', { // 使用相对路径
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_code: joinCode,
          user: { id: user.id, full_name: user.fullName }
        }),
      });
      if (!response.ok) {
        const err = await response.json();
        alert(err.error || 'Failed to join by code');
        return;
      }
      const roomToJoin = await response.json();
      navigate(`${createPageUrl("GameRoom")}?room=${roomToJoin.id}`);
    } catch (error) {
      console.error("Failed to join by code:", error);
    }
  };

  if (!isLoaded || isLoading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    );
  }

  return (
    <>
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mx-auto mb-6 game-glow">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-100 mb-3">Welcome to NumberDuel</h1>
            <p className="text-slate-400 mb-8">Sign in to start competing with players worldwide</p>
            <SignInButton mode="modal">
              <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-8 py-3 text-lg">
                Sign In to Play
              </Button>
            </SignInButton>
          </motion.div>
        </div>
      </SignedOut>
      
      <SignedIn>
        <div className="min-h-screen bg-slate-900 p-6">
          <div className="max-w-7xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h1 className="text-4xl font-bold text-slate-100 mb-2">Game Dashboard</h1>
                <p className="text-slate-400">Welcome back, {user?.fullName}! Ready for a challenge?</p>
              </div>
              <Button onClick={() => setShowCreateRoom(!showCreateRoom)} className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 px-6 py-3">
                <Plus className="w-5 h-5 mr-2" />
                Create Room
              </Button>
            </motion.div>
            
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <AnimatePresence>
                  {showCreateRoom && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6">
                      <Card className="glass-effect border-slate-700">
                         <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-100">
                                <Gamepad2 className="w-5 h-5 text-blue-400" />
                                Create New Game Room
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                <Label className="text-slate-300">Room Name</Label>
                                <Input value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Enter room name" className="bg-slate-800 border-slate-600 text-slate-100" />
                                </div>
                                <div className="space-y-2">
                                <Label className="text-slate-300">Number of Rounds</Label>
                                <Select value={rounds} onValueChange={setRounds}>
                                    <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100"><SelectValue /></SelectTrigger>
                                    <SelectContent><SelectItem value="3">3 Rounds</SelectItem><SelectItem value="5">5 Rounds</SelectItem></SelectContent>
                                </Select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button onClick={createRoom} disabled={!roomName.trim()} className="bg-blue-600 hover:bg-blue-700 flex-1">Create Room</Button>
                                <Button variant="outline" onClick={() => setShowCreateRoom(false)} className="border-slate-600 text-slate-300 hover:bg-slate-800">Cancel</Button>
                            </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <Card className="glass-effect border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                      <Users className="w-5 h-5 text-cyan-400" />
                      Active Game Rooms
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3">
                      <AnimatePresence>
                        {rooms.map((room) => (
                          <motion.div key={room.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-all duration-200">
                           <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center"><Trophy className="w-6 h-6 text-white" /></div>
                                <div>
                                    <h3 className="font-semibold text-slate-100">{room.room_name}</h3>
                                    <div className="flex items-center gap-3 text-sm">
                                    <Badge variant="outline" className="border-cyan-400 text-cyan-400">{room.rounds} rounds</Badge>
                                    <span className="text-slate-400">Code: {room.room_code}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-sm text-slate-400">{room.player2_id ? "2/2 players" : "1/2 players"}</p>
                                    <Badge variant="secondary" className={room.player2_id ? "bg-red-500/20 text-red-400" : "bg-green-500/20 text-green-400"}>{room.player2_id ? "Full" : "Waiting"}</Badge>
                                </div>
                                <Button onClick={() => handleJoinRoom(room)} disabled={room.player2_id && room.player2_id !== user.id} variant={room.player1_id === user.id ? "outline" : "default"} className={room.player1_id === user.id ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "bg-blue-600 hover:bg-blue-700"}>
                                    {room.player1_id === user.id ? "Enter" : "Join"}
                                </Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {rooms.length === 0 && !isLoading && (
                         <div className="text-center py-12">
                            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-300 mb-2">No Active Rooms</h3>
                            <p className="text-slate-500">Create a room to start playing!</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="space-y-6">
                <Card className="glass-effect border-slate-700">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-slate-100">
                      <Search className="w-5 h-5 text-yellow-400" />
                      Join by Code
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Room Code</Label>
                      <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Enter 6-letter code" maxLength={6} className="bg-slate-800 border-slate-600 text-slate-100 text-center text-lg tracking-widest" />
                    </div>
                    <Button onClick={joinByCode} disabled={joinCode.length !== 6} className="w-full bg-yellow-600 hover:bg-yellow-700">Join Game</Button>
                  </CardContent>
                </Card>
                <Card className="glass-effect border-slate-700">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-100">
                        <Trophy className="w-5 h-5 text-green-400" />
                        Game Rules
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm text-slate-300">
                        {/* Rules content */}
                    </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SignedIn>
    </>
  );
}
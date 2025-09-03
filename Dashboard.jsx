import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRooms = useCallback(async () => {
    try {
      const token = await getToken();
      const response = await fetch("/api/rooms", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to load rooms");
      const activeRooms = await response.json();
      setRooms(activeRooms);
    } catch (err) {
      console.error("Error loading rooms:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleJoinRoom = (roomId) => {
    navigate(`/game?room=${roomId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-100 mb-4">{error}</h1>
          <Button onClick={loadRooms}>Retry</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <Card className="max-w-4xl mx-auto glass-effect border-slate-700">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-slate-100">Available Rooms</CardTitle>
        </CardHeader>
        <CardContent>
          {rooms.length === 0 ? (
            <p className="text-slate-400">No active rooms found.</p>
          ) : (
            <ul className="space-y-4">
              {rooms.map((room) => (
                <li key={room.id} className="flex justify-between items-center bg-slate-800 p-4 rounded-lg">
                  <span className="text-slate-100 font-semibold">{room.room_name}</span>
                  <Button onClick={() => handleJoinRoom(room.id)}>Join</Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



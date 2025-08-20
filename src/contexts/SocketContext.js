import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const { user } = useAuth();

  // Simulate WebSocket connection (in a real app, this would connect to Socket.io server)
  useEffect(() => {
    if (user) {
      // Simulate connection
      setIsConnected(true);
    } else {
      setIsConnected(false);
      setActiveUsers([]);
      setCurrentRoom(null);
    }
  }, [user]);

  const joinRoom = async (roomId) => {
    if (!user) return { success: false, error: 'Not authenticated' };

    setCurrentRoom(roomId);
    
    // Simulate joining a room with current user
    setActiveUsers([{
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: 'active'
    }]);

    return { success: true, roomId };
  };

  const leaveRoom = async () => {
    setCurrentRoom(null);
    setActiveUsers([]);
    return { success: true };
  };

  const sendMessage = async (message) => {
    if (!isConnected || !currentRoom) {
      return { success: false, error: 'Not connected to a room' };
    }

    // In a real app, this would send via WebSocket
    console.log('Message sent:', message);
    return { success: true };
  };

  const value = {
    isConnected,
    activeUsers,
    currentRoom,
    joinRoom,
    leaveRoom,
    sendMessage
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

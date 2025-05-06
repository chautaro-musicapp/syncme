// src/context/socket.tsx
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:8000'; // or your backend URL

// 1. Create the context
export const SocketContext = createContext<{ socket: Socket | null }>({
  socket: null,
});

// 2. Create the Provider Component
export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socketRef.current) {
      const newSocket = io(SOCKET_URL, {
        transports: ['websocket'],
        withCredentials: true,
      });

      newSocket.on('connect', () => {
        console.log('✅ Connected to socket server:', newSocket.id);
      });

      newSocket.on('disconnect', () => {
        console.log('❌ Disconnected from socket server');
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    }

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
};

// 3. Export a custom hook to access the socket
export const useSocket = () => useContext(SocketContext);

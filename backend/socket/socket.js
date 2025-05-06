// import http from 'http';
// import { Server } from 'socket.io';

// const initSocket = (app) => {
//   const server = http.createServer(app);
//   const io = new Server(server, {
//     cors: {
//       origin: '*',
//       methods: ['GET', 'POST']
//     }
//   });

//   const rooms = new Map();

//   io.on('connection', (socket) => {
//     console.log('New client connected:', socket.id);

//     socket.on('create_room', (roomCode) => {
//       rooms.set(roomCode, {
//         host: socket.id,
//         users: new Set([socket.id])
//       });
//       socket.join(roomCode);
//     });

//     socket.on('join_room', ({ roomCode, isHost }) => {
//       if (!rooms.has(roomCode)) {
//         socket.emit('invalid_room');
//         return;
//       }

//       const room = rooms.get(roomCode);
//       if (!isHost) {
//         room.users.add(socket.id);
//       }
      
//       socket.join(roomCode);
//       io.to(roomCode).emit('room_update', room.users.size);
//     });

//     socket.on('disconnect', () => {
//       rooms.forEach((room, code) => {
//         if (room.users.has(socket.id)) {
//           room.users.delete(socket.id);
//           io.to(code).emit('room_update', room.users.size);
          
//           if (room.users.size === 0) {
//             rooms.delete(code);
//           }
//         }
//       });
//     });

//     // Host controls
//     socket.on('play', (roomCode) => {
//       socket.to(roomCode).emit('host_play');
//     });

//     socket.on('pause', (roomCode) => {
//       socket.to(roomCode).emit('host_pause');
//     });

//     socket.on('seek', ({ roomCode, time }) => {
//       socket.to(roomCode).emit('host_seek', time);
//     });

//     socket.on('time_update', ({ roomCode, currentTime }) => {
//       socket.to(roomCode).emit('host_time_update', currentTime);
//     });

//     socket.on('request_sync', (roomCode) => {
//       const hostSocket = rooms.get(roomCode)?.host;
//       if (hostSocket) {
//         io.to(hostSocket).emit('request_sync', socket.id);
//       }
//     });

//     socket.on('host_update', ({ clientId, isPlaying, currentTime }) => {
//       io.to(clientId).emit('force_sync', { isPlaying, currentTime });
//     });
//   });

//   return server;
// };

// // module.exports = initSocket;
// export { initSocket };



import http from 'http';
import { Server } from 'socket.io';
import { Message } from '../Schema/model.js'; // Import the Message model

const initSocket = (app) => {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  const rooms = new Map();

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    socket.on('create_room', (roomCode) => {
      rooms.set(roomCode, {
        host: socket.id,
        users: new Set([socket.id])
      });
      socket.join(roomCode);
    });

    socket.on('join_room', async ({ roomCode, isHost }) => {
      if (!rooms.has(roomCode)) {
        socket.emit('invalid_room');
        return;
      }

      const room = rooms.get(roomCode);
      if (!isHost) {
        room.users.add(socket.id);
      }
      
      socket.join(roomCode);
      io.to(roomCode).emit('room_update', room.users.size);

      // Send chat history to new participant
      try {
        const messages = await Message.find({ roomCode })
          .sort({ timestamp: 1 })
          .limit(50)
          .lean();
        socket.emit('chat_history', messages);
      } catch (error) {
        console.error('Error fetching chat history:', error);
      }
    });

    socket.on('disconnect', () => {
      rooms.forEach((room, code) => {
        if (room.users.has(socket.id)) {
          room.users.delete(socket.id);
          io.to(code).emit('room_update', room.users.size);
          
          if (room.users.size === 0) {
            rooms.delete(code);
          }
        }
      });
    });

    // Chat functionality
    socket.on('send_message', async ({ roomCode, sender, content }) => {
      try {
        const message = new Message({
          roomCode,
          sender,
          content
        });
        await message.save();

        io.to(roomCode).emit('receive_message', {
          sender,
          content,
          timestamp: message.timestamp
        });
      } catch (error) {
        console.error('Error saving message:', error);
      }
    });

    socket.on('request_chat_history', async (roomCode) => {
      try {
        const messages = await Message.find({ roomCode })
          .sort({ timestamp: 1 })
          .limit(50)
          .lean();
        socket.emit('chat_history', messages);
      } catch (error) {
        console.error('Error fetching chat history:', error);
      }
    });

    // Host controls (existing functionality)
    socket.on('play', (roomCode) => {
      socket.to(roomCode).emit('host_play');
    });

    socket.on('pause', (roomCode) => {
      socket.to(roomCode).emit('host_pause');
    });

    socket.on('seek', ({ roomCode, time }) => {
      socket.to(roomCode).emit('host_seek', time);
    });

    socket.on('time_update', ({ roomCode, currentTime }) => {
      socket.to(roomCode).emit('host_time_update', currentTime);
    });

    socket.on('request_sync', (roomCode) => {
      const hostSocket = rooms.get(roomCode)?.host;
      if (hostSocket) {
        io.to(hostSocket).emit('request_sync', socket.id);
      }
    });

    socket.on('host_update', ({ clientId, isPlaying, currentTime }) => {
      io.to(clientId).emit('force_sync', { isPlaying, currentTime });
    });
  });

  return server;
};

export { initSocket };
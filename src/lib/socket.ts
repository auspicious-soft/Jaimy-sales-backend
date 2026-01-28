// import { Server } from 'socket.io';

// let io: Server;

// export function initSocket(server: any) {
//   io = new Server(server, {
//     cors: {
//       origin: '*', // adjust in prod
//     },
//   });

//   io.on('connection', (socket) => {
//     console.log('🟢 Client connected:', socket.id);

//     socket.on('join', (phoneNumber) => {
//       socket.join(phoneNumber); 
//       console.log('📲 Joined room:', phoneNumber);
//     });

//     socket.on('disconnect', () => {
//       console.log('🔴 Disconnected:', socket.id);
//     });
//   });

//   return io;
// }

// export function getIO() {
//   if (!io) throw new Error('Socket not initialized');
//   return io;
// }




import { Server } from 'socket.io';

let io: Server;

export function initSocket(server: any) {
  io = new Server(server, {
    cors: {
      origin: '*',
    },
  });

  io.on('connection', (socket) => {
    console.log('🟢 Client connected:', socket.id);

    socket.on('join', (phoneNumber) => {
      socket.join(phoneNumber);

      // 🔍 DEBUG: show rooms and clients count
      const room = io.sockets.adapter.rooms.get(phoneNumber);
      const count = room ? room.size : 0;

      console.log(`📲 Joined room: ${phoneNumber}`);
      console.log(`👥 Clients in room ${phoneNumber}:`, count);
    });

    socket.on('disconnect', () => {
      console.log('🔴 Disconnected:', socket.id);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error('Socket not initialized');
  return io;
}

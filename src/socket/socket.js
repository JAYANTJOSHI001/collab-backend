const Room = require('../models/room.model');

module.exports = (io) => {
  // Store active rooms
  const activeRooms = new Map();
  
  // Debounce timers for code changes
  const debounceTimers = new Map();

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join room
    socket.on('joinRoom', async ({ roomId, user }) => {
      try {
        let room = activeRooms.get(roomId);
        
        if (!room) {
          const dbRoom = await Room.findById(roomId);
          if (!dbRoom) {
            socket.emit('error', 'Room not found');
            return;
          }
          
          room = {
            users: new Map(),
            files: new Map(dbRoom.files.map(f => [f.path, f.content])),
            lastSave: Date.now(),
            cursors: new Map(),
            selections: new Map()
          };
          activeRooms.set(roomId, room);
        }

        // Join socket room
        socket.join(roomId);
        socket.roomId = roomId;

        // Add user to room
        room.users.set(socket.id, user);

        // Notify others
        socket.to(roomId).emit('userJoined', {
          user,
          users: Array.from(room.users.values())
        });

        // Send current state
        socket.emit('roomState', {
          users: Array.from(room.users.values()),
          files: Array.from(room.files.entries()),
          cursors: Array.from(room.cursors.entries()),
          selections: Array.from(room.selections.entries())
        });
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', 'Failed to join room');
      }
    });

    // Handle code changes with debouncing
    socket.on('codeChange', async ({ file, content, selection, cursor }) => {
      const roomId = socket.roomId;
      if (!roomId) return;

      const room = activeRooms.get(roomId);
      if (!room) return;

      // Update in memory
      room.files.set(file, content);
      
      // Update cursor and selection if provided
      if (cursor) {
        room.cursors.set(socket.id, { file, ...cursor });
      }
      if (selection) {
        room.selections.set(socket.id, { file, ...selection });
      }

      // Clear existing debounce timer
      const timerKey = `${roomId}-${file}`;
      if (debounceTimers.has(timerKey)) {
        clearTimeout(debounceTimers.get(timerKey));
      }

      // Set new debounce timer
      debounceTimers.set(timerKey, setTimeout(() => {
        // Broadcast to others
        socket.to(roomId).emit('codeUpdate', {
          file,
          content,
          userId: socket.id,
          cursor: room.cursors.get(socket.id),
          selection: room.selections.get(socket.id)
        });

        // Auto-save
        const now = Date.now();
        if (now - room.lastSave >= 60000) {
          try {
            Room.findByIdAndUpdate(roomId, {
              $set: { 
                [`files.${file}`]: content,
                lastActivity: new Date()
              }
            });
            room.lastSave = now;
            socket.emit('codeSaved');
          } catch (error) {
            console.error('Save error:', error);
            socket.emit('error', 'Failed to save changes');
          }
        }
      }, 1000)); // 1 second debounce
    });

    // Handle cursor movement
    socket.on('cursorMove', ({ file, position }) => {
      const roomId = socket.roomId;
      if (!roomId) return;

      const room = activeRooms.get(roomId);
      if (!room) return;

      room.cursors.set(socket.id, { file, ...position });
      socket.to(roomId).emit('cursorUpdate', {
        userId: socket.id,
        file,
        position
      });
    });

    // Handle selection changes
    socket.on('selectionChange', ({ file, selection }) => {
      const roomId = socket.roomId;
      if (!roomId) return;

      const room = activeRooms.get(roomId);
      if (!room) return;

      room.selections.set(socket.id, { file, ...selection });
      socket.to(roomId).emit('selectionUpdate', {
        userId: socket.id,
        file,
        selection
      });
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      const roomId = socket.roomId;
      if (!roomId) return;

      const room = activeRooms.get(roomId);
      if (!room) return;

      // Remove user
      room.users.delete(socket.id);
      room.cursors.delete(socket.id);
      room.selections.delete(socket.id);

      // Notify others
      socket.to(roomId).emit('userLeft', {
        userId: socket.id,
        users: Array.from(room.users.values())
      });

      // Clean up empty rooms
      if (room.users.size === 0) {
        activeRooms.delete(roomId);
      }
    });
  });
}; 
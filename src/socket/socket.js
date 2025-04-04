const Room = require('../models/room.model');

module.exports = (io) => {
  // Store active rooms
  const activeRooms = new Map();
  const roomChats = new Map();
  
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
        const chatHistory = roomChats.get(roomId) || [];
        socket.emit('chatHistory', chatHistory)
      } catch (error) {
        console.error('Join room error:', error);
        socket.emit('error', 'Failed to join room');
      }
    });

    socket.on('sendChatMessage', (messageData) => {
      const roomId = messageData.roomId || socket.roomId;
      if (!roomId) {
        console.log('❌ [Socket] Cannot send chat message: No room ID provided');
        return;
      }
  
      console.log('📨 [Socket] Chat message received:', {
        roomId,
        sender: messageData.sender?.name || 'Unknown',
        contentLength: messageData.content?.length || 0
      });
  
      // Initialize chat history for room if it doesn't exist
      if (!roomChats.has(roomId)) {
        roomChats.set(roomId, []);
      }
  
      // Add timestamp if not provided
      const message = {
        ...messageData,
        timestamp: messageData.timestamp || new Date()
      };
  
      // Store message in memory
      roomChats.get(roomId).push(message);
      
      // Limit history to last 100 messages
      if (roomChats.get(roomId).length > 100) {
        roomChats.set(roomId, roomChats.get(roomId).slice(-100));
      }
  
      // Broadcast to all clients in the room except sender
      socket.to(roomId).emit('chatMessage', message);
      
      console.log('✅ [Socket] Chat message broadcast to room:', roomId);
    });
  
    // Handle requests for chat history
    socket.on('getChatHistory', ({ roomId }) => {
      if (!roomId) {
        console.log('❌ [Socket] Cannot get chat history: No room ID provided');
        return;
      }
  
      const history = roomChats.get(roomId) || [];
      console.log('📚 [Socket] Sending chat history:', {
        roomId,
        messageCount: history.length
      });
      
      socket.emit('chatHistory', history);
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

    // Add this to your existing socket.js file in the ai:request handler
    
    socket.on('ai:request', async (data) => {
      const { roomId, userId, requestType, code, language, cursorPosition, error, prompt } = data;
      
      try {
        let response;
        
        switch (requestType) {
          case 'suggest':
            // Call AI controller for suggestions using Hugging Face
            response = await fetch(`${process.env.API_URL}/api/ai/suggest`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, language, cursorPosition })
            }).then(res => res.json());
            break;
            
          case 'debug':
            response = await fetch(`${process.env.API_URL}/api/ai/debug`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, language, error })
            }).then(res => res.json());
            break;
            
          case 'optimize':
            response = await fetch(`${process.env.API_URL}/api/ai/optimize`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, language })
            }).then(res => res.json());
            break;
            
          case 'explain':
            response = await fetch(`${process.env.API_URL}/api/ai/explain`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code, language })
            }).then(res => res.json());
            break;
            
          case 'gemini':
            response = await fetch(`${process.env.API_URL}/api/ai/gemini`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                prompt, 
                language,
                context: code // Pass the current code as context
              })
            }).then(res => res.json());
            break;
            
          default:
            throw new Error('Invalid request type');
        }
        
        // Emit the response back to the room
        io.to(roomId).emit('ai:response', {
          userId,
          requestType,
          response
        });
      } catch (error) {
        console.error('AI request error:', error);
        socket.emit('ai:error', {
          message: 'Failed to process AI request',
          error: error.message
        });
      }
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
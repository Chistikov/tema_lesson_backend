const express = require('express');
const cors = require('cors')
const app = express();
app.use(cors)
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
require('dotenv').config()

console.log(process);
const { PORT } = process.env;

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST']
  }
});
const rooms = {}

io.on('connect', socket => {
  console.log(`SOCKET ${socket.id} CONNECTED`)

  socket.on('JOIN_ROOM', (metadata) => {
    const {roomId, peerId, userName, isMicrophoneEnable, isCameraEnable, userId, userAvatar, isTutor, isScreenSharingStream} = metadata;
    console.log(`User ${peerId} joined to the room ${roomId}`);
    if (!rooms[roomId]) {
      rooms[roomId] = {
        pearsList: {
          [peerId]: {
            peerId,
            userId,
            userAvatar,
            userName,
            isTutor,
            isMicrophoneEnable,
            isCameraEnable,
            isScreenSharingStream,
          }
        },
        shareScreenUserId: null,
      }
    } else {
      rooms[roomId].pearsList[peerId] = {
        peerId,
        userId,
        userAvatar,
        userName,
        isTutor,
        isMicrophoneEnable,
        isCameraEnable,
        isScreenSharingStream,
      }
    }
    socket.join(roomId)
    socket.to(roomId).emit('USER_JOINED', rooms[roomId].pearsList[peerId])
    // socket.emit('SETUP_SHARE_SCREEN_USER_ID', {peerId: rooms[roomId].shareScreenUserId})
    console.log(rooms)

    // socket.emit('GET_USERS', {
    //   roomId: roomId,
    //   participants: rooms[roomId]
    // })

    socket.on('FETCH_PEER_DATA', ({ roomId, peerId }) => {
      socket.emit('SET_PEER_DATA', rooms[roomId].pearsList[peerId])
    })

    socket.on('USER_CHANGED_MICROPHONE_STATUS', (changeMicStatusData) => {
      const { roomId, peerId, isMicrophoneEnable } = changeMicStatusData;
      rooms[roomId].pearsList[peerId].isMicrophoneEnable = isMicrophoneEnable;
      socket.to(roomId).emit('USER_CHANGED_MICROPHONE_STATUS', { peerId, isMicrophoneEnable });
    })

    socket.on('USER_CHANGED_CAMERA_STATUS', (changeCameraStatusData) => {
      const { roomId, peerId, isCameraEnable } = changeCameraStatusData;
      rooms[roomId].pearsList[peerId].isCameraEnable = isCameraEnable;
      socket.to(roomId).emit('USER_CHANGED_CAMERA_STATUS', { peerId, isCameraEnable });
    })

    socket.on('USER_STARTED_SCREEN_SHARING', ({roomId, userId}) => {
      rooms[roomId].shareScreenUserId = userId;
      socket.to(roomId).emit('USER_STARTED_SCREEN_SHARING', {peerId})
    })

    socket.on('TUTOR_FINISHED_LESSON', ({roomId, userId}) => {
      socket.to(roomId).emit('TUTOR_FINISHED_LESSON', {peerId})
    })

    socket.on('disconnect', () => {
      console.log(`User ${peerId} leave the room ${roomId}`)
      leaveRoom(roomId, peerId)
    })
  })

  socket.on('STARTED_SCREEN_SHARING', (metadata) => {
    const {roomId, peerId, userName, isTutor, isMicrophoneEnable, isCameraEnable, userId, userAvatar, isScreenSharingStream} = metadata;
    console.log(`User ${peerId} started screen sharing in the room ${roomId}`);
    // if (!rooms[roomId]) {
    //   rooms[roomId] = {
    //     pearsList: {
    //       [peerId]: {
    //         peerId,
    //         userId,
    //         userAvatar,
    //         userName,
    //         isMicrophoneEnable,
    //         isCameraEnable,
    //         isScreenSharingStream,
    //       }
    //     },
    //     shareScreenUserId: null,
    //   }
    // } else {
      rooms[roomId].pearsList[peerId] = {
        peerId,
        userId,
        userAvatar,
        userName,
        isTutor,
        isMicrophoneEnable,
        isCameraEnable,
        isScreenSharingStream
      }
      console.warn('metadata:', rooms[roomId].pearsList[peerId]);
    // }
    socket.join(roomId);
    socket.to(roomId).emit('PEER_STARTED_SCREEN_SHARING', rooms[roomId].pearsList[peerId]);
    console.log(rooms)

    socket.on('USER_STOPPED_SCREEN_SHARING', ({ roomId, peerId }) => {
      socket.to(roomId).emit('USER_STOPPED_SCREEN_SHARING');
      leaveRoom(roomId, peerId)
    })
    
    socket.on('disconnect', () => {
      console.log(`User ${peerId} in room ${roomId} stoped sreen sharing`)
      leaveRoom(roomId, peerId)
    })
  });

  // disconnect срабатывает при закрытии браузера или вкладки
  socket.on('disconnect', () => {
    console.log(`SOCKET DISCONNECTED`)
  })

  function leaveRoom(roomId, peerId) {
    delete rooms[roomId].pearsList[peerId];
    if (rooms[roomId].shareScreenUserId === peerId) {
      rooms[roomId].shareScreenUserId = null;
    }
    socket.to(roomId).emit('USER_DISCONNECTED', {peerId})
  }
})

server.listen(PORT, () => {
  console.log(`listening on port: ${PORT}`);
});
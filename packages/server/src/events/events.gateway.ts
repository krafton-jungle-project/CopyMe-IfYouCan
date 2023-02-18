import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

@WebSocketGateway(8081, {
  cors: {
    // origin: 'http://localhost:3000',
    origin: '*',
    // origin: 'http://6650-175-126-107-17.jp.ngrok.io',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private logger = new Logger('Gateway');
  // private rooms = new Map<string, { nickName: string; id: string }[]>();
  private rooms: {
    [key: string]: {
      roomName: string;
      users: { id: string; nickName: string }[];
      started: boolean;
      readyCount: number;
    };
  } = {};

  private userToRoom: { [key: string]: string } = {};

  @WebSocketServer()
  server: Server;

  //!소켓 연결
  handleConnection(@ConnectedSocket() socket: Socket): void {
    this.logger.log(`socketId: ${socket.id} 소켓 연결`);
  }

  //!소켓 연결 해제
  handleDisconnect(@ConnectedSocket() socket: Socket): void {
    const roomId = this.userToRoom[socket.id];
    if (!roomId) return;

    // 유저 정보 업데이트
    if (this.rooms[roomId]) {
      this.rooms[roomId].users = this.rooms[roomId].users.filter((user) => user.id !== socket.id);
      if (this.rooms[roomId].users.length === 0) {
        // 방 삭제
        delete this.rooms[roomId];
        this.logger.log(`roomId: ${roomId} 삭제`);
      } else {
        socket.to(roomId).emit('user_exit'); //방장이 될 사람의 id 보내기
      }
    }

    // 클라이언트에게 업데이트 된 방 정보 전달
    this.server.sockets.emit('get_rooms', this.rooms);

    this.logger.log(`socketId: ${socket.id} 소켓 연결 해제 ❌`);
  }

  //! 방 조회
  @SubscribeMessage('rooms')
  getRooms(@ConnectedSocket() socket: Socket): void {
    console.log(this.rooms);
    this.server.sockets.to(socket.id).emit('get_rooms', this.rooms);
  }

  //! 방 생성
  @SubscribeMessage('create_room')
  createRoom(@ConnectedSocket() socket: Socket, @MessageBody() roomName: string): void {
    const roomId = uuidv4();
    this.rooms[roomId] = {
      roomName,
      users: [],
      started: false,
      readyCount: 0,
    };
    console.log(socket.id);
    this.server.sockets.to(socket.id).emit('new_room', roomId);

    this.logger.log(`create room roomname: ${roomName} by user:${socket.id} `);
  }

  //! 준비
  @SubscribeMessage('ready')
  ready(@ConnectedSocket() socket: Socket, @MessageBody() roomId: string): void {
    this.rooms[roomId].readyCount += 1;

    // 방에 다른 유저들에게 준비 했다고 알려줌
    socket.to(roomId).emit('get_ready');
  }

  //! 준비 취소
  @SubscribeMessage('unready')
  cancleReady(@ConnectedSocket() socket: Socket, @MessageBody() roomId: string): void {
    this.rooms[roomId].readyCount -= 1;

    // 방에 다른 유저들에게 준비 취소했다고 알려줌
    socket.to(roomId).emit('get_unready');
  }

  //! imgae 전송(공격이 끝났을 시 이벤트를 받는다)
  @SubscribeMessage('image')
  imageHandle(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { pose: any; imgSrc: string },
  ): void {
    const roomId = this.userToRoom[socket.id];

    // 다른 유저들에게 공격자의 image와 포즈 데이터 전송
    socket.to(roomId).emit('get_image', data.pose, data.imgSrc);
  }

  //! 수비가 끝났을 시 이벤트를 받는다
  @SubscribeMessage('image_reset')
  resetImage(@ConnectedSocket() socket: Socket): void {
    const roomId = this.userToRoom[socket.id];
    socket.to(roomId).emit('get_image_reset');
  }

  //! 게임 시작
  @SubscribeMessage('start')
  gameStart(@ConnectedSocket() socket: Socket, @MessageBody() roomId: string): void {
    if (this.rooms[roomId].readyCount === this.rooms[roomId].users.length - 1) {
      // 게임이 시작하면 모든 유저들에게 게임이 시작됐다는 이벤트 발생
      socket.in(roomId).emit('get_start');
    }
  }

  //! 공격 시작
  @SubscribeMessage('attack')
  attack(@ConnectedSocket() socket: Socket, @MessageBody() roomId: string): void {
    // 공격자가 공격을 시작하면 수비자들에게 공격이 시작되었다는 이벤트 발생
    socket.to(roomId).emit('get_attack');
  }

  //! 게임 끝
  @SubscribeMessage('finish')
  finish(@ConnectedSocket() socket: Socket, @MessageBody() roomId: string): void {
    // 방에 모든 유저들에게 게임이 끝났다고 알려줌
    socket.to(roomId).emit('get_finish', socket.id);
  }

  //! 방에 새로운 유저 join
  @SubscribeMessage('join_room')
  joinRoom(
    @ConnectedSocket() socket: Socket,
    @MessageBody() data: { roomId: string; nickName: string },
  ): void {
    const { roomId, nickName } = data;

    if (!this.rooms[roomId]) {
      this.server.sockets.to(socket.id).emit('error');
      return;
    }

    // 방 정보 업데이트
    const countUsers = this.rooms[roomId].users.length;
    if (countUsers === 4) {
      //! 방 인원이 다 찼을 경우
      this.server.sockets.to(socket.id).emit('full');
      this.logger.log(`full users ${countUsers}`);
      return;
    } else {
      this.rooms[roomId].users.push({ id: socket.id, nickName });
    }
    this.userToRoom[socket.id] = roomId;

    // 방에 연결
    socket.join(roomId);

    // Lobby 유저에게 Room 정보 전달
    this.server.sockets.emit('get_rooms', this.rooms);

    const otherUsers = this.rooms[roomId].users.filter((user) => user.id !== socket.id);

    // 유저에게 이미 방에 있는 다른 유저 정보 주기
    if (otherUsers.length === 0) return;
    this.server.sockets.to(socket.id).emit('peer', otherUsers[0]);

    //채팅 메시지 날려보기
    socket.to(roomId).emit('message', {
      message: `${otherUsers[0].nickName}가 들어왔습니다.`,
    });

    this.logger.log(`nickName: ${nickName}, userId: ${socket.id}, join_room : ${roomId}`);
  }

  @SubscribeMessage('offer')
  offer(@ConnectedSocket() socket: Socket, @MessageBody() data: any): void {
    socket.to(data.offerReceiveID).emit('get_offer', {
      sdp: data.sdp,
      offerSendID: data.offerSendID,
      offerSendNickName: data.offerSendNickName,
    });
    this.logger.log(`offer from ${data.offerSendID} to ${data.offerReceiveID}`);
  }

  @SubscribeMessage('answer')
  answer(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    socket.to(data.answerReceiveID).emit('get_answer', data.sdp);
    this.logger.log(`answer from ${data.answerSendID} to ${data.answerReceiveID}`);
  }

  @SubscribeMessage('ice')
  ice(@ConnectedSocket() socket: Socket, @MessageBody() data: any) {
    socket.to(data.candidateReceiveID).emit('get_ice', data.candidate);
    this.logger.log(`ice from ${data.candidateSendID} to ${data.candidateReceiveID}`);
  }

  @SubscribeMessage('message')
  handleMessage(@ConnectedSocket() socket: Socket, @MessageBody() message: string) {
    // socket.broadcast.emit('message', { username: socket.id, message });
    // const roomId = this.userToRoom[socket.id];
    const roomId = this.userToRoom[socket.id];
    // const userInfo = this.rooms[roomId].users.filter((user) => user.id === socket.id);
    // socket.broadcast.to(roomId).emit('message', { username: socket.id, message });
    const userInfo = this.rooms[roomId].users.filter((user) => user.id === socket.id);
    socket.to(roomId).emit('message', { username: userInfo[0].nickName, message });
    // socket.to(roomId).emit('message', { username: socket.id, message });
    return { username: socket.id, message };
  }
}

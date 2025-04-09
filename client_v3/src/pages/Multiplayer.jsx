import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { io } from 'socket.io-client';
import '../styles/Multiplayer.css';

const SOCKET_URL = 'http://localhost:3000';

const Multiplayer = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState([]);
  const [roomUrl, setRoomUrl] = useState('');
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [socket, setSocket] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize socket connection
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    // Socket event listeners
    newSocket.on('updatePlayers', ({ players }) => {
      setPlayers(players);
    });

    newSocket.on('roomClosed', ({ message }) => {
      alert(message || '房主已断开连接，房间已关闭。');
      setError('房间已关闭');
      navigate('/multiplayer');
    });

    newSocket.on('error', ({ message }) => {
      alert(`错误: ${message}`);
      setError(message);
      setIsJoined(false);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [navigate]);

  useEffect(() => {
    if (!roomId) {
      // Create new room if no roomId in URL
      const newRoomId = uuidv4();
      setIsHost(true);
      navigate(`/multiplayer/${newRoomId}`);
    } else {
      // Set room URL for sharing
      setRoomUrl(window.location.href);
    }
  }, [roomId, navigate]);

  const handleJoinRoom = () => {
    if (!username.trim()) {
      alert('请输入用户名');
      setError('请输入用户名');
      return;
    }

    setError('');
    if (isHost) {
      socket.emit('createRoom', { roomId, username });
    } else {
      socket.emit('joinRoom', { roomId, username });
    }
    setIsJoined(true);
  };

  const copyRoomUrl = () => {
    navigator.clipboard.writeText(roomUrl);
    // TODO: Add toast notification
  };

  if (!roomId) {
    return <div>Loading...</div>;
  }

  return (
    <div className="multiplayer-container">
      {!isJoined ? (
        <div className="join-container">
          <h2>{isHost ? '创建房间' : '加入房间'}</h2>
          <input
            type="text"
            placeholder="输入用户名"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="username-input"
          />
          <button onClick={handleJoinRoom} className="join-button">
            {isHost ? '创建' : '加入'}
          </button>
          {error && <p className="error-message">{error}</p>}
        </div>
      ) : (
        <>
          {isHost && (
            <div className="host-controls">
              <h2>房间链接</h2>
              <div className="room-url-container">
                <input
                  type="text"
                  value={roomUrl}
                  readOnly
                  className="room-url-input"
                />
                <button onClick={copyRoomUrl} className="copy-button">
                  复制链接
                </button>
              </div>
            </div>
          )}
          <div className="players-list">
            <h2>玩家 ({players.length})</h2>
            <ul>
              {players.map((player) => (
                <li key={player.id}>
                  {player.username} {player.isHost && '(房主)'}
                </li>
              ))}
            </ul>
          </div>
          {isHost && (
            <button className="start-game-button" disabled={players.length < 2}>
              开始游戏
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default Multiplayer; 
import React, { useState } from 'react';

const PlayerList = ({ players, socket, isGameStarted, handleReadyToggle }) => {
  const [showNames, setShowNames] = useState(true);

  return (
    <div className="players-list">
      <table className="score-table">
        <thead>
          <tr>
            <th></th>
            <th>
              <button 
                onClick={() => setShowNames(!showNames)} 
                style={{ 
                  background: 'none', 
                  border: 'none', 
                  cursor: 'pointer',
                  padding: '0',
                  margin: '0',
                  height: 'auto',
                  lineHeight: '1',
                  fontSize: 'inherit',
                  outline: 'none'
                }}
              >
                {showNames ? '名' : '无名'}
              </button>
            </th>
            <th>分</th>
            <th>猜</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id}>
              <td>
                {player.disconnected ? '已断开' : player.isHost ? (
                  '房主'
                ) : player.id === socket?.id && !isGameStarted ? (
                  <button 
                    onClick={handleReadyToggle}
                    className={`ready-button ${player.ready ? 'ready' : ''}`}
                  >
                    {player.ready ? '取消准备' : '准备'}
                  </button>
                ) : (
                  player.ready ? '已准备' : '未准备'
                )}
              </td>
              <td>
                <span style={{
                  backgroundColor: !showNames && player.id !== socket?.id ? '#000' : 'transparent',
                  color: !showNames && player.id !== socket?.id ? '#000' : 'inherit',
                  padding: !showNames && player.id !== socket?.id ? '2px 4px' : '0'
                }}>
                  {player.username}
                </span>
              </td>
              <td>{player.score}</td>
              <td>{player.guesses || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlayerList; 
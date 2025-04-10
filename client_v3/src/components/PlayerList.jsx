import React from 'react';

const PlayerList = ({ players, socket, isGameStarted, handleReadyToggle }) => {
  return (
    <div className="players-list">
      <table className="score-table">
        <thead>
          <tr>
            <th></th>
            <th>名</th>
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
              <td>{player.username}</td>
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
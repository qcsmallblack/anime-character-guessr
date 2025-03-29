import '../styles/game.css';

function GameInfo({ gameEnd, guessesLeft, onRestart }) {
  return (
    <div className="game-info">
      {gameEnd ? (
        <button className="restart-button" onClick={onRestart}>
          再玩一次
        </button>
      ) : (
        <span>剩余次数: {guessesLeft}</span>
      )}
    </div>
  );
}

export default GameInfo; 
import { useState, useEffect } from 'react';

const Timer = ({ timeLimit, onTimeUp, isActive, reset }) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit);

  // Reset timer when timeLimit changes (game initialization) or reset is true
  useEffect(() => {
    if (reset || timeLimit !== timeLeft) {
      setTimeLeft(timeLimit);
    }
  }, [timeLimit, reset]);

  // Handle countdown
  useEffect(() => {
    let timer;
    if (isActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            onTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive, timeLeft, onTimeUp]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="timer">
      {timeLimit && <span>{formatTime(timeLeft)}</span>}
    </div>
  );
};

export default Timer; 
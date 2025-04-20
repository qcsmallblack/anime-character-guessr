import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import '../styles/Home.css';

const Home = () => {
  const [roomCount, setRoomCount] = useState(0);

  useEffect(() => {
    const serverUrl = import.meta.env.VITE_SERVER_URL;
    fetch(`${serverUrl}/room-count`)
      .then(response => response.json())
      .then(data => setRoomCount(data.count))
      .catch(error => console.error('Error fetching room count:', error));
  }, []);

  return (
    <div className="home-container">
      <div className="game-modes">
        <Link to="/singleplayer" className="mode-button">
          <h2>单人</h2>
        </Link>
	{/*
        <Link to="/multiplayer" className="mode-button">
          <h2>多人</h2>
          <small>当前房间数: {roomCount}/300</small>
        </Link>
	*/}
      </div>
      <div className="home-footer">
        <p>
          试试看自己能否猜出动漫角色吧！<br/>
          数据来源<a href="https://bgm.tv/">Bangumi</a>。<br/>
          感谢<a href="https://github.com/kennylimz/anime-character-guessr">原仓库</a>的各位作者。<br/>
          <a href="https://beian.miit.gov.cn/" target="_blank">陕ICP备2024052310号-1</a><br/>
          <img src="/src/assets/beian.png" width="16" alt="公安备案号图标"/>
          <a href="https://beian.mps.gov.cn/#/query/webSearch?code=61010302001257" rel="noreferrer" target="_blank">陕公网安备61010302001257号</a>
        </p>
      </div>
    </div>
  );
};

export default Home; 

import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import './App.css';

const socket = io('http://localhost:3000');

function App() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [guessesLeft, setGuessesLeft] = useState(10);
  const [isSearching, setIsSearching] = useState(false);
  const [isGuessing, setIsGuessing] = useState(false);
  const [gameEnd, setGameEnd] = useState(false);
  const searchContainerRef = useRef(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [gameEndPopup, setGameEndPopup] = useState(null);

  const getGenderEmoji = (gender) => {
    switch (gender) {
      case 'male':
        return '♂️';
      case 'female':
        return '♀️';
      default:
        return '❓';
    }
  };

  // Socket event handlers
  useEffect(() => {
    socket.on('guess-feedback', async (data) => {
      const { feedback, guessesLeft: remainingGuesses, gameEnd: isGameEnd, result, answer } = data;
      setGuessesLeft(remainingGuesses);
      
      // Add new guess to the list using the stored selected character info
      setGuesses(prevGuesses => [...prevGuesses, {
        icon: selectedCharacter?.image,
        name: selectedCharacter?.name,
        nameCn: selectedCharacter?.nameCn,
        gender: feedback.gender.guess,
        genderFeedback: feedback.gender.feedback,
        cv: feedback.cv.guess,
        cvFeedback: feedback.cv.feedback,
        lastAppearance: feedback.lastAppearanceDate.guess,
        lastAppearanceFeedback: feedback.lastAppearanceDate.feedback,
        lastAppearanceRating: feedback.rating.guess,
        ratingFeedback: feedback.rating.feedback,
        popularity: selectedCharacter?.popularity,
        popularityFeedback: feedback.popularity.feedback,
        sharedAppearances: feedback.shared_appearances,
        metaTags: feedback.metaTags.guess,
        sharedMetaTags: feedback.metaTags.shared,
        isAnswer: isGameEnd ? selectedCharacter?.name === answer.name : false
      }]);

      if (isGameEnd) {
        setGameEnd(true);
        try {
          // Fetch additional character details
          const response = await axios.get(`https://api.bgm.tv/v0/characters/${answer.id}`);
          const characterData = response.data;
          
          // Handle game end with popup after fetching additional details
          setGameEndPopup({
            result,
            answer: {
              id: answer.id,
              name: characterData.name,
              nameCn: characterData.infobox?.find(item => item.key === '简体中文名')?.value || characterData.name,
              image: characterData.images.medium,
              gender: answer.gender,
              cv: answer.cv,
              popularity: answer.popularity,
              lastAppearance: answer.lastAppearanceDate,
              lastAppearanceRating: answer.rating,
              metaTags: answer.metaTags,
              summary: characterData.summary
            }
          });
        } catch (error) {
          console.error('Failed to fetch character details:', error);
          // Fallback to original data if API request fails
          setGameEndPopup({
            result,
            answer: {
              name: answer.name,
              nameCn: answer.nameCn,
              image: answer.image,
              gender: answer.gender,
              cv: answer.cv,
              popularity: answer.popularity,
              lastAppearance: answer.lastAppearanceDate,
              lastAppearanceRating: answer.rating,
              metaTags: answer.metaTags,
              summary: null
            }
          });
        }
      }
      
      setIsGuessing(false);
      setSelectedCharacter(null);
    });

    socket.on('error', (error) => {
      console.error('Game error:', error);
      alert('出错了，请重试');
      setIsGuessing(false);
    });

    return () => {
      socket.off('guess-feedback');
      socket.off('error');
    };
  }, [selectedCharacter]);

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchResults([]);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced search function
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await axios.post('https://api.bgm.tv/v0/search/characters', {
        keyword: searchQuery.trim()
      });
      
      setSearchResults(response.data.data.map(character => ({
        id: character.id,
        image: character.images.grid,
        name: character.name,
        nameCn: character.infobox.find(item => item.key === "简体中文名")?.value || character.name,
        gender: character.gender,
        popularity: character.stat.collects
      })));
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCharacterSelect = (character) => {
    if (isGuessing) return; // Prevent multiple guesses while waiting
    
    setIsGuessing(true);
    setSelectedCharacter(character); // Store selected character before clearing search
    socket.emit('guess', {
      id: character.id,
      gender: character.gender,
      popularity: character.popularity
    });
    
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleClosePopup = () => {
    setGameEndPopup(null);
  };

  return (
    <div className="container">
      {/* Search Section */}
      <div className="search-section">
        <div className="search-box">
          <div className="search-input-container" ref={searchContainerRef}>
            <input
              type="text"
              className="search-input"
              placeholder="搜不到去bangumi找全名"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={isGuessing || gameEnd}
            />
            {searchResults.length > 0 && (
              <div className="search-dropdown">
                {searchResults.map((character) => (
                  <div
                    key={character.id}
                    className="search-result-item"
                    onClick={() => handleCharacterSelect(character)}
                  >
                    <img 
                      src={character.image} 
                      alt={character.name} 
                      className="result-character-icon"
                    />
                    <div className="result-character-info">
                      <div className="result-character-name">{character.name}</div>
                      <div className="result-character-name-cn">{character.nameCn}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button 
            className="search-button"
            onClick={handleSearch}
            disabled={!searchQuery.trim() || isSearching || isGuessing || gameEnd}
          >
            {isSearching ? '搜索中...' : isGuessing ? '猜测中...' : '搜索'}
          </button>
        </div>
      </div>

      {/* Game Info */}
      <div className="game-info">
        {gameEnd ? (
          <button className="restart-button" onClick={() => window.location.reload()}>
            再玩一次
          </button>
        ) : (
          <span>剩余次数: {guessesLeft}</span>
        )}
      </div>

      {/* Guesses Table */}
      <div className="table-container">
        <table className="guesses-table">
          <thead>
            <tr>
              <th></th>
              <th>名字</th>
              <th>性别</th>
              <th>声优</th>
              <th>收藏量</th>
              <th>最后登场</th>
              <th>标签</th>
              <th>共同出演</th>
            </tr>
          </thead>
          <tbody>
            {guesses.map((guess, index) => (
              <tr key={index}>
                <td>
                  <img src={guess.icon} alt="character" className="character-icon" />
                </td>
                <td>
                  <div className={`character-name-container ${guess.isAnswer ? 'correct' : ''}`}>
                    <div className="character-name">{guess.name}</div>
                    <div className="character-name-cn">{guess.nameCn}</div>
                  </div>
                </td>
                <td>
                  <span className={`feedback-cell ${guess.genderFeedback === 'yes' ? 'correct' : ''}`}>
                    {getGenderEmoji(guess.gender)}
                  </span>
                </td>
                <td>
                  <span className={`feedback-cell ${guess.cvFeedback === 'yes' ? 'correct' : ''}`}>
                    {guess.cv}
                  </span>
                </td>
                <td>
                  <span className={`feedback-cell ${guess.popularityFeedback === '=' ? 'correct' : (guess.popularityFeedback === '+' || guess.popularityFeedback === '-') ? 'partial' : ''}`}>
                    {guess.popularity}{(guess.popularityFeedback === '+' || guess.popularityFeedback === '++') ? ' ↓' : (guess.popularityFeedback === '-' || guess.popularityFeedback === '--') ? ' ↑' : ''}
                  </span>
                </td>
                <td>
                  <div className="appearance-container">
                    <div className={`appearance-rating ${guess.ratingFeedback === '=' ? 'correct' : (guess.ratingFeedback === '+' || guess.ratingFeedback === '-') ? 'partial' : ''}`}>
                      {guess.lastAppearanceRating}{(guess.ratingFeedback === '+' || guess.ratingFeedback === '++') ? ' ↓' : (guess.ratingFeedback === '-' || guess.ratingFeedback === '--') ? ' ↑' : ''}
                    </div>
                    <div className={`appearance-year ${guess.lastAppearanceFeedback === '=' ? 'correct' : (guess.lastAppearanceFeedback === '+' || guess.lastAppearanceFeedback === '-') ? 'partial' : ''}`}>
                      {guess.lastAppearance}{(guess.lastAppearanceFeedback === '+' || guess.lastAppearanceFeedback === '++') ? ' ↓' : (guess.lastAppearanceFeedback === '-' || guess.lastAppearanceFeedback === '--') ? ' ↑' : ''}
                    </div>
                  </div>
                </td>
                <td>
                  <div className="meta-tags-container">
                    {guess.metaTags.map((tag, tagIndex) => (
                      <span 
                        key={tagIndex}
                        className={`meta-tag ${guess.sharedMetaTags.includes(tag) ? 'shared' : ''}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <span className={`shared-appearances ${guess.sharedAppearances.count > 0 ? 'has-shared' : ''}`}>
                    {guess.sharedAppearances.first}
                    {guess.sharedAppearances.count > 1 && ` +${guess.sharedAppearances.count - 1}`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Game End Popup */}
      {gameEndPopup && (
        <div className="popup-overlay">
          <div className="popup-content">
            <button className="popup-close" onClick={handleClosePopup}>×</button>
            <div className="popup-header">
              <h2>{gameEndPopup.result === 'win' ? '🎉 给你猜对了，有点东西' : '😢 已经结束咧'}</h2>
            </div>
            <div className="popup-body">
              <div className="answer-character">
                <img 
                  src={gameEndPopup.answer.image} 
                  alt={gameEndPopup.answer.name} 
                  className="answer-character-image"
                />
                <div className="answer-character-info">
                  <a 
                    href={`https://bgm.tv/character/${gameEndPopup.answer.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="character-link"
                  >
                    <div className="answer-character-name">{gameEndPopup.answer.name}</div>
                    <div className="answer-character-name-cn">{gameEndPopup.answer.nameCn}</div>
                  </a>
                  {gameEndPopup.answer.summary && (
                    <div className="answer-summary">
                      <div className="summary-content">{gameEndPopup.answer.summary}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

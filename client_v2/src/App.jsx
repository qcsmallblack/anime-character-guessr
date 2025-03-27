import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { getRandomCharacter, getCharacterAppearances, getCharacterCV, generateFeedback } from './services/animeService';
import './App.css';

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
  const [answerCharacter, setAnswerCharacter] = useState(null);

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

  // Initialize game
  useEffect(() => {
    const initializeGame = async () => {
      try {
        const character = await getRandomCharacter();
        setAnswerCharacter(character);
      } catch (error) {
        console.error('Failed to initialize game:', error);
        alert('游戏初始化失败，请刷新页面重试');
      }
    };

    initializeGame();
  }, []);

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

  const handleCharacterSelect = async (character) => {
    if (isGuessing || !answerCharacter) return; // Prevent multiple guesses while waiting
    
    setIsGuessing(true);
    setSelectedCharacter(character); // Store selected character before clearing search
    
    try {
      // Get additional character details
      const appearances = await getCharacterAppearances(character.id);
      const cv = await getCharacterCV(character.id);
      
      const guessData = {
        ...character,
        appearances: appearances.appearances,
        lastAppearanceDate: appearances.lastAppearanceDate,
        lastAppearanceRating: appearances.lastAppearanceRating,
        metaTags: appearances.metaTags,
        cv
      };

      // Check if guess is correct
      const isCorrect = guessData.id === answerCharacter.id;
      setGuessesLeft(prev => prev - 1);

      if (isCorrect) {
        // Correct guess - game over
        setGuesses(prevGuesses => [...prevGuesses, {
          icon: guessData.image,
          name: guessData.name,
          nameCn: guessData.nameCn,
          gender: guessData.gender,
          genderFeedback: 'yes',
          cv: guessData.cv,
          cvFeedback: 'yes',
          lastAppearance: guessData.lastAppearanceDate,
          lastAppearanceFeedback: '=',
          lastAppearanceRating: guessData.lastAppearanceRating,
          ratingFeedback: '=',
          popularity: guessData.popularity,
          popularityFeedback: '=',
          sharedAppearances: {
            first: appearances.appearances[0] || '',
            count: appearances.appearances.length
          },
          metaTags: guessData.metaTags,
          sharedMetaTags: guessData.metaTags,
          isAnswer: true
        }]);

        setGameEnd(true);
        setGameEndPopup({
          result: 'win',
          answer: answerCharacter
        });
      } else if (guessesLeft <= 1) {
        // Game over - out of attempts
        const feedback = generateFeedback(guessData, answerCharacter);
        setGuesses(prevGuesses => [...prevGuesses, {
          icon: guessData.image,
          name: guessData.name,
          nameCn: guessData.nameCn,
          gender: guessData.gender,
          genderFeedback: feedback.gender.feedback,
          cv: guessData.cv,
          cvFeedback: feedback.cv.feedback,
          lastAppearance: guessData.lastAppearanceDate,
          lastAppearanceFeedback: feedback.lastAppearanceDate.feedback,
          lastAppearanceRating: guessData.lastAppearanceRating,
          ratingFeedback: feedback.rating.feedback,
          popularity: guessData.popularity,
          popularityFeedback: feedback.popularity.feedback,
          sharedAppearances: feedback.shared_appearances,
          metaTags: guessData.metaTags,
          sharedMetaTags: feedback.metaTags.shared,
          isAnswer: false
        }]);

        setGameEnd(true);
        setGameEndPopup({
          result: 'lose',
          answer: answerCharacter
        });
      } else {
        // Continue game
        const feedback = generateFeedback(guessData, answerCharacter);
        setGuesses(prevGuesses => [...prevGuesses, {
          icon: guessData.image,
          name: guessData.name,
          nameCn: guessData.nameCn,
          gender: guessData.gender,
          genderFeedback: feedback.gender.feedback,
          cv: guessData.cv,
          cvFeedback: feedback.cv.feedback,
          lastAppearance: guessData.lastAppearanceDate,
          lastAppearanceFeedback: feedback.lastAppearanceDate.feedback,
          lastAppearanceRating: guessData.lastAppearanceRating,
          ratingFeedback: feedback.rating.feedback,
          popularity: guessData.popularity,
          popularityFeedback: feedback.popularity.feedback,
          sharedAppearances: feedback.shared_appearances,
          metaTags: guessData.metaTags,
          sharedMetaTags: feedback.metaTags.shared,
          isAnswer: false
        }]);
      }
    } catch (error) {
      console.error('Error processing guess:', error);
      alert('出错了，请重试');
    } finally {
      setIsGuessing(false);
      setSelectedCharacter(null);
      setSearchQuery('');
      setSearchResults([]);
    }
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

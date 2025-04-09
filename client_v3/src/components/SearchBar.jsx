import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/search.css';

function SearchBar({ onCharacterSelect, isGuessing, gameEnd }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchContainerRef = useRef(null);

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
        image: character.images?.grid || null,
        name: character.name,
        nameCn: character.infobox.find(item => item.key === "简体中文名")?.value || character.name,
        gender: character.gender || '?',
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
    onCharacterSelect(character);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className="search-section">
      <div className="search-box">
        <div className="search-input-container" ref={searchContainerRef}>
          <input
            type="text"
            className="search-input"
            placeholder="搜不到？去bangumi找别名"
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
                  {character.image ? (
                    <img 
                      src={character.image} 
                      alt={character.name} 
                      className="result-character-icon"
                    />
                  ) : (
                    <div className="result-character-icon no-image">
                      无图片
                    </div>
                  )}
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
          {isSearching ? '在搜了...' : isGuessing ? '在猜了...' : 'GO'}
        </button>
      </div>
    </div>
  );
}

export default SearchBar; 
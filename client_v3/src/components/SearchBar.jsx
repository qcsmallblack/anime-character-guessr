import { useRef, useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/search.css';

function SearchBar({ onCharacterSelect, isGuessing, gameEnd }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialSearch, setIsInitialSearch] = useState(true);
  const searchContainerRef = useRef(null);
  const INITIAL_LIMIT = 10;
  const MORE_LIMIT = 5;

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSearchResults([]);
        setOffset(0);
        setHasMore(true);
        setIsInitialSearch(true);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset pagination when search query changes
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    setSearchResults([]);
    setIsInitialSearch(true);
  }, [searchQuery]);

  // Debounced search function
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(true);
      } else {
        setSearchResults([]);
        setOffset(0);
        setHasMore(true);
        setIsInitialSearch(true);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearch = async (reset = false) => {
    if (!searchQuery.trim()) return;
    
    const currentLimit = isInitialSearch ? INITIAL_LIMIT : MORE_LIMIT;
    const currentOffset = isInitialSearch ? 0 : INITIAL_LIMIT + (offset - INITIAL_LIMIT);
    const loadingState = reset ? setIsSearching : setIsLoadingMore;
    
    loadingState(true);
    try {
      const response = await axios.post(
        `https://api.bgm.tv/v0/search/characters?limit=${currentLimit}&offset=${currentOffset}`,
        {
          keyword: searchQuery.trim()
        }
      );
      
      const newResults = response.data.data.map(character => ({
        id: character.id,
        image: character.images?.grid || null,
        name: character.name,
        nameCn: character.infobox.find(item => item.key === "简体中文名")?.value || character.name,
        gender: character.gender || '?',
        popularity: character.stat.collects
      }));

      if (reset) {
        setSearchResults(newResults);
        setOffset(INITIAL_LIMIT);
        setIsInitialSearch(false);
      } else {
        setSearchResults(prev => [...prev, ...newResults]);
        setOffset(currentOffset + MORE_LIMIT);
      }
      
      setHasMore(newResults.length === currentLimit);
    } catch (error) {
      console.error('Search failed:', error);
      if (reset) {
        setSearchResults([]);
      }
    } finally {
      loadingState(false);
    }
  };

  const handleLoadMore = () => {
    handleSearch(false);
  };

  const handleCharacterSelect = (character) => {
    onCharacterSelect(character);
    setSearchQuery('');
    setSearchResults([]);
    setOffset(0);
    setHasMore(true);
    setIsInitialSearch(true);
  };

  return (
    <div className="search-section">
      <div className="search-box">
        <div className="search-input-container" ref={searchContainerRef}>
          <input
            type="text"
            className="search-input"
            // placeholder="搜不到？去bangumi找别名"
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
              {hasMore && (
                <div 
                  className="search-result-item load-more"
                  onClick={handleLoadMore}
                >
                  {isLoadingMore ? '加载中...' : '更多'}
                </div>
              )}
            </div>
          )}
        </div>
        <button 
          className="search-button"
          onClick={() => handleSearch(true)}
          disabled={!searchQuery.trim() || isSearching || isGuessing || gameEnd}
        >
          {isSearching ? '在搜了...' : isGuessing ? '在猜了...' : 'GO'}
        </button>
      </div>
    </div>
  );
}

export default SearchBar; 
import { useEffect, useState } from 'react';
import { getRandomCharacter, getCharacterAppearances, generateFeedback } from './utils/anime';
import SearchBar from './components/SearchBar';
import GuessesTable from './components/GuessesTable';
import SettingsPopup from './components/SettingsPopup';
import HelpPopup from './components/HelpPopup';
import GameEndPopup from './components/GameEndPopup';
import SocialLinks from './components/SocialLinks';
import GameInfo from './components/GameInfo';
import './styles/game.css';

function App() {
  const [guesses, setGuesses] = useState([]);
  const [guessesLeft, setGuessesLeft] = useState(10);
  const [isGuessing, setIsGuessing] = useState(false);
  const [gameEnd, setGameEnd] = useState(false);
  const [gameEndPopup, setGameEndPopup] = useState(null);
  const [answerCharacter, setAnswerCharacter] = useState(null);
  const [settingsPopup, setSettingsPopup] = useState(false);
  const [helpPopup, setHelpPopup] = useState(false);
  const [hints, setHints] = useState({
    first: null,
    second: null
  });
  const [gameSettings, setGameSettings] = useState({
    startYear: new Date().getFullYear()-10,
    endYear: new Date().getFullYear(),
    topNSubjects: 50,
    metaTags: ["", "", ""],
    useIndex: false,
    indexId: null,
    addedSubjects: [],
    mainCharacterOnly: true,
    characterNum: 6,
    maxAttempts: 10,
    enableHints: true
  });

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
    let isMounted = true;

    const initializeGame = async () => {
      try {
        const character = await getRandomCharacter(gameSettings);
        if (isMounted) {
          setAnswerCharacter(character);
          setGuessesLeft(gameSettings.maxAttempts);
          // Prepare hints based on settings
          let hintTexts = ['🚫提示未启用', '🚫提示未启用'];
          if (gameSettings.enableHints && character.summary) {
            // Split summary into sentences using Chinese punctuation
            const sentences = character.summary.split(/[。、，。！？]/).filter(s => s.trim());
            if (sentences.length > 0) {
              // Randomly select 2 sentences if available
              const selectedIndices = new Set();
              while (selectedIndices.size < Math.min(2, sentences.length)) {
                selectedIndices.add(Math.floor(Math.random() * sentences.length));
              }
              hintTexts = Array.from(selectedIndices).map(i => "……"+sentences[i].trim()+"……");
            }
          }
          setHints({
            first: hintTexts[0],
            second: hintTexts[1]
          });
          console.log('初始化游戏', gameSettings);
        }
      } catch (error) {
        console.error('Failed to initialize game:', error);
        if (isMounted) {
          alert('游戏初始化失败，请刷新页面重试');
        }
      }
    };

    initializeGame();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCharacterSelect = async (character) => {
    if (isGuessing || !answerCharacter) return;
    
    setIsGuessing(true);
    
    try {
      const appearances = await getCharacterAppearances(character.id);
      
      const guessData = {
        ...character,
        ...appearances
      };

      const isCorrect = guessData.id === answerCharacter.id;
      setGuessesLeft(prev => prev - 1);

      if (isCorrect) {
        setGuesses(prevGuesses => [...prevGuesses, {
          icon: guessData.image,
          name: guessData.name,
          nameCn: guessData.nameCn,
          gender: guessData.gender,
          genderFeedback: 'yes',
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
        const feedback = generateFeedback(guessData, answerCharacter);
        setGuesses(prevGuesses => [...prevGuesses, {
          icon: guessData.image,
          name: guessData.name,
          nameCn: guessData.nameCn,
          gender: guessData.gender,
          genderFeedback: feedback.gender.feedback,
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
        const feedback = generateFeedback(guessData, answerCharacter);
        setGuesses(prevGuesses => [...prevGuesses, {
          icon: guessData.image,
          name: guessData.name,
          nameCn: guessData.nameCn,
          gender: guessData.gender,
          genderFeedback: feedback.gender.feedback,
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
    }
  };

  const handleSettingsChange = (setting, value) => {
    setGameSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleRestartWithSettings = () => {
    setGuesses([]);
    setGuessesLeft(gameSettings.maxAttempts);
    setIsGuessing(false);
    setGameEnd(false);
    setGameEndPopup(null);
    setAnswerCharacter(null);
    setSettingsPopup(false);
    setHints({
      first: null,
      second: null
    });

    const initializeNewGame = async () => {
      try {
        const character = await getRandomCharacter(gameSettings);
        setAnswerCharacter(character);
        // Prepare hints based on settings for new game
        let hintTexts = ['🚫提示未启用', '🚫提示未启用'];
        if (gameSettings.enableHints && character.summary) {
          // Split summary into sentences using Chinese punctuation
          const sentences = character.summary.split(/[。、，。！？]/).filter(s => s.trim());
          if (sentences.length > 0) {
            // Randomly select 2 sentences if available
            const selectedIndices = new Set();
            while (selectedIndices.size < Math.min(2, sentences.length)) {
              selectedIndices.add(Math.floor(Math.random() * sentences.length));
            }
            hintTexts = Array.from(selectedIndices).map(i => "……"+sentences[i].trim()+"……");
          }
        }
        setHints({
          first: hintTexts[0],
          second: hintTexts[1]
        });
        console.log('初始化游戏', gameSettings);
      } catch (error) {
        console.error('Failed to initialize new game:', error);
        alert('游戏初始化失败，请重试');
      }
    };

    initializeNewGame();
  };

  return (
    <div className="container">
      <SocialLinks 
        onSettingsClick={() => setSettingsPopup(true)}
        onHelpClick={() => setHelpPopup(true)}
      />

      <SearchBar 
        onCharacterSelect={handleCharacterSelect}
        isGuessing={isGuessing}
        gameEnd={gameEnd}
      />

      <GameInfo 
        gameEnd={gameEnd}
        guessesLeft={guessesLeft}
        onRestart={handleRestartWithSettings}
        answerCharacter={answerCharacter}
        hints={hints}
      />

      <GuessesTable 
        guesses={guesses}
        getGenderEmoji={getGenderEmoji}
      />

      {settingsPopup && (
        <SettingsPopup 
          gameSettings={gameSettings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setSettingsPopup(false)}
          onRestart={handleRestartWithSettings}
        />
      )}

      {helpPopup && (
        <HelpPopup onClose={() => setHelpPopup(false)} />
      )}

      {gameEndPopup && (
        <GameEndPopup 
          result={gameEndPopup.result}
          answer={gameEndPopup.answer}
          onClose={() => setGameEndPopup(null)}
        />
      )}
    </div>
  );
}

export default App;

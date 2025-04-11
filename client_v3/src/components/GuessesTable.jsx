import '../styles/guesses.css';

function GuessesTable({ guesses }) {
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

  return (
    <div className="table-container">
      <table className="guesses-table">
        <thead>
          <tr>
            <th></th>
            <th>名字</th>
            <th>性别</th>
            <th>人气</th>
            <th>作品数<br/>最高分</th>
            <th>最早登场<br/>最晚登场</th>
            <th>作品标签</th>
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
                <span className={`feedback-cell ${guess.popularityFeedback === '=' ? 'correct' : (guess.popularityFeedback === '+' || guess.popularityFeedback === '-') ? 'partial' : ''}`}>
                  {guess.popularity}{(guess.popularityFeedback === '+' || guess.popularityFeedback === '++') ? ' ↓' : (guess.popularityFeedback === '-' || guess.popularityFeedback === '--') ? ' ↑' : ''}
                </span>
              </td>
              <td>
                <div className="appearance-container">
                  <div className={`feedback-cell appearance-count ${guess.appearancesCountFeedback === '=' ? 'correct' : (guess.appearancesCountFeedback === '+' || guess.appearancesCountFeedback === '-') ? 'partial' : guess.appearancesCountFeedback === '?' ? 'unknown' : ''}`}>
                    {guess.appearancesCount}{(guess.appearancesCountFeedback === '+' || guess.appearancesCountFeedback === '++') ? ' ↓' : (guess.appearancesCountFeedback === '-' || guess.appearancesCountFeedback === '--') ? ' ↑' : ''}
                  </div>
                  <div className={`feedback-cell appearance-rating ${guess.ratingFeedback === '=' ? 'correct' : (guess.ratingFeedback === '+' || guess.ratingFeedback === '-') ? 'partial' : guess.ratingFeedback === '?' ? 'unknown' : ''}`}>
                    {guess.highestRating === -1 ? '无' : guess.highestRating}{(guess.ratingFeedback === '+' || guess.ratingFeedback === '++') ? ' ↓' : (guess.ratingFeedback === '-' || guess.ratingFeedback === '--') ? ' ↑' : ''}
                  </div>
                </div>
              </td>
              <td>
                <div className="appearance-container">
                  <div className={`feedback-cell earliestAppearance ${guess.earliestAppearanceFeedback === '=' ? 'correct' : (guess.earliestAppearanceFeedback === '+' || guess.earliestAppearanceFeedback === '-') ? 'partial' : guess.earliestAppearanceFeedback === '?' ? 'unknown' : ''}`}>
                    {guess.earliestAppearance === -1 ? '无' : guess.earliestAppearance}{(guess.earliestAppearanceFeedback === '+' || guess.earliestAppearanceFeedback === '++') ? ' ↓' : (guess.earliestAppearanceFeedback === '-' || guess.earliestAppearanceFeedback === '--') ? ' ↑' : ''}
                  </div>
                  <div className={`feedback-cell latestAppearance ${guess.latestAppearanceFeedback === '=' ? 'correct' : (guess.latestAppearanceFeedback === '+' || guess.latestAppearanceFeedback === '-') ? 'partial' : guess.latestAppearanceFeedback === '?' ? 'unknown' : ''}`}>
                    {guess.latestAppearance === -1 ? '无' : guess.latestAppearance}{(guess.latestAppearanceFeedback === '+' || guess.latestAppearanceFeedback === '++') ? ' ↓' : (guess.latestAppearanceFeedback === '-' || guess.latestAppearanceFeedback === '--') ? ' ↑' : ''}
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
  );
}

export default GuessesTable; 
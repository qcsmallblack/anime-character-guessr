import '../styles/guesses.css';

function GuessesTable({ guesses, getGenderEmoji }) {
  return (
    <div className="table-container">
      <table className="guesses-table">
        <thead>
          <tr>
            <th></th>
            <th>名字</th>
            <th>性别</th>
            <th>人气</th>
            <th>BGM最高分<br/>最后登场</th>
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
                  <div className={`appearance-rating ${guess.ratingFeedback === '=' ? 'correct' : (guess.ratingFeedback === '+' || guess.ratingFeedback === '-') ? 'partial' : ''}`}>
                    {guess.highestRating}{(guess.ratingFeedback === '+' || guess.ratingFeedback === '++') ? ' ↓' : (guess.ratingFeedback === '-' || guess.ratingFeedback === '--') ? ' ↑' : ''}
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
  );
}

export default GuessesTable; 
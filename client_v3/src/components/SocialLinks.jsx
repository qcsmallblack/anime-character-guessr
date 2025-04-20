import '../styles/social.css';

function SocialLinks({ onSettingsClick, onHelpClick }) {
  return (
    <div className="social-links">
      <div className="difficulty-hint">
        <span>太难了？调下难度</span>
        <div className="arrow"></div>
      </div>
      <button className="social-link settings-button" onClick={onSettingsClick}>
        <i className="fas fa-cog"></i>
      </button>
      <a href="/" className="social-link" title="Home">
          <i className="fas fa-home"></i>
      </a>
      <button className="social-link help-button" onClick={onHelpClick}>
        <i className="fas fa-question-circle"></i>
      </button>
      <a href="https://bangumi.tv/" target="_blank" rel="noopener noreferrer" className="social-link">
        <img src="https://avatars.githubusercontent.com/u/7521082?s=200&v=4" alt="Bangumi" className="bangumi-icon" />
      </a>
      <a href="https://github.com/qcsmallblack/anime-character-guessr" target="_blank" rel="noopener noreferrer" className="social-link">
        <i className="fab fa-github"></i>
      </a>
      <a href="https://space.bilibili.com/143445536" target="_blank" rel="noopener noreferrer" className="social-link">
        <i className="fa-brands fa-bilibili"></i>
      </a>
    </div>
  );
}

export default SocialLinks; 

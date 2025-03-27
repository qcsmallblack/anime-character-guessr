import axios from 'axios';

const API_BASE_URL = 'https://api.bgm.tv/v0';

async function getSubjectDetails(subjectId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/subjects/${subjectId}`);

    if (!response.data) {
      throw new Error('No subject details found');
    }
    let year = response.data.date ? parseInt(response.data.date.split('-')[0]) : null;
    return {
      name: response.data.name_cn || response.data.name,
      year,
      meta_tags: response.data.meta_tags || [],
      rating: response.data.rating?.score || 0
    };
  } catch (error) {
    console.error('Error fetching subject details:', error);
    throw error;
  }
}

async function getCharacterAppearances(characterId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/characters/${characterId}/subjects`);

    if (!response.data || !response.data.length) {
      return {
        appearances: [],
        lastAppearanceDate: -1,
        lastAppearanceRating: 0,
        metaTags: []
      };
    }

    // Filter appearances by staff and type
    const filteredAppearances = response.data.filter(appearance => 
      (appearance.staff === '主角' || appearance.staff === '配角') && 
      appearance.type === 2
    );

    if (filteredAppearances.length === 0) {
      return {
        appearances: [],
        lastAppearanceDate: -1,
        lastAppearanceRating: 0,
        metaTags: []
      };
    }

    // Find the most recent valid year and get all appearance details
    let lastAppearanceDate = -1;
    let lastAppearanceRating = 0;
    const allMetaTags = new Set(); // Use Set to automatically handle duplicates

    // Get just the names and collect meta tags
    const appearances = await Promise.all(
      filteredAppearances.map(async appearance => {
        try {
          const details = await getSubjectDetails(appearance.id);
          if (details.year !== null && (lastAppearanceDate === -1 || details.year > lastAppearanceDate)) {
            lastAppearanceDate = details.year;
            lastAppearanceRating = details.rating;
          }
          // Add meta tags to the set
          details.meta_tags.forEach(tag => allMetaTags.add(tag));
          return details.name;
        } catch (error) {
          console.error(`Failed to get details for subject ${appearance.id}:`, error);
          return appearance.name_cn || appearance.name;
        }
      })
    );

    return {
      appearances,
      lastAppearanceDate,
      lastAppearanceRating,
      metaTags: Array.from(allMetaTags) // Convert Set back to array
    };
  } catch (error) {
    console.error('Error fetching character appearances:', error);
    return {
      appearances: [],
      lastAppearanceDate: -1,
      lastAppearanceRating: 0,
      metaTags: []
    };
  }
}

async function getCharacterCV(characterId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/characters/${characterId}/persons`);
    
    if (!response.data || !response.data.length) {
      return '未知';
    }

    // Filter for anime voice actors (subject_type = 2)
    const animeVAs = response.data.filter(person => person.subject_type === 2);

    if (animeVAs.length === 0) {
      return '未知';
    }

    // Count occurrences of each name
    const nameCounts = {};
    animeVAs.forEach(person => {
      nameCounts[person.name] = (nameCounts[person.name] || 0) + 1;
    });

    // Find the name with the highest count
    let mostCommonName = '未知';
    let maxCount = 0;
    for (const [name, count] of Object.entries(nameCounts)) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonName = name;
      }
    }

    return mostCommonName;
  } catch (error) {
    console.error('Error fetching character CV:', error);
    return '未知';
  }
}

async function getCharacterDetails(characterId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/characters/${characterId}`);

    if (!response.data) {
      throw new Error('No character details found');
    }

    // Extract Chinese name from infobox
    const nameCn = response.data.infobox?.find(item => item.key === '简体中文名')?.value || null;

    // Handle gender - only accept string values of 'male' or 'female'
    const gender = typeof response.data.gender === 'string' && 
      (response.data.gender === 'male' || response.data.gender === 'female') 
      ? response.data.gender 
      : '?';

    // Get CV
    const cv = await getCharacterCV(characterId);

    return {
      name_cn: nameCn,
      gender,
      popularity: response.data.stat.collects,
      cv
    };
  } catch (error) {
    console.error('Error fetching character details:', error);
    throw error;
  }
}

async function getCharactersBySubjectId(subjectId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/subjects/${subjectId}/characters`);

    if (!response.data || !response.data.length) {
      throw new Error('No characters found for this anime');
    }

    const filteredCharacters = response.data.filter(character => 
      character.relation === '主角'
    );

    if (filteredCharacters.length === 0) {
      throw new Error('No main or supporting characters found for this anime');
    }

    return filteredCharacters;
  } catch (error) {
    console.error('Error fetching characters:', error);
    throw error;
  }
}

async function getRandomCharacter() {
  try {
    // Generate random year between 2020-2025
    const offset = Math.floor(Math.random() * 100);
    
    // Search for anime from that year
    const response = await axios.post(`${API_BASE_URL}/search/subjects?limit=1&offset=${offset}`, {
      "sort": "heat",
      "filter": {
          "type": [2],
          "air_date": [
              `>=2018-01-01`,
              `<2026-01-01`
          ]
      }
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.data || !response.data.data.length === 0) {
      throw new Error('No anime found');
    }

    // Randomly select an anime from the results
    const selectedAnime = response.data.data[0];

    // Get characters for the selected anime
    const characters = await getCharactersBySubjectId(selectedAnime.id);
    
    // Randomly select a character
    const randomCharacterIndex = Math.floor(Math.random() * characters.length);
    const selectedCharacter = characters[randomCharacterIndex];

    // Get additional character details
    const characterDetails = await getCharacterDetails(selectedCharacter.id);

    // Get character appearances
    const appearances = await getCharacterAppearances(selectedCharacter.id);

    return {
      id: selectedCharacter.id,
      name: selectedCharacter.name,
      nameCn: characterDetails.name_cn,
      gender: characterDetails.gender,
      popularity: characterDetails.popularity,
      cv: characterDetails.cv,
      appearances: appearances.appearances,
      lastAppearanceDate: appearances.lastAppearanceDate,
      lastAppearanceRating: appearances.lastAppearanceRating,
      metaTags: appearances.metaTags
    };
  } catch (error) {
    console.error('Error getting random character:', error);
    throw error;
  }
}

function generateFeedback(guess, answerCharacter) {
  const result = {};

  result.gender = {
    guess: guess.gender,
    feedback: guess.gender === answerCharacter.gender ? 'yes' : 'no'
  };

  const popularityDiff = guess.popularity - answerCharacter.popularity;
  const fivePercent = answerCharacter.popularity * 0.05;
  const twentyPercent = answerCharacter.popularity * 0.2;
  let popularityFeedback;
  if (Math.abs(popularityDiff) <= fivePercent) {
    popularityFeedback = '=';
  } else if (popularityDiff > 0) {
    popularityFeedback = popularityDiff <= twentyPercent ? '+' : '++';
  } else {
    popularityFeedback = popularityDiff >= -twentyPercent ? '-' : '--';
  }
  result.popularity = {
    guess: guess.popularity,
    feedback: popularityFeedback
  };

  // Handle rating comparison
  const ratingDiff = guess.lastAppearanceRating - answerCharacter.lastAppearanceRating;
  const ratingFivePercent = answerCharacter.lastAppearanceRating * 0.02;
  const ratingTwentyPercent = answerCharacter.lastAppearanceRating * 0.1;
  let ratingFeedback;
  if (Math.abs(ratingDiff) <= ratingFivePercent) {
    ratingFeedback = '=';
  } else if (ratingDiff > 0) {
    ratingFeedback = ratingDiff <= ratingTwentyPercent ? '+' : '++';
  } else {
    ratingFeedback = ratingDiff >= -ratingTwentyPercent ? '-' : '--';
  }
  result.rating = {
    guess: guess.lastAppearanceRating,
    feedback: ratingFeedback
  };

  // Handle shared appearances
  const sharedAppearances = guess.appearances.filter(appearance => 
    answerCharacter.appearances.includes(appearance)
  );
  result.shared_appearances = {
    first: sharedAppearances[0] || '',
    count: sharedAppearances.length
  };

  // Handle meta tags
  const sharedMetaTags = guess.metaTags.filter(tag => 
    answerCharacter.metaTags.includes(tag)
  );
  result.metaTags = {
    guess: guess.metaTags,
    shared: sharedMetaTags
  };

  // Handle last appearance date comparison
  if (guess.lastAppearanceDate === -1 || answerCharacter.lastAppearanceDate === -1) {
    result.lastAppearanceDate = {
      guess: guess.lastAppearanceDate === -1 ? '?' : guess.lastAppearanceDate,
      feedback: guess.lastAppearanceDate === -1 && answerCharacter.lastAppearanceDate === -1 ? '=' : '?'
    };
  } else {
    const yearDiff = guess.lastAppearanceDate - answerCharacter.lastAppearanceDate;
    let yearFeedback;
    if (yearDiff === 0) {
      yearFeedback = '=';
    } else if (yearDiff > 0) {
      yearFeedback = yearDiff <= 1 ? '+' : '++';
    } else {
      yearFeedback = yearDiff >= -1 ? '-' : '--';
    }
    result.lastAppearanceDate = {
      guess: guess.lastAppearanceDate,
      feedback: yearFeedback
    };
  }

  result.cv = {
    guess: guess.cv,
    feedback: guess.cv === answerCharacter.cv ? 'yes' : 'no'
  };

  return result;
}

export {
  getRandomCharacter,
  getCharacterAppearances,
  getCharacterCV,
  generateFeedback
}; 
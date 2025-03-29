import axios from 'axios';

const API_BASE_URL = 'https://api.bgm.tv';

async function getSubjectDetails(subjectId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/v0/subjects/${subjectId}`);

    if (!response.data) {
      throw new Error('No subject details found');
    }

    // Get air date and current date
    const airDate = response.data.date;
    const currentDate = new Date();
    
    // If air date is in the future, return null to indicate this show should be ignored
    if (airDate && new Date(airDate) > currentDate) {
      return null;
    }

    let year = airDate ? parseInt(airDate.split('-')[0]) : null;
    
    // Extract meta tags and add animation studios
    const meta_tags = response.data.meta_tags || [];
    const animationStudio = response.data.infobox?.find(item => item.key === '动画制作')?.value;
    if (animationStudio) {
      // Split by '×' and trim whitespace from each studio
      const studios = animationStudio.split('×').map(studio => studio.trim());
      meta_tags.push(...studios);
    }

    return {
      name: response.data.name_cn || response.data.name,
      year,
      meta_tags,
      rating: response.data.rating?.score || 0
    };
  } catch (error) {
    console.error('Error fetching subject details:', error);
    throw error;
  }
}

async function getCharacterAppearances(characterId) {
  try {
    const [subjectsResponse, personsResponse] = await Promise.all([
      axios.get(`${API_BASE_URL}/v0/characters/${characterId}/subjects`),
      axios.get(`${API_BASE_URL}/v0/characters/${characterId}/persons`)
    ]);

    if (!subjectsResponse.data || !subjectsResponse.data.length) {
      return {
        appearances: [],
        lastAppearanceDate: -1,
        lastAppearanceRating: 0,
        metaTags: []
      };
    }

    // Filter appearances by staff and type
    const filteredAppearances = subjectsResponse.data.filter(appearance => 
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
          // Skip if details is null (unaired show)
          if (!details) return null;
          
          if (details.year !== null && (lastAppearanceDate === -1 || details.year > lastAppearanceDate)) {
            lastAppearanceDate = details.year;
            lastAppearanceRating = details.rating;
          }
          // Add meta tags to the set
          details.meta_tags.forEach(tag => allMetaTags.add(tag));
          return details.name;
        } catch (error) {
          console.error(`Failed to get details for subject ${appearance.id}:`, error);
          return null;
        }
      })
    );

    // Filter out null values (unaired shows) from appearances
    const validAppearances = appearances.filter(appearance => appearance !== null);

    // Add CV to meta tags if available
    if (personsResponse.data && personsResponse.data.length) {
      const animeVAs = personsResponse.data.filter(person => person.subject_type === 2);
      if (animeVAs.length > 0) {
        animeVAs.forEach(person => {
          allMetaTags.add(`${person.name}`);
        });
      }
    }

    return {
      appearances: validAppearances,
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

async function getCharacterDetails(characterId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/v0/characters/${characterId}`);

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

    return {
      nameCn: nameCn,
      gender,
      image: response.data.images.medium,
      summary: response.data.summary,
      popularity: response.data.stat.collects
    };
  } catch (error) {
    console.error('Error fetching character details:', error);
    throw error;
  }
}

async function getCharactersBySubjectId(subjectId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/v0/subjects/${subjectId}/characters`);

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

async function getRandomCharacter(gameSettings) {
  try {
    let subject;
    let total;
    let randomOffset;
    
    if (gameSettings.useIndex && gameSettings.indexId) {
      // Get index info first
      const indexInfo = await getIndexInfo(gameSettings.indexId);
      // Get total from index info
      total = indexInfo.total + gameSettings.addedSubjects.length;
      
      // Get a random offset within the total number of subjects
      randomOffset = Math.floor(Math.random() * total);

      if (randomOffset >= indexInfo.total) {
        randomOffset = randomOffset - indexInfo.total;
        subject = gameSettings.addedSubjects[randomOffset];
      } else {
        // Fetch one subject from the index at the random offset
        const response = await axios.get(
          `${API_BASE_URL}/v0/indices/${gameSettings.indexId}/subjects?limit=1&offset=${randomOffset}`
        );

        if (!response.data || !response.data.data || response.data.data.length === 0) {
          throw new Error('No subjects found in index');
        }

        subject = response.data.data[0];
      }
    } else {
      gameSettings.useIndex = false;
      total = gameSettings.topNSubjects+gameSettings.addedSubjects.length;
      
      randomOffset = Math.floor(Math.random() * total);
      const endDate = new Date(`${gameSettings.endYear + 1}-01-01`);
      const today = new Date();
      const minDate = new Date(Math.min(endDate.getTime(), today.getTime())).toISOString().split('T')[0];
      
      if (randomOffset >= gameSettings.topNSubjects) {
        randomOffset = randomOffset - gameSettings.topNSubjects;
        subject = gameSettings.addedSubjects[randomOffset];
      } else {
        // Fetch one subject at the random offset
        const response = await axios.post(`${API_BASE_URL}/v0/search/subjects?limit=1&offset=${randomOffset}`, {
          "sort": "heat",
          "filter": {
            "type": [2],
            "air_date": [
              `>=${gameSettings.startYear}-01-01`,
              `<${minDate}`
            ],
            "meta_tags": gameSettings.metaTags.filter(tag => tag !== "")
          }
        });

        if (!response.data || !response.data.data || response.data.data.length === 0) {
          throw new Error('Failed to fetch subject at random offset');
        }

        subject = response.data.data[0];
      }
    }

    // Get characters for the selected subject
    const characters = await getCharactersBySubjectId(subject.id);
    
    // Filter and select characters based on mainCharacterOnly setting
    const filteredCharacters = gameSettings.mainCharacterOnly
      ? characters.filter(character => character.relation === '主角')
      : characters.filter(character => character.relation === '主角' || character.relation === '配角').slice(0, gameSettings.characterNum);

    if (filteredCharacters.length === 0) {
      throw new Error('No characters found for this anime');
    }

    // Randomly select one character from the filtered characters
    const selectedCharacter = filteredCharacters[Math.floor(Math.random() * filteredCharacters.length)];

    // Get additional character details
    const characterDetails = await getCharacterDetails(selectedCharacter.id);

    // Get character appearances
    const appearances = await getCharacterAppearances(selectedCharacter.id);

    return {
      ...selectedCharacter,
      ...characterDetails,
      ...appearances
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

  return result;
}

async function getIndexInfo(indexId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/v0/indices/${indexId}`);
    
    if (!response.data) {
      throw new Error('No index information found');
    }

    return {
      title: response.data.title,
      total: response.data.total
    };
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Index not found');
    }
    console.error('Error fetching index information:', error);
    throw error;
  }
}

async function searchSubjects(keyword) {
  try {
    const response = await axios.post(`${API_BASE_URL}/v0/search/subjects`, {
      keyword: keyword.trim(),
      filter: {
        type: [2]  // Only anime
      }
    });

    if (!response.data || !response.data.data) {
      return [];
    }

    return response.data.data.map(subject => ({
      id: subject.id,
      name: subject.name,
      name_cn: subject.name_cn,
      image: subject.images?.grid || subject.images?.medium || '',
      date: subject.date
    }));
  } catch (error) {
    console.error('Error searching subjects:', error);
    return [];
  }
}

export {
  getRandomCharacter,
  getCharacterAppearances,
  generateFeedback,
  getIndexInfo,
  searchSubjects
}; 
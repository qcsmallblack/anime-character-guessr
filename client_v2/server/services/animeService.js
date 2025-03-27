const axios = require('axios');

async function getSubjectDetails(subjectId) {
  try {
    const response = await axios.get(`https://api.bgm.tv/v0/subjects/${subjectId}`);

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
    const response = await axios.get(`https://api.bgm.tv/v0/characters/${characterId}/subjects`);

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
    const response = await axios.get(`https://api.bgm.tv/v0/characters/${characterId}/persons`);
    
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
    const response = await axios.get(`https://api.bgm.tv/v0/characters/${characterId}`);

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
    const response = await axios.get(`https://api.bgm.tv/v0/subjects/${subjectId}/characters`);

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
    const response = await axios.post(`https://api.bgm.tv/v0/search/subjects?limit=1&offset=${offset}`, {
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
      name_cn: characterDetails.name_cn,
      icon: selectedCharacter.images?.grid || null,
      cv: characterDetails.cv,
      gender: characterDetails.gender,
      popularity: characterDetails.popularity,
      appearances: appearances.appearances,
      lastAppearanceDate: appearances.lastAppearanceDate,
      lastAppearanceRating: appearances.lastAppearanceRating,
      metaTags: appearances.metaTags
    };
  } catch (error) {
    console.error('Error fetching random character:', error);
    throw error;
  }
}

module.exports = {
  getRandomCharacter,
  getCharactersBySubjectId,
  getCharacterDetails,
  getCharacterAppearances,
  getCharacterCV
}; 
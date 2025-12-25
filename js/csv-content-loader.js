// CSV-based Content Management System
class CSVContentLoader {
  constructor() {
    this.contentData = {};
    this.csvData = {};
  }

  // Simple CSV parser
  parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(header => header.trim().replace(/^"|"$/g, ''));
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = this.parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue; // Skip malformed lines
      
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        obj[headers[j]] = values[j];
      }
      result.push(obj);
    }
    
    return result;
  }

  // Parse a single CSV line, handling quoted values
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          // Double quotes inside quoted field
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  }

  // Load content from CSV URL
  async loadCSV(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load CSV: ${response.status} ${response.statusText}`);
      }
      const csvText = await response.text();
      return this.parseCSV(csvText);
    } catch (error) {
      console.error('Error loading CSV:', error);
      return [];
    }
  }

  // Convert CSV data to the format expected by the existing system
  convertToContentFormat(csvData, sectionType) {
    return csvData.map(item => {
      const converted = { ...item };
      
      // Convert string fields to appropriate types where needed
      if (converted.availableLanguages) {
        try {
          converted.availableLanguages = JSON.parse(converted.availableLanguages);
        } catch {
          converted.availableLanguages = converted.availableLanguages.split(',').map(lang => lang.trim());
        }
      }
      
      if (converted.tracks) {
        try {
          converted.tracks = JSON.parse(converted.tracks);
        } catch {
          // If not JSON, try to parse as semicolon-separated track list
          if (converted.tracks.includes(';')) {
            converted.tracks = converted.tracks.split(';').map(track => {
              const [title, artist, duration, url, art] = track.split('|');
              return { title: title?.trim(), artist: artist?.trim(), duration: duration?.trim(), url: url?.trim(), art: art?.trim() };
            }).filter(track => track.title);
          } else {
            converted.tracks = [];
          }
        }
        converted.isMusicPlaylist = true;
      }
      
      if (converted.liveStreamUrl) {
        converted.isLiveStream = true;
      }
      
      // Handle special fields based on section type
      switch(sectionType) {
        case 'popular':
        case 'recommended':
          if (!converted.episode) converted.episode = '';
          break;
        case 'latestMovies':
        case 'anime':
          if (!converted.genre) converted.genre = '';
          break;
        case 'musicPlaylists':
          if (!converted.playlistType) converted.playlistType = 'custom';
          break;
      }
      
      return converted;
    });
  }

  // Load all content sections from CSV files
  async loadAllContent() {
    const sections = ['popular', 'recommended', 'latestMovies', 'anime', 'liveStreams', 'musicPlaylists'];
    const contentData = {
      featured: {
        title: "今月の最新作",
        description: "機内で最新の映画・番組を楽しもう！ハリウッドの話題作から外国作品まで見どころを一挙紹介",
        watchButton: "今すぐ見る",
        detailButton: "詳細",
        plusButton: "＋"
      }
    };

    // Load each section from its corresponding CSV file
    for (const section of sections) {
      const csvData = await this.loadCSV(`data/content/${section}.csv`);
      contentData[section] = {
        title: this.getDefaultTitle(section),
        items: this.convertToContentFormat(csvData, section)
      };
    }

    this.contentData = contentData;
    return contentData;
  }

  // Get default title for a section
  getDefaultTitle(section) {
    const titles = {
      popular: "AirPlane Systems 利用者の中での人気作品",
      recommended: "おすすめのテレビ番組",
      latestMovies: "最新映画",
      anime: "アニメ",
      liveStreams: "ライブ配信",
      musicPlaylists: "音楽プレイリスト"
    };
    return titles[section] || section;
  }

  // Get the content data in the format expected by the existing system
  getContentData() {
    return this.contentData;
  }

  // Get content management functions (mimicking the existing system)
  getContentManager() {
    const self = this;
    
    return {
      // Add new content (would typically be done via CSV editing)
      addContent: function(section, content) {
        if (self.contentData[section] && self.contentData[section].items) {
          // Check required fields
          if (!content.id || !content.title || !content.description) {
            console.error('必須フィールドが不足しています: id, title, description');
            return false;
          }
          
          // Set default values
          const defaultContent = {
            backgroundColor: "#666666",
            coverImage: null,
            category: "2025 ALL カテゴリー"
          };
          
          const newContent = { ...defaultContent, ...content };
          
          // Check for duplicates
          const existingIndex = self.contentData[section].items.findIndex(item => item.id === newContent.id);
          if (existingIndex !== -1) {
            console.warn(`作品ID "${newContent.id}" は既に存在します。上書きします。`);
            self.contentData[section].items[existingIndex] = newContent;
          } else {
            self.contentData[section].items.push(newContent);
          }
          
          console.log(`作品 "${newContent.title}" を ${section} セクションに追加しました。`);
          return true;
        } else {
          console.error(`セクション "${section}" が見つかりません。`);
          return false;
        }
      },

      // Remove content
      removeContent: function(section, contentId) {
        if (self.contentData[section] && self.contentData[section].items) {
          const index = self.contentData[section].items.findIndex(item => item.id === contentId);
          if (index !== -1) {
            const removed = self.contentData[section].items.splice(index, 1)[0];
            console.log(`作品 "${removed.title}" を削除しました。`);
            return true;
          } else {
            console.warn(`作品ID "${contentId}" が見つかりません。`);
            return false;
          }
        } else {
          console.error(`セクション "${section}" が見つかりません。`);
          return false;
        }
      },

      // Update content
      updateContent: function(section, contentId, updates) {
        if (self.contentData[section] && self.contentData[section].items) {
          const index = self.contentData[section].items.findIndex(item => item.id === contentId);
          if (index !== -1) {
            self.contentData[section].items[index] = { ...self.contentData[section].items[index], ...updates };
            console.log(`作品 "${self.contentData[section].items[index].title}" を更新しました。`);
            return true;
          } else {
            console.warn(`作品ID "${contentId}" が見つかりません。`);
            return false;
          }
        } else {
          console.error(`セクション "${section}" が見つかりません。`);
          return false;
        }
      },

      // Get available sections
      getAvailableSections: function() {
        return Object.keys(self.contentData).filter(key => key !== 'featured');
      },

      // Get content template
      getContentTemplate: function(section) {
        const templates = {
          popular: {
            id: "new-popular-content",
            title: "新しい人気作品",
            category: "2025 ALL カテゴリー",
            description: "作品の詳細な説明をここに入力してください。",
            backgroundColor: "#4b9cf5",
            coverImage: "image/covers/default.jpg",
            episode: "エピソード情報",
            youtubeId: "dQw4w9WgXcQ"
          },
          recommended: {
            id: "new-recommended-content",
            title: "新しいおすすめ作品",
            category: "2025 ALL カテゴリー",
            description: "作品の詳細な説明をここに入力してください。",
            backgroundColor: "#33ab9f",
            coverImage: "image/covers/default.jpg",
            episode: "エピソード情報",
            youtubeId: "dQw4w9WgXcQ"
          },
          latestMovies: {
            id: "new-movie",
            title: "新しい映画",
            category: "2025 ジャンル",
            description: "作品の詳細な説明をここに入力してください。",
            backgroundColor: "#ff6b35",
            coverImage: "image/covers/default.jpg",
            genre: "ジャンル",
            youtubeId: "dQw4w9WgXcQ"
          },
          anime: {
            id: "new-anime",
            title: "新しいアニメ",
            category: "2025 アニメ・ジャンル",
            description: "作品の詳細な説明をここに入力してください。",
            backgroundColor: "#f39c12",
            coverImage: "image/covers/default.jpg",
            genre: "ジャンル",
            youtubeId: "dQw4w9WgXcQ"
          },
          musicPlaylists: {
            id: "new-music-playlist",
            title: "新しい音楽プレイリスト",
            category: "2025 音楽・ジャンル",
            description: "プレイリストの詳細な説明をここに入力してください。",
            backgroundColor: "#667eea",
            coverImage: "image/covers/default.jpg",
            genre: "音楽ジャンル",
            playlistType: "custom",
            tracks: [],
            availableLanguages: [],
            isMusicPlaylist: true
          }
        };
        
        return templates[section] || templates.latestMovies;
      }
    };
  }

  // Get content retrieval functions (mimicking the existing system)
  getContentRetriever() {
    const self = this;
    
    return {
      // Get by ID
      getById: function(id) {
        const allItems = [
          ...this.getAllPopular(),
          ...this.getAllRecommended(),
          ...this.getAllLatestMovies(),
          ...this.getAllAnime(),
          ...this.getAllLiveStreams(),
          ...this.getAllMusicPlaylists()
        ];
        return allItems.find(item => item.id === id);
      },

      // Get all items by section
      getAllPopular: function() {
        return self.contentData.popular ? self.contentData.popular.items : [];
      },
      getAllRecommended: function() {
        return self.contentData.recommended ? self.contentData.recommended.items : [];
      },
      getAllLatestMovies: function() {
        return self.contentData.latestMovies ? self.contentData.latestMovies.items : [];
      },
      getAllAnime: function() {
        return self.contentData.anime ? self.contentData.anime.items : [];
      },
      getAllLiveStreams: function() {
        return self.contentData.liveStreams ? self.contentData.liveStreams.items : [];
      },
      getAllMusicPlaylists: function() {
        return self.contentData.musicPlaylists ? self.contentData.musicPlaylists.items : [];
      },

      // Get by category
      getByCategory: function(category) {
        const allItems = [
          ...this.getAllPopular(),
          ...this.getAllRecommended(),
          ...this.getAllLatestMovies(),
          ...this.getAllAnime(),
          ...this.getAllLiveStreams(),
          ...this.getAllMusicPlaylists()
        ];
        return allItems.filter(item => item.category === category);
      },

      // Get by genre
      getByGenre: function(genre) {
        const allItems = [
          ...this.getAllPopular(),
          ...this.getAllRecommended(),
          ...this.getAllLatestMovies(),
          ...this.getAllAnime(),
          ...this.getAllLiveStreams(),
          ...this.getAllMusicPlaylists()
        ];
        return allItems.filter(item => item.genre === genre);
      }
    };
  }
}

// Initialize the content loader
const csvContentLoader = new CSVContentLoader();

// Load content when the module is ready and make it available globally
document.addEventListener('DOMContentLoaded', async function() {
  await csvContentLoader.loadAllContent();
  
  // Make the content available globally to maintain compatibility with existing code
  window.contentData = csvContentLoader.getContentData();
  window.getContentData = csvContentLoader.getContentRetriever();
  window.contentManager = csvContentLoader.getContentManager();
  
  console.log('CSV-based content loaded successfully');
});

// Also provide a function to manually reload content
window.reloadContentFromCSV = async function() {
  await csvContentLoader.loadAllContent();
  window.contentData = csvContentLoader.getContentData();
  window.getContentData = csvContentLoader.getContentRetriever();
  window.contentManager = csvContentLoader.getContentManager();
  
  console.log('Content reloaded from CSV files');
};
# CSV-Based Content Management Guide

This document explains how to manage content using CSV files instead of editing JavaScript code directly.

## Overview

The content management system has been updated to use CSV files for easier content management. All content data is now loaded from CSV files in the `data/content/` directory instead of being hardcoded in JavaScript files.

## File Structure

```
project-root/
├── data/
│   └── content/
│       ├── popular.csv
│       ├── recommended.csv
│       ├── latestMovies.csv
│       ├── anime.csv
│       ├── liveStreams.csv
│       └── musicPlaylists.csv
├── js/
│   ├── csv-content-loader.js
│   └── content-converter.js
└── js/content-data.js (backward compatibility)
```

## CSV File Format

Each CSV file follows the same basic structure with the following columns:

### Common Columns
- `id`: Unique identifier for the content item
- `title`: Display title
- `category`: Content category
- `description`: Detailed description
- `backgroundColor`: Background color in hex format
- `coverImage`: Path to cover image
- `availableLanguages`: JSON array of available languages (e.g., "[""ja"", ""en"", ""ko"", ""zh""]")

### Section-Specific Columns

#### Video Content (popular, recommended, latestMovies, anime)
- `youtubeId`: YouTube video ID
- `episode`: Episode information (for TV shows)
- `genre`: Content genre

#### Live Streams
- `liveStreamUrl`: URL for the live stream
- `isLiveStream`: Set to "true" for live streams

#### Music Playlists
- `playlistType`: Type of music playlist
- `tracks`: JSON array of track objects
- `isMusicPlaylist`: Set to "true" for music playlists

## Adding New Content

### Method 1: Direct CSV Editing
1. Open the appropriate CSV file in `data/content/`
2. Add a new row with the required fields
3. Save the file
4. Refresh the page to load the new content

### Method 2: Using the Content Converter
You can export existing content to CSV format using the content converter:

```javascript
// Export all content to CSV files
contentConverter.exportToCSV();

// Convert a specific section to CSV format
const csvData = contentConverter.sectionToCSV('popular');
```

## Supported Sections

The system supports the following content sections:

1. **popular** - Popular content items
2. **recommended** - Recommended TV shows
3. **latestMovies** - Latest movies
4. **anime** - Anime content
5. **liveStreams** - Live streaming content
6. **musicPlaylists** - Music playlists

## Data Types

- **Text fields**: Normal text (will be escaped for CSV)
- **Language arrays**: Use JSON format like `["ja", "en", "ko", "zh"]`
- **Track arrays**: Use JSON format for music playlists
- **Boolean flags**: Use "true" or "false" strings

## Example CSV Row

```
"id","title","category","description","backgroundColor","coverImage","episode","youtubeId","availableLanguages"
"new-content","New Video Title","2025 Category","Description of the content","#ff6b35","image/covers/new-video.jpg","Episode 1","dQw4w9WgXcQ","[""ja"", ""en""]"
```

## Backward Compatibility

The system maintains backward compatibility with existing code:
- `window.contentData` is still available
- `window.getContentData` functions work as before
- `window.contentManager` functions are available
- All existing API calls continue to work

## Reloading Content

To manually reload content from CSV files:
```javascript
await reloadContentFromCSV();
```

## Best Practices

1. Always backup CSV files before making major changes
2. Use consistent ID naming conventions
3. Test content changes in a development environment first
4. Validate CSV format before deployment
5. Use JSON format for complex fields like arrays
6. Keep descriptions concise but informative

## Troubleshooting

### Content not loading
- Check that CSV files are in the correct location
- Verify CSV format and proper escaping of quotes
- Check browser console for error messages

### Invalid CSV format
- Ensure all quoted fields are properly closed
- Check for unescaped quotes within text fields
- Verify that all rows have the same number of columns as headers

### Missing content
- Verify that the content ID is unique
- Check that required fields are not empty
- Ensure the section name is correct
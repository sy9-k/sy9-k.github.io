// Content Converter - Convert between JSON and CSV formats
class ContentConverter {
  // Convert content data to CSV format
  static toCSV(contentData, section) {
    if (!contentData[section] || !contentData[section].items) {
      console.error(`Section ${section} not found or has no items`);
      return '';
    }

    const items = contentData[section].items;
    if (items.length === 0) {
      return '';
    }

    // Get all unique keys from all items
    const allKeys = new Set();
    items.forEach(item => {
      Object.keys(item).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    
    // Create CSV header row
    let csv = '"' + headers.join('","') + '"\n';
    
    // Create CSV data rows
    items.forEach(item => {
      const row = headers.map(header => {
        let value = item[header] || '';
        
        // Convert arrays to JSON strings
        if (Array.isArray(value)) {
          value = JSON.stringify(value);
        }
        
        // Escape quotes and wrap in quotes
        if (typeof value === 'string') {
          value = value.replace(/"/g, '""'); // Escape quotes
        }
        
        return `"${value}"`;
      });
      
      csv += row.join(',') + '\n';
    });
    
    return csv;
  }

  // Convert CSV to content data format
  static fromCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map(header => header.trim().replace(/^"|"$/g, ''));
    const items = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines
      
      const values = this.parseCSVLine(lines[i]);
      if (values.length !== headers.length) continue; // Skip malformed lines
      
      const obj = {};
      for (let j = 0; j < headers.length; j++) {
        let value = values[j].replace(/^"|"$/g, ''); // Remove surrounding quotes
        
        // Try to parse as JSON if it looks like an array or object
        if (value.startsWith('[') || value.startsWith('{')) {
          try {
            value = JSON.parse(value);
          } catch (e) {
            // If parsing fails, keep as string
          }
        }
        
        obj[headers[j]] = value;
      }
      items.push(obj);
    }
    
    return items;
  }

  // Parse a single CSV line, handling quoted values
  static parseCSVLine(line) {
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

  // Export content to CSV files
  static exportToCSV(contentData, outputDir = 'data/content') {
    const sections = ['popular', 'recommended', 'latestMovies', 'anime', 'liveStreams', 'musicPlaylists'];
    
    const results = {};
    sections.forEach(section => {
      if (contentData[section]) {
        results[`${outputDir}/${section}.csv`] = this.toCSV(contentData, section);
      }
    });
    
    return results;
  }

  // Download CSV file
  static downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

// Example usage functions
window.contentConverter = {
  // Convert existing content to CSV
  exportToCSV: function() {
    if (window.contentData) {
      const csvFiles = ContentConverter.exportToCSV(window.contentData);
      
      // Download each CSV file
      Object.keys(csvFiles).forEach(filename => {
        const content = csvFiles[filename];
        if (content) {
          const name = filename.split('/').pop();
          ContentConverter.downloadCSV(content, name);
        }
      });
      
      console.log('Content exported to CSV files');
      return csvFiles;
    } else {
      console.error('No content data found. Make sure contentData is loaded first.');
      return null;
    }
  },

  // Import from CSV (for testing)
  importFromCSV: function(csvText, section) {
    return ContentConverter.fromCSV(csvText);
  },

  // Convert a single section to CSV
  sectionToCSV: function(section) {
    if (window.contentData && window.contentData[section]) {
      return ContentConverter.toCSV(window.contentData, section);
    }
    return '';
  }
};
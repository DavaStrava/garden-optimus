const fs = require('fs');

// Read the markdown file
const content = fs.readFileSync('/Users/davorkostovic/Downloads/Plant Descriptions and Care Guide.md', 'utf8');

const plants = [];
const lines = content.split('\n');

let currentPlant = null;
let currentSection = null;
let isInCareRequirements = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  // Match plant number headings like "**1\. Golden Pothos**" (with escaped period)
  const plantHeadingMatch = line.match(/^\*\*(\d+)\\\.\s+(.+?)\*\*$/);
  if (plantHeadingMatch) {
    // Save previous plant if exists
    if (currentPlant) {
      plants.push(currentPlant);
    }

    // Start new plant
    currentPlant = {
      commonName: plantHeadingMatch[2],
      scientificName: '',
      description: '',
      lightNeeds: '',
      waterFrequency: '',
      humidity: '',
      temperature: '',
      toxicity: '',
      careNotes: '',
      imageUrl: '',
      suitableFor: []
    };
    currentSection = null;
    isInCareRequirements = false;
    continue;
  }

  if (!currentPlant) continue;

  // Parse Names section (contains scientific name)
  if (line.startsWith('* **Names:**')) {
    const namesText = line.substring('* **Names:**'.length).trim();
    // Extract text between asterisks (italics)
    const scientificMatch = namesText.match(/\*([^*]+)\*/);
    if (scientificMatch) {
      currentPlant.scientificName = scientificMatch[1].trim();
    } else {
      // Some plants just have the scientific name without asterisks
      // Extract the last part after the last comma, if it looks like a scientific name
      const parts = namesText.split(',').map(s => s.trim());
      const lastPart = parts[parts.length - 1];
      // Scientific names typically have two words (genus species)
      if (lastPart && lastPart.split(' ').length >= 2 && lastPart[0] === lastPart[0].toUpperCase()) {
        currentPlant.scientificName = lastPart;
      }
    }
    continue;
  }

  // Parse Description section
  if (line.startsWith('* **Description:**')) {
    currentSection = 'description';
    const descText = line.substring('* **Description:**'.length).trim();
    currentPlant.description = descText;
    continue;
  }

  // Continue description if we're in that section
  if (currentSection === 'description' && line && !line.startsWith('*')) {
    currentPlant.description += ' ' + line;
    continue;
  }

  // Parse Care Requirements section
  if (line.startsWith('* **Care Requirements:**')) {
    isInCareRequirements = true;
    currentSection = null;
    continue;
  }

  // Parse care requirement fields
  if (isInCareRequirements) {
    const lightMatch = line.match(/\* \*\*Light needs:\*\*\s*(.+)/);
    if (lightMatch) {
      currentPlant.lightNeeds = lightMatch[1].trim();
      continue;
    }

    const waterMatch = line.match(/\* \*\*Water frequency:\*\*\s*(.+)/);
    if (waterMatch) {
      currentPlant.waterFrequency = waterMatch[1].trim();
      continue;
    }

    const humidityMatch = line.match(/\* \*\*Humidity:\*\*\s*(.+)/);
    if (humidityMatch) {
      currentPlant.humidity = humidityMatch[1].trim();
      continue;
    }

    const tempMatch = line.match(/\* \*\*Temperature:\*\*\s*(.+)/);
    if (tempMatch) {
      currentPlant.temperature = tempMatch[1].trim();
      continue;
    }
  }

  // Parse Safety section
  if (line.startsWith('* **Safety:**')) {
    isInCareRequirements = false;
    const safetyText = line.substring('* **Safety:**'.length).trim();
    currentPlant.toxicity = safetyText;
    continue;
  }

  // Parse Additional section (care notes)
  if (line.startsWith('* **Additional:**')) {
    const additionalText = line.substring('* **Additional:**'.length).trim();
    currentPlant.careNotes = additionalText;
    continue;
  }

  // Continue care notes if we're in that section
  if (currentPlant.careNotes && line.startsWith('  *') && !line.includes('Image URL:')) {
    currentPlant.careNotes += ' ' + line.substring(2).trim();
    continue;
  }

  // Parse Image URL
  if (line.includes('*Image URL:*')) {
    const imageMatch = line.match(/\*Image URL:\*\s*(.+)/);
    if (imageMatch) {
      currentPlant.imageUrl = imageMatch[1].trim();
    }
    continue;
  }

  // Parse Suitability
  if (line.startsWith('* **Suitability:**')) {
    const suitText = line.substring('* **Suitability:**'.length).trim();

    // Determine suitable locations
    if (suitText.toLowerCase().includes('indoor') && suitText.toLowerCase().includes('outdoor')) {
      currentPlant.suitableFor = ['INDOOR', 'OUTDOOR'];
    } else if (suitText.toLowerCase().includes('indoor')) {
      currentPlant.suitableFor = ['INDOOR'];
    } else if (suitText.toLowerCase().includes('outdoor')) {
      currentPlant.suitableFor = ['OUTDOOR'];
    } else {
      // Default to indoor if unclear
      currentPlant.suitableFor = ['INDOOR'];
    }
    continue;
  }
}

// Save last plant
if (currentPlant) {
  plants.push(currentPlant);
}

// Write to JSON file
fs.writeFileSync(
  '/Users/davorkostovic/VibeCoding/garden-optimus/plants-parsed.json',
  JSON.stringify(plants, null, 2),
  'utf8'
);

console.log(`Parsed ${plants.length} plants`);
console.log(`First plant: ${plants[0].commonName}`);
console.log(`Last plant: ${plants[plants.length - 1].commonName}`);

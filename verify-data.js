const data = require('./plants-parsed.json');

console.log('Total plants:', data.length);
console.log('Indoor only:', data.filter(p => p.suitableFor.length === 1 && p.suitableFor[0] === 'INDOOR').length);
console.log('Outdoor only:', data.filter(p => p.suitableFor.length === 1 && p.suitableFor[0] === 'OUTDOOR').length);
console.log('Both:', data.filter(p => p.suitableFor.length === 2).length);

console.log('\nSample entries with missing scientific names:');
console.log(data.filter(p => !p.scientificName).slice(0, 5).map(p => p.commonName));

console.log('\nFirst 5 plants:');
data.slice(0, 5).forEach(p => {
  console.log(`- ${p.commonName} (${p.scientificName})`);
});

console.log('\nLast 5 plants:');
data.slice(-5).forEach(p => {
  console.log(`- ${p.commonName} (${p.scientificName})`);
});

console.log('\nSample indoor/outdoor plant:');
const bothExample = data.find(p => p.suitableFor.length === 2);
if (bothExample) {
  console.log(`- ${bothExample.commonName}: ${bothExample.suitableFor.join(', ')}`);
}

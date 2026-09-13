/**
 * KrishiMandi - Voice Search Parsing Test Script (frontend/test_voice_search_parsing.js)
 *
 * Plain Node script (no test framework / dependencies) mirroring the style
 * of backend/test_*.py scripts. Exercises VoiceSearchAssistant.parseSpeechText()
 * directly, without invoking the constructor (so no browser DOM/mic APIs are
 * needed) - see Object.create() usage below.
 *
 * Run with:
 *   node frontend/test_voice_search_parsing.js
 */

// voice-search.js runs `window.VoiceSearchAssistant = VoiceSearchAssistant;`
// at module scope, so a minimal `window` stub is required before loading it.
// No other browser globals are needed because parseSpeechText() is pure.
global.window = global.window || {};

const path = require('path');
require(path.join(__dirname, 'script', 'voice-search.js'));

const VoiceSearchAssistant = global.window.VoiceSearchAssistant;

// Build an object with VoiceSearchAssistant's prototype methods available,
// WITHOUT running the constructor (which sets up mic/DOM listeners).
const assistant = Object.create(VoiceSearchAssistant.prototype);

let passed = 0;
let failed = 0;

function check(description, transcript, expected) {
    const result = assistant.parseSpeechText(transcript);
    const actual = {
        crop: result.crop,
        maxPrice: result.maxPrice,
        minPrice: result.minPrice
    };

    const ok = Object.keys(expected).every((key) => actual[key] === expected[key]);

    if (ok) {
        passed += 1;
        console.log(`PASS: ${description}`);
        console.log(`      "${transcript}" -> crop=${actual.crop}, maxPrice=${actual.maxPrice}, minPrice=${actual.minPrice}`);
    } else {
        failed += 1;
        console.log(`FAIL: ${description}`);
        console.log(`      "${transcript}"`);
        console.log(`      expected: ${JSON.stringify(expected)}`);
        console.log(`      actual:   ${JSON.stringify(actual)}`);
    }
}

console.log('--- Odia voice-search price/crop extraction ---\n');

// The reported bug: Odia Unicode digits under "ତଳେ" (below)
check(
    'Odia digits + ତଳେ (below)',
    'ଗହମ ୫୦୦୦ ତଳେ',
    { crop: 'wheat', maxPrice: 5000, minPrice: null }
);

// ASCII digits should keep working exactly as before
check(
    'ASCII digits + ତଳେ (below)',
    'ଗହମ 5000 ତଳେ',
    { crop: 'wheat', maxPrice: 5000, minPrice: null }
);

// Odia digits + "ରୁ କମ" (less than) phrasing
check(
    'Odia digits + ରୁ କମ (less than)',
    'ଗହମ ୫୦୦୦ ରୁ କମ',
    { crop: 'wheat', maxPrice: 5000, minPrice: null }
);

// ASCII digits + "ରୁ କମ" phrasing
check(
    'ASCII digits + ରୁ କମ (less than)',
    'ଗହମ 5000 ରୁ କମ',
    { crop: 'wheat', maxPrice: 5000, minPrice: null }
);

// Spoken Odia number words
check(
    'Odia number words "ପାଞ୍ଚ ହଜାର" (five thousand) + ତଳେ',
    'ଗହମ ପାଞ୍ଚ ହଜାର ତଳେ',
    { crop: 'wheat', maxPrice: 5000, minPrice: null }
);

check(
    'Odia number words "ଦୁଇ ହଜାର" (two thousand)',
    'ଗହମ ଦୁଇ ହଜାର ତଳେ',
    { crop: 'wheat', maxPrice: 2000, minPrice: null }
);

check(
    'Odia number words "ଦଶ ହଜାର" (ten thousand)',
    'ଗହମ ଦଶ ହଜାର ତଳେ',
    { crop: 'wheat', maxPrice: 10000, minPrice: null }
);

// Regression: existing English/Hindi flows must keep working unchanged
check(
    'English "under" phrasing',
    'Wheat under 2500',
    { crop: 'wheat', maxPrice: 2500, minPrice: null }
);

check(
    'Hindi "से कम" (less than) phrasing',
    'गेहूं 2500 से कम',
    { crop: 'wheat', maxPrice: 2500, minPrice: null }
);

check(
    'English "above" (min price) phrasing',
    'Onion above 1000',
    { crop: 'onion', maxPrice: null, minPrice: 1000 }
);

check(
    'Odia min-price phrasing "ରୁ ଅଧିକ" (above) is unaffected by digit fix',
    'ଆଳୁ ୧୨୦୦ ରୁ ଅଧିକ',
    { crop: 'potato', maxPrice: null, minPrice: 1200 }
);

console.log(`\n--- ${passed} passed, ${failed} failed ---`);
process.exit(failed === 0 ? 0 : 1);

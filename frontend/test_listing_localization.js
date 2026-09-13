/**
 * KrishiMandi - Voice-Driven Listing Localization Test Script
 * (frontend/test_listing_localization.js)
 *
 * Plain Node script (no test framework / dependencies), mirroring the style
 * of backend/test_*.py and frontend/test_voice_search_parsing.js.
 *
 * Covers:
 *   1. VoiceSearchAssistant.parseSpeechText() reporting which language the
 *      query was spoken in (extracted.language), which discovery.js uses to
 *      decide which language to render listings back in.
 *   2. discovery.js's translateCropName() / UI_STRINGS localizing the crop
 *      name and page chrome for that language.
 *
 * Run with:
 *   node frontend/test_listing_localization.js
 */

// Minimal browser stubs: discovery.js reads window.location.hostname at
// module scope (for API_BASE_URL) and registers a DOMContentLoaded listener
// that we intentionally never fire, since all the code under test
// (translateCropName, UI_STRINGS, ...) lives outside that listener.
global.window = global.window || { location: { hostname: 'localhost' } };
global.document = global.document || {
    getElementById: () => null,
    addEventListener: () => {},
    body: { insertAdjacentHTML: () => {} }
};

const path = require('path');

require(path.join(__dirname, 'script', 'voice-search.js'));
const VoiceSearchAssistant = global.window.VoiceSearchAssistant;

// discovery.js's top-level helpers (UI_STRINGS, translateCropName, ...) live
// outside its DOMContentLoaded listener, and are exported via a browser-safe
// `module.exports` guard at the bottom of the file (no-op in real browsers).
const { translateCropName, UI_STRINGS } = require(path.join(__dirname, 'script', 'discovery.js'));

let passed = 0;
let failed = 0;

function check(description, actual, expected) {
    if (actual === expected) {
        passed += 1;
        console.log(`PASS: ${description} -> ${actual}`);
    } else {
        failed += 1;
        console.log(`FAIL: ${description}`);
        console.log(`      expected: ${expected}`);
        console.log(`      actual:   ${actual}`);
    }
}

console.log('--- Spoken language propagation (VoiceSearchAssistant) ---\n');

// A person searching in Odia should get extracted.language = 'or-IN' back,
// which is what discovery.js keys its display-language choice off of.
const odiaAssistant = Object.create(VoiceSearchAssistant.prototype);
odiaAssistant.activeLang = 'or-IN';
check(
    'Odia query reports language=or-IN',
    odiaAssistant.parseSpeechText('ଗହମ ୫୦୦୦ ତଳେ').language,
    'or-IN'
);

const hindiAssistant = Object.create(VoiceSearchAssistant.prototype);
hindiAssistant.activeLang = 'hi-IN';
check(
    'Hindi query reports language=hi-IN',
    hindiAssistant.parseSpeechText('गेहूं 2500 से कम').language,
    'hi-IN'
);

const englishAssistant = Object.create(VoiceSearchAssistant.prototype);
englishAssistant.activeLang = 'en-IN';
check(
    'English query reports language=en-IN',
    englishAssistant.parseSpeechText('Wheat under 2500').language,
    'en-IN'
);

console.log('\n--- Listing display localization (discovery.js) ---\n');

// Farmer-entered crop_name is always English/Latin script in the DB; the
// display label should translate for the language that was spoken, while
// the underlying item.crop_name (not tested here) stays untouched.
check(
    'English "Wheat" displays in Odia for an Odia search',
    translateCropName('Wheat', 'or-IN'),
    'ଗହମ'
);

check(
    'English "Sharbati Wheat" (free text) still maps to wheat in Hindi',
    translateCropName('Sharbati Wheat', 'hi-IN'),
    'गेहूं'
);

check(
    'English "Red Onion" displays in Odia for an Odia search',
    translateCropName('Red Onion', 'or-IN'),
    'ପିଆଜ'
);

check(
    'No translation dictionary entry -> falls back to original label',
    translateCropName('Dragon Fruit', 'or-IN'),
    'Dragon Fruit'
);

check(
    'English searches are left as-is (no translation)',
    translateCropName('Wheat', 'en-IN'),
    'Wheat'
);

// Page chrome (buttons, empty state, etc.) should localize per language too.
check(
    'Buy button label localizes to Odia',
    UI_STRINGS['or-IN'].buyProduce,
    'ଫସଲ କିଣନ୍ତୁ'
);

check(
    'Buy button label localizes to Hindi',
    UI_STRINGS['hi-IN'].buyProduce,
    'फसल खरीदें'
);

check(
    'Results-count string localizes to Odia',
    UI_STRINGS['or-IN'].resultsCount(3),
    'ଭାରତୀୟ ମଣ୍ଡିରେ 3 ତାଜା ଫସଲ ତାଲିକା ଦେଖାଉଛି'
);

console.log(`\n--- ${passed} passed, ${failed} failed ---`);
process.exit(failed === 0 ? 0 : 1);

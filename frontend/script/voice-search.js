/**
 * KrishiMandi - Multilingual Voice Search Assistant (script/voice-search.js)
 * Supports English (en-IN), Hindi (hi-IN), and Odia (or-IN) speech recognition,
 * parameter extraction (crop, price, location, quality), Bhashini ASR pipeline
 * integration, resilient chip fallbacks, and spoken audio feedback.
 */

class VoiceSearchAssistant {
    constructor(options = {}) {
        this.onFilterExtracted = options.onFilterExtracted || null;
        this.activeLang = options.lang || this.detectUserLanguage();
        this.recognition = null;
        this.isListening = false;
        this.synth = window.speechSynthesis || null;
        this.currentRecorder = null;
        this.recorderStream = null;

        this.initRecognition();
        this.injectVoiceUI();
    }

    detectUserLanguage() {
        try {
            const user = JSON.parse(localStorage.getItem('km_user') || '{}');
            const pref = (user.language_preference || 'english').toLowerCase();
            if (pref === 'hindi') return 'hi-IN';
            if (pref === 'odia') return 'or-IN';
            return 'en-IN';
        } catch (e) {
            return 'en-IN';
        }
    }

    setLanguage(langCode) {
        this.activeLang = langCode;
        if (this.recognition) {
            this.recognition.lang = langCode;
        }
        const langSelect = document.getElementById('voice-lang-select');
        if (langSelect) langSelect.value = langCode;
        this.renderSampleChips();
    }

    initRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.warn('[VoiceSearch] Web Speech API not supported in this browser.');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = this.activeLang;

        this.recognition.onstart = () => {
            this.isListening = true;
            this.updateVoiceModalState('listening');
        };

        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('[VoiceSearch] Captured Speech:', transcript);
            this.handleTranscript(transcript);
        };

        this.recognition.onerror = (event) => {
            console.warn('[VoiceSearch] Recognition error:', event.error);
            this.isListening = false;
            
            if (event.error === 'not-allowed') {
                this.updateVoiceModalState('error', 'Microphone access blocked. Please allow mic permissions.');
            } else if (event.error === 'no-speech') {
                this.updateVoiceModalState('error', 'No speech detected. Speak closer to your microphone or click a sample phrase below.');
            } else if (event.error === 'language-not-supported' && this.activeLang === 'or-IN') {
                // Odia browser speech fallback notice
                this.updateVoiceModalState('odia-fallback', 'Browser Web Speech does not natively transcribe Odia. Click any sample prompt below or type your query.');
            } else {
                this.updateVoiceModalState('error', `Speech error (${event.error}). Please click a sample phrase below.`);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
        };
    }

    startListening() {
        this.openVoiceModal();

        // If Odia is selected, try server-side Bhashini ASR recording first
        if (this.activeLang === 'or-IN') {
            this.recordAndTranscribeOdia();
            return;
        }

        // English / Hindi: Use native browser SpeechRecognition
        if (!this.recognition) {
            alert('Voice search is not supported by your browser. Please use Chrome or Edge.');
            return;
        }

        if (this.isListening) {
            this.stopListening();
            return;
        }

        this.recognition.lang = this.activeLang;
        try {
            this.recognition.start();
        } catch (e) {
            console.warn('[VoiceSearch] start error:', e);
        }
    }

    async recordAndTranscribeOdia() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
            this.fallbackToBrowserSpeech();
            return;
        }

        try {
            this.updateVoiceModalState('listening');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.recorderStream = stream;
            const mediaRecorder = new MediaRecorder(stream);
            const audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                if (this.recorderStream) {
                    this.recorderStream.getTracks().forEach(track => track.stop());
                    this.recorderStream = null;
                }
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                this.updateVoiceModalState('processing', 'Transcribing Odia speech...');

                try {
                    const formData = new FormData();
                    formData.append('file', audioBlob, 'voice_odia.webm');
                    formData.append('language', 'or-IN');

                    const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                        ? 'http://127.0.0.1:8000/api'
                        : '/api';

                    const res = await fetch(`${apiBase}/voice/transcribe`, {
                        method: 'POST',
                        body: formData
                    });

                    const data = await res.json();
                    if (data && data.success && data.text) {
                        this.handleTranscript(data.text);
                    } else {
                        console.info('[VoiceSearch] STT notice:', data?.detail);
                        this.updateVoiceModalState('error', data?.detail || 'Could not recognize Odia speech. Please tap to try again or choose a phrase below.');
                    }
                } catch (e) {
                    console.warn('[VoiceSearch] Audio transcription failed:', e);
                    this.updateVoiceModalState('error', 'Voice service temporarily unavailable. Please tap to try again or choose a phrase below.');
                }
            };

            mediaRecorder.start();
            this.currentRecorder = mediaRecorder;
            this.isListening = true;

            // Automatically stop recording after 4 seconds of speech
            setTimeout(() => {
                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                    this.isListening = false;
                }
            }, 4000);

        } catch (err) {
            console.warn('[VoiceSearch] getUserMedia error:', err);
            this.fallbackToBrowserSpeech();
        }
    }

    fallbackToBrowserSpeech() {
        if (!this.recognition) return;
        this.recognition.lang = this.activeLang;
        try {
            this.recognition.start();
        } catch (e) {
            console.warn('[VoiceSearch] Recognition start error:', e);
        }
    }

    stopListening() {
        if (this.currentRecorder && this.currentRecorder.state === 'recording') {
            this.currentRecorder.stop();
        }
        if (this.recorderStream) {
            this.recorderStream.getTracks().forEach(track => track.stop());
            this.recorderStream = null;
        }
        if (this.recognition && this.isListening) {
            this.recognition.stop();
            this.isListening = false;
        }
        this.closeVoiceModal();
    }

    handleTranscript(text) {
        this.updateVoiceModalState('processing', text);

        // Parse extracted filter values from spoken text
        const filters = this.parseSpeechText(text);
        console.log('[VoiceSearch] Parsed Filters:', filters);

        setTimeout(() => {
            this.closeVoiceModal();

            if (this.onFilterExtracted) {
                this.onFilterExtracted(filters);
            }

            // Speak back brief audio response in English/Hindi
            this.speakFeedback(filters);
        }, 700);
    }

    // --- Odia numeral & number-word normalization -------------------------
    // JavaScript's \d regex class only ever matches ASCII 0-9, so the price
    // regexes below (see maxPricePatterns / minPricePatterns) silently fail
    // to match Odia Unicode digits like "୫୦୦୦" (U+0B66-U+0B6F) even though
    // the crop word matches fine. We normalize the transcript to ASCII
    // digits *before* it reaches those regexes so all existing parsing
    // logic (crop dict, price patterns, location, grade) keeps working
    // unchanged for English/Hindi/Odia alike.

    // "୫୦୦୦" -> "5000"
    convertOdiaDigits(str) {
        if (!str) return str;
        const odiaDigitMap = {
            '୦': '0', '୧': '1', '୨': '2', '୩': '3', '୪': '4',
            '୫': '5', '୬': '6', '୭': '7', '୮': '8', '୯': '9'
        };
        return str.replace(/[୦-୯]/g, (ch) => odiaDigitMap[ch]);
    }

    // "ପାଞ୍ଚ ହଜାର" -> "5000", "ଦୁଇ ହଜାର" -> "2000", "ଦଶ ହଜାର" -> "10000"
    convertOdiaNumberWords(str) {
        if (!str) return str;
        const odiaOnes = {
            'ଏକ': 1, 'ଦୁଇ': 2, 'ତିନି': 3, 'ଚାରି': 4, 'ପାଞ୍ଚ': 5,
            'ଛଅ': 6, 'ସାତ': 7, 'ଆଠ': 8, 'ନଅ': 9, 'ଦଶ': 10
        };
        const onesPattern = Object.keys(odiaOnes).join('|');
        const thousandPattern = new RegExp(`(${onesPattern})\\s+ହଜାର`, 'g');
        return str.replace(thousandPattern, (match, word) => String(odiaOnes[word] * 1000));
    }

    normalizeSpokenNumbers(str) {
        if (!str) return str;
        // Word conversion first ("ପାଞ୍ଚ ହଜାର" -> "5000"), then any remaining
        // raw Odia digit glyphs ("୫୦୦୦" -> "5000").
        return this.convertOdiaDigits(this.convertOdiaNumberWords(str));
    }

    parseSpeechText(rawText) {
        const normalizedText = this.normalizeSpokenNumbers(rawText);
        const text = normalizedText.toLowerCase().trim();
        const result = {
            rawText: rawText,
            crop: null,
            minPrice: null,
            maxPrice: null,
            location: null,
            qualityGrade: null
        };

        // 1. Crop dictionary in English, Hindi, and Odia
        const cropDict = [
            { english: 'wheat', aliases: ['wheat', 'sharbati', 'गेहूं', 'गेहू', 'गहूँ', 'ଗହମ', 'gahama', 'gehun'] },
            { english: 'rice', aliases: ['rice', 'basmati', 'paddy', 'चावल', 'धान', 'बासमती', 'ଚାଉଳ', 'ଧାନ', 'chaula', 'swarna'] },
            { english: 'tomato', aliases: ['tomato', 'tomatoes', 'टमाटर', 'ଟମାଟୋ', 'ବିଲାତି', 'bilati', 'tamatar'] },
            { english: 'onion', aliases: ['onion', 'onions', 'प्याज', 'कांदा', 'ପିଆଜ', 'piaja', 'pyaz'] },
            { english: 'potato', aliases: ['potato', 'potatoes', 'आलू', 'ଆଳୁ', 'aalu', 'alu', 'aloo'] },
            { english: 'cotton', aliases: ['cotton', 'कपास', 'रुई', 'କପା', 'kapa'] },
            { english: 'mustard', aliases: ['mustard', 'सरसों', 'राई', 'ସୋରିଷ', 'sorisa', 'sarson'] },
            { english: 'soybean', aliases: ['soybean', 'soya', 'सोयाबीन', 'ସୋୟାବିନ୍'] },
            { english: 'chili', aliases: ['chili', 'chilli', 'mirch', 'मिर्च', 'ଲଙ୍କା', 'lanka', 'mirchi'] },
            { english: 'corn', aliases: ['corn', 'maize', 'मक्का', 'ଭୁଟ୍ଟା', 'ମକା', 'maka'] },
            { english: 'garlic', aliases: ['garlic', 'लहसुन', 'ରସୁଣ', 'rasuna', 'lahsun'] },
            { english: 'ginger', aliases: ['ginger', 'अदरक', 'ଅଦା', 'ada', 'adrak'] },
            { english: 'pulses', aliases: ['chana', 'gram', 'dal', 'चना', 'दाल', 'ଡାଲି', 'dali'] }
        ];

        for (const crop of cropDict) {
            for (const alias of crop.aliases) {
                if (text.includes(alias.toLowerCase())) {
                    result.crop = crop.english;
                    break;
                }
            }
            if (result.crop) break;
        }

        // If no dictionary match, search for words after search verbs
        if (!result.crop) {
            const cropMatch = text.match(/(?:search|find|show|give me|खोजें|दिखाएं|ଦେଖାନ୍ତୁ)\s+([a-zA-Z\u0900-\u097F\u0B00-\u0B7F]+)/i);
            if (cropMatch && cropMatch[1]) {
                const candidate = cropMatch[1].trim();
                if (!['in', 'under', 'below', 'price', 'में', 'से', 'ରୁ', 'ତଳେ'].includes(candidate)) {
                    result.crop = candidate;
                }
            }
        }

        // 2. Price extraction (English, Hindi, Odia)
        // e.g. "under 2000", "below 500", "2000 से कम", "2000 ତଳେ"
        const maxPricePatterns = [
            /(?:under|below|less than|max|maximum|up to)\s*(?:₹|rs\.?|rupees)?\s*(\d+)/i,
            /(\d+)\s*(?:₹|rupees|रुपये|रुपया|ଟଙ୍କା)?\s*(?:से कम|के नीचे|ତଳେ|ରୁ କମ)/i
        ];
        for (const pattern of maxPricePatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                result.maxPrice = parseFloat(match[1]);
                break;
            }
        }

        // Min price pattern (e.g. "above 1000", "1000 से अधिक", "1000 ରୁ ଅଧିକ")
        const minPricePatterns = [
            /(?:above|greater than|min|minimum|more than)\s*(?:₹|rs\.?|rupees)?\s*(\d+)/i,
            /(\d+)\s*(?:₹|rupees|रुपये|रुपया|ଟଙ୍କା)?\s*(?:से अधिक|से ज्यादा|ରୁ ଅଧିକ)/i
        ];
        for (const pattern of minPricePatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                result.minPrice = parseFloat(match[1]);
                break;
            }
        }

        // 3. Location extraction
        const locationPatterns = [
            /(?:in|at|near|from)\s+([a-zA-Z]{3,25})/i,
            /([a-zA-Z\u0900-\u097F]{3,25})\s*(?:में|मंडी|से)/i,
            /([a-zA-Z\u0B00-\u0B7F]{3,25})\s*(?:ରେ|ମଣ୍ଡି)/i
        ];
        for (const pattern of locationPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const locCandidate = match[1].trim();
                if (!['crop', 'mandi', 'market', 'grade', 'price', 'फसल', 'dam', 'dara'].includes(locCandidate.toLowerCase())) {
                    result.location = locCandidate;
                    break;
                }
            }
        }

        // 4. Quality Grade extraction
        if (text.includes('grade a') || text.includes('ग्रेड ए') || text.includes('ଗ୍ରେଡ୍ ଏ')) {
            result.qualityGrade = 'Grade A';
        } else if (text.includes('grade b') || text.includes('ग्रेड बी')) {
            result.qualityGrade = 'Grade B';
        }

        return result;
    }

    speakFeedback(filters) {
        if (!this.synth) return;

        let message = '';
        const cropName = filters.crop ? filters.crop : 'produce';

        if (this.activeLang === 'hi-IN') {
            message = `${cropName} की फसलें खोजी जा रही हैं।`;
            if (filters.maxPrice) message += ` अधिकतम मूल्य ₹${filters.maxPrice}।`;
        } else if (this.activeLang === 'or-IN') {
            // Display results on grid for Odia as planned
            return;
        } else {
            message = `Showing ${cropName}`;
            if (filters.maxPrice) message += ` under ₹${filters.maxPrice}`;
            if (filters.location) message += ` in ${filters.location}`;
        }

        try {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = this.activeLang;
            utterance.rate = 1.0;
            this.synth.speak(utterance);
        } catch (e) {
            console.warn('[VoiceSearch] Speech synthesis failed:', e);
        }
    }

    injectVoiceUI() {
        if (document.getElementById('voice-search-modal')) return;

        const modalHTML = `
            <div id="voice-search-modal" class="voice-modal-backdrop" style="display:none;">
                <div class="voice-modal-card">
                    <button type="button" class="voice-modal-close" id="voice-modal-close-btn" aria-label="Close">×</button>
                    
                    <div class="voice-lang-selector-row">
                        <span>Language / भाषा:</span>
                        <select id="voice-lang-select" class="voice-lang-dropdown">
                            <option value="en-IN">English (India)</option>
                            <option value="hi-IN">हिन्दी (Hindi)</option>
                            <option value="or-IN">ଓଡ଼ିଆ (Odia - Beta)</option>
                        </select>
                    </div>

                    <div class="voice-mic-circle" id="voice-mic-indicator">
                        <svg class="voice-mic-svg" xmlns="http://www.w3.org/2000/svg" width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path>
                            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                            <line x1="12" y1="19" x2="12" y2="23"></line>
                            <line x1="8" y1="23" x2="16" y2="23"></line>
                        </svg>
                        <div class="voice-wave-ring"></div>
                        <div class="voice-wave-ring second"></div>
                    </div>

                    <h3 class="voice-modal-status" id="voice-status-text">Listening...</h3>
                    <p class="voice-transcript-preview" id="voice-transcript-text">"Search Wheat under ₹2500 in Nashik"</p>
                    
                    <div class="voice-sample-chips" id="voice-chips-container">
                        <!-- Populated via renderSampleChips() -->
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Bind modal events
        document.getElementById('voice-modal-close-btn')?.addEventListener('click', () => {
            this.stopListening();
        });

        document.getElementById('voice-lang-select')?.addEventListener('change', (e) => {
            this.setLanguage(e.target.value);
        });

        this.renderSampleChips();
    }

    renderSampleChips() {
        const container = document.getElementById('voice-chips-container');
        if (!container) return;

        let chipsHTML = '';
        if (this.activeLang === 'or-IN') {
            chipsHTML = `
                <span class="sample-title">Try saying or tap (ଓଡ଼ିଆରେ କୁହନ୍ତୁ କିମ୍ବା ଟ୍ୟାପ୍ କରନ୍ତୁ):</span>
                <button type="button" class="voice-chip" data-phrase="ଗହମ 2000 ତଳେ">🌾 "ଗହମ 2000 ତଳେ"</button>
                <button type="button" class="voice-chip" data-phrase="ସ୍ୱର୍ଣ୍ଣ ଧାନ">🍚 "ସ୍ୱର୍ଣ୍ଣ ଧାନ"</button>
                <button type="button" class="voice-chip" data-phrase="ଟମାଟୋ 1500 ତଳେ">🍅 "ଟମାଟୋ 1500 ତଳେ"</button>
                <button type="button" class="voice-chip" data-phrase="ନାଲି ପିଆଜ">🧅 "ନାଲି ପିଆଜ"</button>
                <button type="button" class="voice-chip" data-phrase="ଆଳୁ">🥔 "ଆଳୁ"</button>
            `;
        } else if (this.activeLang === 'hi-IN') {
            chipsHTML = `
                <span class="sample-title">बोलें या टैप करें:</span>
                <button type="button" class="voice-chip" data-phrase="गेहूं 2500 से कम">🌾 "गेहूं 2500 से कम"</button>
                <button type="button" class="voice-chip" data-phrase="टमाटर 2000 से कम">🍅 "टमाटर 2000 से कम"</button>
                <button type="button" class="voice-chip" data-phrase="लाल प्याज">🧅 "लाल प्याज"</button>
                <button type="button" class="voice-chip" data-phrase="सरसों 5000">🌼 "सरसों 5000"</button>
            `;
        } else {
            chipsHTML = `
                <span class="sample-title">Try saying or tap:</span>
                <button type="button" class="voice-chip" data-phrase="Wheat under 2500">🌾 "Wheat under 2500"</button>
                <button type="button" class="voice-chip" data-phrase="Tomato under 1800">🍅 "Tomato under 1800"</button>
                <button type="button" class="voice-chip" data-phrase="Basmati Rice">🍚 "Basmati Rice"</button>
                <button type="button" class="voice-chip" data-phrase="Onion in Nashik">🧅 "Onion in Nashik"</button>
            `;
        }

        container.innerHTML = chipsHTML;

        // Rebind click listeners to chips
        container.querySelectorAll('.voice-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const phrase = chip.getAttribute('data-phrase');
                if (phrase) {
                    this.handleTranscript(phrase);
                }
            });
        });
    }

    openVoiceModal() {
        const modal = document.getElementById('voice-search-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.updateVoiceModalState('listening');
            const langSelect = document.getElementById('voice-lang-select');
            if (langSelect) langSelect.value = this.activeLang;
            this.renderSampleChips();
        }
    }

    closeVoiceModal() {
        const modal = document.getElementById('voice-search-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    updateVoiceModalState(state, text = '') {
        const statusEl = document.getElementById('voice-status-text');
        const transcriptEl = document.getElementById('voice-transcript-text');
        const indicator = document.getElementById('voice-mic-indicator');

        if (!statusEl || !transcriptEl || !indicator) return;

        if (state === 'listening') {
            indicator.classList.add('pulsing');
            statusEl.textContent = this.activeLang === 'hi-IN' ? 'सुन रहे हैं... (बोलें)' : 
                                   this.activeLang === 'or-IN' ? 'ଶୁଣୁଛି... (କୁହନ୍ତୁ କିମ୍ବା ତଳେ ଟ୍ୟାପ୍ କରନ୍ତୁ)' : 'Listening... Speak now';
            transcriptEl.textContent = this.activeLang === 'hi-IN' ? '"2000 से कम कीमत में गेहूं खोजें"' :
                                       this.activeLang === 'or-IN' ? '"ଗହମ 2000 ତଳେ"' : '"Search Wheat under ₹2500 in Nashik"';
        } else if (state === 'processing') {
            indicator.classList.remove('pulsing');
            statusEl.textContent = 'Processing / खोज रहे हैं...';
            transcriptEl.textContent = `"${text}"`;
        } else if (state === 'error' || state === 'odia-fallback') {
            indicator.classList.remove('pulsing');
            statusEl.textContent = 'Voice Assistant Notice';
            transcriptEl.textContent = text;
        }
    }
}

window.VoiceSearchAssistant = VoiceSearchAssistant;

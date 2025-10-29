// ID Scanner Application
class IDScanner {
    constructor() {
        this.results = [];
        this.currentStream = null;
        this.currentFacingMode = 'environment';
        this.engine = 'tesseract';
        this.geminiApiKey = localStorage.getItem('geminiApiKey') || '';
        this.worker = null;
        this.isMobile = this.detectMobile();
        this.initElements();
        this.initEventListeners();
        this.loadSettings();
        this.initTesseract();
        this.setupPlatformSpecificUI();
    }

    detectMobile() {
        const userAgent = navigator.userAgent || navigator.vendor || window.opera;
        return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase()) ||
               (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /MacIntel/.test(navigator.platform));
    }

    setupPlatformSpecificUI() {
        // Show folder upload only on desktop
        if (!this.isMobile && this.folderSection) {
            this.folderSection.style.display = 'block';
        } else if (this.folderSection) {
            this.folderSection.style.display = 'none';
        }
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.cameraBtn = document.getElementById('cameraBtn');
        this.cameraModal = document.getElementById('cameraModal');
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.captureBtn = document.getElementById('captureBtn');
        this.switchCameraBtn = document.getElementById('switchCameraBtn');
        this.closeCamera = document.getElementById('closeCamera');
        this.progressSection = document.getElementById('progressSection');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.resultsSection = document.getElementById('resultsSection');
        this.resultsGrid = document.getElementById('resultsGrid');
        this.statsSection = document.getElementById('statsSection');
        this.searchInput = document.getElementById('searchInput');
        this.clearBtn = document.getElementById('clearBtn');
        this.exportCsvBtn = document.getElementById('exportCsvBtn');
        this.exportJsonBtn = document.getElementById('exportJsonBtn');
        this.resultCount = document.getElementById('resultCount');
        
        // Settings elements
        this.settingsToggle = document.getElementById('settingsToggle');
        this.settingsContent = document.getElementById('settingsContent');
        this.engineSelect = document.getElementById('engineSelect');
        this.geminiSettings = document.getElementById('geminiSettings');
        this.geminiApiKeyInput = document.getElementById('geminiApiKey');
        this.saveApiKeyBtn = document.getElementById('saveApiKey');
        this.testApiKeyBtn = document.getElementById('testApiKey');
        
        // Folder upload elements (desktop only)
        this.folderSection = document.getElementById('folderSection');
        this.folderInput = document.getElementById('folderInput');
        this.folderBtn = document.getElementById('folderBtn');
    }

    initEventListeners() {
        // Settings events
        this.settingsToggle.addEventListener('click', () => this.toggleSettings());
        this.engineSelect.addEventListener('change', (e) => this.changeEngine(e.target.value));
        this.saveApiKeyBtn.addEventListener('click', () => this.saveApiKey());
        this.testApiKeyBtn.addEventListener('click', () => this.testGeminiApi());

        // Upload area events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFiles(e.target.files));
        
        // Folder upload events (desktop only)
        if (this.folderBtn) {
            this.folderBtn.addEventListener('click', () => this.folderInput.click());
        }
        if (this.folderInput) {
            this.folderInput.addEventListener('change', (e) => this.handleFolder(e.target.files));
        }

        // Drag and drop
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('drag-over');
        });

        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('drag-over');
        });

        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('drag-over');
            this.handleFiles(e.dataTransfer.files);
        });

        // Camera events
        this.cameraBtn.addEventListener('click', () => this.openCamera());
        this.closeCamera.addEventListener('click', () => this.closeCamera());
        this.captureBtn.addEventListener('click', () => this.capturePhoto());
        this.switchCameraBtn.addEventListener('click', () => this.switchCamera());

        // Results events
        this.clearBtn.addEventListener('click', () => this.clearResults());
        this.exportCsvBtn.addEventListener('click', () => this.exportCSV());
        this.exportJsonBtn.addEventListener('click', () => this.exportJSON());
        this.searchInput.addEventListener('input', (e) => this.filterResults(e.target.value));
    }

    loadSettings() {
        if (this.geminiApiKey) {
            this.geminiApiKeyInput.value = this.geminiApiKey;
            this.testApiKeyBtn.style.display = 'inline-flex';
        }
        const savedEngine = localStorage.getItem('processingEngine') || 'tesseract';
        this.engineSelect.value = savedEngine;
        this.engine = savedEngine;
        if (savedEngine === 'gemini') {
            this.geminiSettings.style.display = 'block';
        }
    }

    toggleSettings() {
        this.settingsContent.classList.toggle('active');
        this.settingsToggle.classList.toggle('active');
    }

    changeEngine(engine) {
        this.engine = engine;
        localStorage.setItem('processingEngine', engine);
        
        if (engine === 'gemini') {
            this.geminiSettings.style.display = 'block';
            if (!this.geminiApiKey) {
                alert('Please enter your Gemini API key to use Vision processing.');
            }
        } else {
            this.geminiSettings.style.display = 'none';
        }
    }

    saveApiKey() {
        const apiKey = this.geminiApiKeyInput.value.trim();
        if (!apiKey) {
            alert('Please enter a valid API key');
            return;
        }
        
        this.geminiApiKey = apiKey;
        localStorage.setItem('geminiApiKey', apiKey);
        this.testApiKeyBtn.style.display = 'inline-flex';
        alert('API key saved successfully!');
    }

    async testGeminiApi() {
        if (!this.geminiApiKey) {
            alert('Please enter and save your API key first');
            return;
        }

        this.showProgress('Testing Gemini API connection...');
        
        try {
            // Create a simple test image (1x1 white pixel)
            const canvas = document.createElement('canvas');
            canvas.width = 1;
            canvas.height = 1;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 1, 1);
            const testImage = canvas.toDataURL('image/jpeg').split(',')[1];

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: "Test" },
                                { inline_data: { mime_type: "image/jpeg", data: testImage } }
                            ]
                        }]
                    })
                }
            );

            this.hideProgress();

            if (response.ok) {
                alert('✅ API key is valid! Gemini Vision is ready to use.');
            } else {
                const error = await response.json();
                alert('❌ API key test failed: ' + (error.error?.message || 'Invalid API key'));
            }
        } catch (error) {
            this.hideProgress();
            alert('❌ API test failed: ' + error.message);
        }
    }

    async initTesseract() {
        this.showProgress('Initializing OCR engine...');
        try {
            this.worker = await Tesseract.createWorker({
                logger: m => {
                    if (m.status === 'recognizing text') {
                        this.updateProgress(m.progress * 100);
                    }
                }
            });
            await this.worker.loadLanguage('eng');
            await this.worker.initialize('eng');
            this.hideProgress();
            console.log('Tesseract initialized successfully');
        } catch (error) {
            console.error('Error initializing Tesseract:', error);
            alert('Failed to initialize OCR engine. Please refresh the page.');
        }
    }

    async handleFiles(files) {
        if (!files || files.length === 0) return;

        const imageFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/')
        );

        if (imageFiles.length === 0) {
            alert('Please select valid image files');
            return;
        }

        this.showProgress(`Processing ${imageFiles.length} image(s)...`);
        
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            this.updateProgress((i / imageFiles.length) * 100);
            this.updateProgressText(`Processing ${i + 1} of ${imageFiles.length}: ${file.name}`);
            
            try {
                await this.processImage(file);
            } catch (error) {
                console.error(`Error processing ${file.name}:`, error);
            }
        }

        this.hideProgress();
        this.displayResults();
        this.updateStats();
        this.fileInput.value = ''; // Reset input
    }

    async handleFolder(files) {
        if (!files || files.length === 0) return;

        const imageFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/')
        );

        if (imageFiles.length === 0) {
            alert('No image files found in the selected folder');
            return;
        }

        // Show folder structure info
        const folders = new Set();
        imageFiles.forEach(file => {
            const path = file.webkitRelativePath || file.name;
            const folderPath = path.substring(0, path.lastIndexOf('/'));
            if (folderPath) folders.add(folderPath);
        });

        const proceed = confirm(
            `Found ${imageFiles.length} image(s) in ${folders.size > 0 ? folders.size : 1} folder(s).\n\n` +
            `Processing may take a while. Continue?`
        );

        if (!proceed) {
            this.folderInput.value = '';
            return;
        }

        this.showProgress(`Processing folder with ${imageFiles.length} image(s)...`);
        
        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const relativePath = file.webkitRelativePath || file.name;
            this.updateProgress((i / imageFiles.length) * 100);
            this.updateProgressText(`Processing ${i + 1} of ${imageFiles.length}: ${relativePath}`);
            
            try {
                await this.processImage(file, relativePath);
            } catch (error) {
                console.error(`Error processing ${relativePath}:`, error);
            }
        }

        this.hideProgress();
        this.displayResults();
        this.updateStats();
        this.folderInput.value = ''; // Reset input
    }

    async processImage(file, relativePath = null) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const imageData = e.target.result;
                    let text = '';
                    
                    if (this.engine === 'gemini') {
                        text = await this.performGeminiVision(imageData);
                    } else {
                        text = await this.performOCR(imageData);
                    }
                    
                    const extractedData = this.extractData(text);
                    
                    this.results.push({
                        id: Date.now() + Math.random(),
                        filename: relativePath || file.name,
                        timestamp: new Date().toLocaleString(),
                        image: imageData,
                        rawText: text,
                        engine: this.engine,
                        ...extractedData
                    });
                    
                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    async performOCR(imageData) {
        try {
            if (!this.worker) {
                throw new Error('Tesseract not initialized');
            }
            const { data: { text } } = await this.worker.recognize(imageData);
            return text;
        } catch (error) {
            console.error('OCR Error:', error);
            return '';
        }
    }

    async performGeminiVision(imageData) {
        if (!this.geminiApiKey) {
            throw new Error('Gemini API key not set. Please configure it in Settings.');
        }

        try {
            // Remove data URL prefix to get base64 data
            const base64Data = imageData.split(',')[1];
            const mimeType = imageData.split(';')[0].split(':')[1];

            const prompt = `Analyze this image and extract the following information if present:
1. MAC Address (look for labels like "MAC", "MAC:", or similar, format can be like 480020CD6125 or 48:00:20:CD:61:25)
2. Serial Number (look for labels like "S/N", "SN", "Serial", or similar)
3. BLE MAC Address (look for labels like "BLE MAC", "BLE", or similar)
4. Device Location ID (look for alphanumeric codes like B2.02.WAP2.10, often near product model numbers or at bottom of label)

Return the information in this exact format:
MAC: [the MAC address or "Not found"]
S/N: [the serial number or "Not found"]
BLE MAC: [the BLE MAC address or "Not found"]
Device Loc ID: [the device location ID or "Not found"]

Be precise and only extract information that is clearly labeled. If you see barcodes, also try to read the text near them.`;

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.geminiApiKey}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        contents: [{
                            parts: [
                                { text: prompt },
                                {
                                    inline_data: {
                                        mime_type: mimeType,
                                        data: base64Data
                                    }
                                }
                            ]
                        }],
                        generationConfig: {
                            temperature: 0.1,
                            topK: 32,
                            topP: 1,
                            maxOutputTokens: 1024,
                        }
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Gemini API request failed');
            }

            const result = await response.json();
            const text = result.candidates[0]?.content?.parts[0]?.text || '';
            
            console.log('Gemini Vision Response:', text);
            return text;
        } catch (error) {
            console.error('Gemini Vision Error:', error);
            throw error;
        }
    }

    extractData(text) {
        // Pattern matching for different ID formats
        const patterns = {
            // MAC Address patterns (various formats)
            mac: [
                /MAC[:\s]*([0-9A-F]{12})/i,
                /MAC[:\s]*([0-9A-F]{2}[:-]){5}[0-9A-F]{2}/i,
                /MAC[:\s]*([0-9A-F]{4}\.){2}[0-9A-F]{4}/i,
                /(?:^|\s)([0-9A-F]{2}[:-]){5}[0-9A-F]{2}(?:\s|$)/i,
                /(?:^|\s)([0-9A-F]{12})(?:\s|$)/i
            ],
            // Serial Number patterns
            sn: [
                /S[\/\\\s]*N[:\s]*([A-Z0-9\-]+)/i,
                /Serial[:\s]*([A-Z0-9\-]+)/i,
                /SN[:\s]*([A-Z0-9\-]+)/i
            ],
            // BLE MAC patterns
            ble: [
                /BLE[:\s]*MAC[:\s]*([0-9A-F]{12})/i,
                /BLE[:\s]*([0-9A-F]{2}[:-]){5}[0-9A-F]{2}/i,
                /BLE[:\s]*([0-9A-F]{4}\.){2}[0-9A-F]{4}/i,
                /BL[EF][:\s]*MAC[:\s]*([A-Z0-9]+)/i
            ],
            // Device Location ID patterns
            deviceLocId: [
                /Device\s*Loc\s*ID[:\s]*([A-Z0-9.\-]+)/i,
                /Loc\s*ID[:\s]*([A-Z0-9.\-]+)/i,
                /Location\s*ID[:\s]*([A-Z0-9.\-]+)/i,
                /\b([A-Z]\d+\.\d+\.(?:WAP|AP|SW|RTR)[A-Z0-9.]+)\b/i,
                /\b([A-Z]\d+\.\d+\.[A-Z0-9.]+\d+)\b/i
            ]
        };

        const result = {
            mac: null,
            sn: null,
            ble: null,
            deviceLocId: null
        };

        // Extract MAC
        for (const pattern of patterns.mac) {
            const match = text.match(pattern);
            if (match) {
                result.mac = this.cleanMAC(match[0]);
                break;
            }
        }

        // Extract Serial Number
        for (const pattern of patterns.sn) {
            const match = text.match(pattern);
            if (match) {
                result.sn = this.cleanSN(match[1] || match[0]);
                break;
            }
        }

        // Extract BLE MAC
        for (const pattern of patterns.ble) {
            const match = text.match(pattern);
            if (match) {
                result.ble = this.cleanMAC(match[0]);
                break;
            }
        }

        // Extract Device Location ID
        for (const pattern of patterns.deviceLocId) {
            const match = text.match(pattern);
            if (match) {
                result.deviceLocId = this.cleanDeviceLocId(match[1] || match[0]);
                break;
            }
        }

        return result;
    }

    cleanMAC(mac) {
        // Remove label and clean MAC address
        return mac.replace(/MAC[:\s]*/i, '')
                  .replace(/BLE[:\s]*/i, '')
                  .replace(/\s/g, '')
                  .toUpperCase()
                  .trim();
    }

    cleanSN(sn) {
        // Remove label and clean serial number
        return sn.replace(/S[\/\\\s]*N[:\s]*/i, '')
                 .replace(/Serial[:\s]*/i, '')
                 .replace(/\s/g, '')
                 .toUpperCase()
                 .trim();
    }

    cleanDeviceLocId(locId) {
        // Remove label and clean device location ID
        return locId.replace(/Device\s*Loc\s*ID[:\s]*/i, '')
                    .replace(/Loc\s*ID[:\s]*/i, '')
                    .replace(/Location\s*ID[:\s]*/i, '')
                    .replace(/\s/g, '')
                    .toUpperCase()
                    .trim();
    }

    displayResults() {
        this.resultsGrid.innerHTML = '';
        
        if (this.results.length === 0) {
            this.resultsSection.style.display = 'none';
            this.statsSection.style.display = 'none';
            return;
        }

        this.resultsSection.style.display = 'block';
        this.statsSection.style.display = 'grid';
        this.resultCount.textContent = this.results.length;

        this.results.forEach((result, index) => {
            const card = this.createResultCard(result, index);
            this.resultsGrid.appendChild(card);
        });
    }

    createResultCard(result, index) {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.dataset.index = index;

        const imageHtml = result.image ? 
            `<img src="${result.image}" alt="${result.filename}" class="result-image" onclick="window.open('${result.image}', '_blank')">` : '';

        const engineBadge = result.engine === 'gemini' ? 
            '<span style="background: #4285f4; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; margin-left: 8px;">Gemini</span>' : 
            '<span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; margin-left: 8px;">OCR</span>';

        card.innerHTML = `
            <div class="result-header">
                <div>
                    <div class="result-filename">${result.filename} ${engineBadge}</div>
                    <div class="result-timestamp">${result.timestamp}</div>
                </div>
                ${imageHtml}
            </div>
            <div class="result-data">
                <div class="data-item">
                    <div class="data-label">MAC:</div>
                    <div class="data-value ${result.mac ? 'found' : 'not-found'}">
                        ${result.mac || 'Not found'}
                        ${result.mac ? `<button class="copy-btn" onclick="idScanner.copyToClipboard('${result.mac}')">Copy</button>` : ''}
                    </div>
                </div>
                <div class="data-item">
                    <div class="data-label">S/N:</div>
                    <div class="data-value ${result.sn ? 'found' : 'not-found'}">
                        ${result.sn || 'Not found'}
                        ${result.sn ? `<button class="copy-btn" onclick="idScanner.copyToClipboard('${result.sn}')">Copy</button>` : ''}
                    </div>
                </div>
                <div class="data-item">
                    <div class="data-label">BLE MAC:</div>
                    <div class="data-value ${result.ble ? 'found' : 'not-found'}">
                        ${result.ble || 'Not found'}
                        ${result.ble ? `<button class="copy-btn" onclick="idScanner.copyToClipboard('${result.ble}')">Copy</button>` : ''}
                    </div>
                </div>
                <div class="data-item">
                    <div class="data-label">Device Loc ID:</div>
                    <div class="data-value ${result.deviceLocId ? 'found' : 'not-found'}">
                        ${result.deviceLocId || 'Not found'}
                        ${result.deviceLocId ? `<button class="copy-btn" onclick="idScanner.copyToClipboard('${result.deviceLocId}')">Copy</button>` : ''}
                    </div>
                </div>
            </div>
        `;

        return card;
    }

    filterResults(query) {
        const cards = this.resultsGrid.querySelectorAll('.result-card');
        const searchTerm = query.toLowerCase();

        cards.forEach(card => {
            const index = parseInt(card.dataset.index);
            const result = this.results[index];
            const searchableText = `${result.filename} ${result.mac || ''} ${result.sn || ''} ${result.ble || ''} ${result.deviceLocId || ''}`.toLowerCase();
            
            if (searchableText.includes(searchTerm)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }

    updateStats() {
        document.getElementById('totalScanned').textContent = this.results.length;
        document.getElementById('totalMAC').textContent = this.results.filter(r => r.mac).length;
        document.getElementById('totalSN').textContent = this.results.filter(r => r.sn).length;
        document.getElementById('totalBLE').textContent = this.results.filter(r => r.ble).length;
        document.getElementById('totalDeviceLoc').textContent = this.results.filter(r => r.deviceLocId).length;
    }

    // Camera functions
    async openCamera() {
        try {
            await this.startCamera();
            this.cameraModal.classList.add('active');
        } catch (error) {
            console.error('Camera error:', error);
            alert('Unable to access camera: ' + error.message);
        }
    }

    async startCamera() {
        const constraints = {
            video: {
                facingMode: this.currentFacingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = this.currentStream;
    }

    async switchCamera() {
        this.currentFacingMode = this.currentFacingMode === 'environment' ? 'user' : 'environment';
        await this.stopCamera();
        await this.startCamera();
    }

    closeCamera() {
        this.stopCamera();
        this.cameraModal.classList.remove('active');
    }

    stopCamera() {
        if (this.currentStream) {
            this.currentStream.getTracks().forEach(track => track.stop());
            this.currentStream = null;
        }
    }

    capturePhoto() {
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        const ctx = this.canvas.getContext('2d');
        ctx.drawImage(this.video, 0, 0);

        const self = this;
        this.canvas.toBlob(async (blob) => {
            const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
            self.closeCamera();
            await self.handleFiles([file]);
        }, 'image/jpeg', 0.95);
    }

    // Utility functions
    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            // Could add a toast notification here
            console.log('Copied to clipboard:', text);
        }).catch(err => {
            console.error('Failed to copy:', err);
        });
    }

    clearResults() {
        if (confirm('Are you sure you want to clear all results?')) {
            this.results = [];
            this.displayResults();
            this.updateStats();
        }
    }

    exportCSV() {
        if (this.results.length === 0) {
            alert('No results to export');
            return;
        }

        const headers = ['Filename', 'Timestamp', 'MAC Address', 'Serial Number', 'BLE MAC', 'Device Loc ID'];
        const rows = this.results.map(r => [
            r.filename,
            r.timestamp,
            r.mac || '',
            r.sn || '',
            r.ble || '',
            r.deviceLocId || ''
        ]);

        const csv = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        this.downloadFile(csv, 'id_scanner_results.csv', 'text/csv');
    }

    exportJSON() {
        if (this.results.length === 0) {
            alert('No results to export');
            return;
        }

        const exportData = this.results.map(r => ({
            filename: r.filename,
            timestamp: r.timestamp,
            mac: r.mac,
            serialNumber: r.sn,
            bleMac: r.ble,
            deviceLocationId: r.deviceLocId
        }));

        const json = JSON.stringify(exportData, null, 2);
        this.downloadFile(json, 'id_scanner_results.json', 'application/json');
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    showProgress(text) {
        this.progressSection.style.display = 'block';
        this.progressText.textContent = text;
        this.progressFill.style.width = '0%';
    }

    updateProgress(percent) {
        this.progressFill.style.width = `${percent}%`;
    }

    updateProgressText(text) {
        this.progressText.textContent = text;
    }

    hideProgress() {
        setTimeout(() => {
            this.progressSection.style.display = 'none';
        }, 500);
    }
}

// Initialize the application
const idScanner = new IDScanner();

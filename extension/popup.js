// Variables globales
let currentLanguage = 'es';
const statusDiv = document.getElementById('status');
const languageSelect = document.getElementById('language');
const translateBtn = document.getElementById('translateBtn');
const resetBtn = document.getElementById('resetBtn');

// Event listeners
translateBtn.addEventListener('click', translateCurrentPage);
resetBtn.addEventListener('click', resetCurrentPage);
languageSelect.addEventListener('change', (e) => {
    currentLanguage = e.target.value;
    chrome.storage.local.set({ lastLanguage: currentLanguage });
});

// Cargar idioma guardado
chrome.storage.local.get(['lastLanguage'], (result) => {
    if (result.lastLanguage) {
        currentLanguage = result.lastLanguage;
        languageSelect.value = currentLanguage;
    }
});

function showStatus(message, type) {
    statusDiv.textContent = '';
    statusDiv.className = `status ${type}`;
    
    if (type === 'loading') {
        const spinner = document.createElement('span');
        spinner.className = 'spinner';
        statusDiv.appendChild(spinner);
        statusDiv.appendChild(document.createTextNode(message));
    } else {
        statusDiv.textContent = message;
    }
}

async function translateCurrentPage() {
    try {
        showStatus('Traduciendo página...', 'loading');
        translateBtn.disabled = true;
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, {
            action: 'translate',
            language: currentLanguage
        }, (response) => {
            translateBtn.disabled = false;
            
            if (chrome.runtime.lastError) {
                showStatus('⚠️ Recarga la página e intenta de nuevo', 'error');
                console.error('Error:', chrome.runtime.lastError);
            } else if (response && response.success) {
                showStatus(`✅ ¡Traducido al ${getLanguageName(currentLanguage)}!`, 'success');
            } else {
                showStatus('Error al traducir. Intenta de nuevo.', 'error');
            }
        });
    } catch (error) {
        translateBtn.disabled = false;
        console.error('Error:', error);
        showStatus('Error: ' + error.message, 'error');
    }
}

async function resetCurrentPage() {
    try {
        showStatus('Restaurando página...', 'loading');
        resetBtn.disabled = true;
        
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        chrome.tabs.sendMessage(tab.id, {
            action: 'reset'
        }, (response) => {
            resetBtn.disabled = false;
            
            if (chrome.runtime.lastError) {
                showStatus('Error al restaurar', 'error');
            } else if (response && response.success) {
                showStatus('✅ Página restaurada', 'success');
            }
        });
    } catch (error) {
        resetBtn.disabled = false;
        console.error('Error:', error);
        showStatus('Error: ' + error.message, 'error');
    }
}

function getLanguageName(code) {
    const names = {
        'es': 'Español',
        'en': 'English',
        'fr': 'Français',
        'de': 'Deutsch',
        'it': 'Italiano',
        'pt': 'Português',
        'ja': '日本語',
        'zh': '中文',
        'ko': '한국어',
        'ru': 'Русский',
        'ar': 'العربية'
    };
    return names[code] || code;
}

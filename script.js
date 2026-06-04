// Configuración de proxies CORS
const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://thingproxy.freeboard.io/fetch/',
];

let currentPageContent = null;
let currentLanguage = 'es';
let currentUrl = '';
let currentProxyIndex = 0;

// Elementos del DOM
const urlInput = document.getElementById('urlInput');
const translateBtn = document.getElementById('translateBtn');
const previewContainer = document.getElementById('previewContainer');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const backBtn = document.getElementById('backBtn');
const downloadBtn = document.getElementById('downloadBtn');
const languageSelect = document.getElementById('languageSelect');
const statusText = document.getElementById('statusText');

// Event Listeners
translateBtn.addEventListener('click', handleTranslate);
backBtn.addEventListener('click', handleBack);
downloadBtn.addEventListener('click', handleDownload);
languageSelect.addEventListener('change', handleLanguageChange);
urlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleTranslate();
});

async function handleTranslate() {
    const url = urlInput.value.trim();

    if (!url) {
        showError('Por favor ingresa una URL válida');
        return;
    }

    if (!isValidUrl(url)) {
        showError('La URL no es válida. Asegúrate que comience con http:// o https://');
        return;
    }

    currentUrl = url;
    currentLanguage = languageSelect.value;
    currentProxyIndex = 0;
    await translatePage(url);
}

async function translatePage(url) {
    try {
        showLoading(true);
        clearError();

        // Paso 1: Obtener el contenido de la página
        statusText.textContent = '📥 Cargando página...';
        const htmlContent = await fetchPageContent(url);

        // Paso 2: Parsear el HTML
        statusText.textContent = '⚙️ Procesando contenido...';
        const doc = new DOMParser().parseFromString(htmlContent, 'text/html');

        // Paso 3: Extraer textos para traducir
        statusText.textContent = '📝 Extrayendo textos...';
        const textsToTranslate = extractTexts(doc);
        console.log(`Textos encontrados: ${textsToTranslate.length}`);

        if (textsToTranslate.length === 0) {
            showError('No se encontraron textos para traducir en esta página');
            showLoading(false);
            return;
        }

        // Paso 4: Traducir textos
        statusText.textContent = `🌐 Traduciendo ${textsToTranslate.length} textos...`;
        const translatedTexts = await translateTexts(textsToTranslate, currentLanguage);

        // Paso 5: Reemplazar textos en el HTML
        statusText.textContent = '🔄 Reemplazando textos traducidos...';
        replaceTexts(doc, translatedTexts, textsToTranslate);

        // Paso 6: Mostrar resultado
        statusText.textContent = '✅ ¡Página traducida exitosamente!';
        currentPageContent = doc.documentElement.outerHTML;
        displayTranslatedPage(doc, url);

        showLoading(false);
        backBtn.style.display = 'inline-block';
        downloadBtn.style.display = 'inline-block';

    } catch (error) {
        console.error('Error:', error);
        showError(`Error al traducir: ${error.message}`);
        showLoading(false);
    }
}

async function fetchPageContent(url) {
    let lastError = null;

    // Intentar con cada proxy disponible
    for (let i = 0; i < CORS_PROXIES.length; i++) {
        try {
            currentProxyIndex = i;
            statusText.textContent = `📥 Intentando cargar página (proxy ${i + 1}/${CORS_PROXIES.length})...`;
            
            const proxyUrl = buildProxyUrl(CORS_PROXIES[i], url);
            console.log(`Intentando con proxy: ${proxyUrl}`);
            
            const response = await Promise.race([
                fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                }),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), 10000)
                )
            ]);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const text = await response.text();
            
            // Validar que sea HTML
            if (text && (text.includes('<!DOCTYPE') || text.includes('<html') || text.includes('<body'))) {
                console.log(`✓ Proxy ${i + 1} funcionó correctamente`);
                return text;
            } else {
                throw new Error('Respuesta no válida');
            }

        } catch (error) {
            console.warn(`✗ Proxy ${i + 1} falló:`, error.message);
            lastError = error;
            // Continuar con el siguiente proxy
        }
    }

    // Si todos los proxies fallan, intentar acceso directo
    try {
        console.log('Intentando acceso directo...');
        statusText.textContent = '📥 Intentando acceso directo...';
        
        const response = await Promise.race([
            fetch(url, {
                headers: {
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                mode: 'cors'
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 10000)
            )
        ]);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();
        console.log('✓ Acceso directo funcionó');
        return text;

    } catch (e) {
        console.error('✗ Acceso directo falló:', e.message);
    }

    throw new Error(
        `No se pudo cargar la página después de intentar ${CORS_PROXIES.length + 1} métodos. ` +
        `El sitio puede tener restricciones muy estrictas. ` +
        `Intenta con otra página o URL diferente.`
    );
}

function buildProxyUrl(proxyBase, targetUrl) {
    if (proxyBase.includes('corsproxy.io')) {
        return proxyBase + targetUrl;
    } else if (proxyBase.includes('thingproxy')) {
        return proxyBase + targetUrl;
    } else {
        // allorigins
        return proxyBase + encodeURIComponent(targetUrl);
    }
}

function extractTexts(doc) {
    const texts = [];
    const textMap = new Map();
    let id = 0;

    // Extraer de nodos de texto
    const walker = doc.createTreeWalker(
        doc.body || doc.documentElement,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let node;
    while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        
        // Filtrar textos vacíos, muy cortos, números y duplicados
        if (text && text.length > 2 && !textMap.has(text) && !isOnlyNumbers(text) && !isDate(text)) {
            const textId = `TEXT_${id}`;
            texts.push({
                id: textId,
                text: text,
                node: node,
                nodeId: id
            });
            textMap.set(text, id);
            id++;
        }
    }

    // Extraer de atributos importantes
    const elementsWithAttrs = doc.querySelectorAll('[placeholder], [title], [alt], [aria-label]');
    elementsWithAttrs.forEach(elem => {
        ['placeholder', 'title', 'alt', 'aria-label'].forEach(attr => {
            const value = elem.getAttribute(attr);
            if (value && value.trim() && value.length > 2 && !textMap.has(value) && !isOnlyNumbers(value)) {
                texts.push({
                    id: `ATTR_${id}`,
                    text: value,
                    attr: attr,
                    element: elem,
                    nodeId: id
                });
                textMap.set(value, id);
                id++;
            }
        });
    });

    return texts;
}

function isOnlyNumbers(text) {
    return /^[\d\s\.\,\-\+\(\)%$€¥:;/]*$/.test(text);
}

function isDate(text) {
    return /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}|^\d{1,2}:\d{2}/.test(text);
}

async function translateTexts(textsArray, targetLang) {
    if (textsArray.length === 0) return {};

    const batchSize = 100;
    const translations = {};

    for (let i = 0; i < textsArray.length; i += batchSize) {
        const batch = textsArray.slice(i, Math.min(i + batchSize, textsArray.length));
        const batchTexts = batch.map(item => item.text);

        try {
            const translated = await translateBatch(batchTexts, targetLang);
            
            batch.forEach((item, index) => {
                translations[item.nodeId] = {
                    original: item.text,
                    translated: translated[index] || item.text,
                    type: item.node ? 'text' : 'attr',
                    attr: item.attr,
                    node: item.node,
                    element: item.element
                };
            });

            statusText.textContent = `🌐 Traduciendo ${Math.min(i + batchSize, textsArray.length)}/${textsArray.length} textos...`;
            await new Promise(resolve => setTimeout(resolve, 200));
        } catch (error) {
            console.error('Error en traducción de lote:', error);
            batch.forEach(item => {
                translations[item.nodeId] = {
                    original: item.text,
                    translated: item.text,
                    type: item.node ? 'text' : 'attr'
                };
            });
        }
    }

    return translations;
}

async function translateBatch(texts, targetLang) {
    try {
        // Usar LibreTranslate API (gratuita)
        const response = await Promise.race([
            fetch('https://libretranslate.de/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                },
                body: JSON.stringify({
                    q: texts.join('\n'),
                    source: 'auto',
                    target: targetLang
                })
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout traducción')), 15000)
            )
        ]);

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.translatedText) {
            throw new Error('Sin respuesta de traducción');
        }

        return data.translatedText.split('\n');

    } catch (error) {
        console.error('LibreTranslate error:', error);
        // Intentar API alternativa de MyMemory
        try {
            return await translateWithMyMemory(texts, targetLang);
        } catch (e) {
            console.error('MyMemory error:', e);
            return texts; // Retornar textos originales si todo falla
        }
    }
}

async function translateWithMyMemory(texts, targetLang) {
    const results = [];
    
    // MyMemory permite máximo 500 caracteres por solicitud
    for (const text of texts) {
        try {
            const response = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${targetLang}`
            );
            const data = await response.json();
            
            if (data.responseData && data.responseData.translatedText) {
                results.push(data.responseData.translatedText);
            } else {
                results.push(text);
            }
        } catch (e) {
            console.warn('MyMemory falló para:', text);
            results.push(text);
        }
    }
    
    return results;
}

function replaceTexts(doc, translations, textsArray) {
    textsArray.forEach((item) => {
        const trans = translations[item.nodeId];
        if (!trans) return;

        if (item.node) {
            // Reemplazar nodo de texto
            if (item.node.textContent.trim() === item.text) {
                item.node.textContent = trans.translated;
            }
        } else if (item.element) {
            // Reemplazar atributo
            if (item.element.getAttribute(item.attr) === item.text) {
                item.element.setAttribute(item.attr, trans.translated);
            }
        }
    });
}

function displayTranslatedPage(doc, baseUrl) {
    const content = doc.body ? doc.body.innerHTML : doc.documentElement.innerHTML;
    
    const cleanContent = sanitizeHTML(content);
    previewContainer.innerHTML = `<div class="translated-content">${cleanContent}</div>`;
    
    adjustResourceUrls(previewContainer, baseUrl);
}

function sanitizeHTML(html) {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    // Remover scripts y elementos peligrosos
    temp.querySelectorAll('script, iframe, embed, object').forEach(el => {
        el.remove();
    });

    // Remover atributos on*
    temp.querySelectorAll('*').forEach(el => {
        Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('on')) {
                el.removeAttribute(attr.name);
            }
        });
    });

    return temp.innerHTML;
}

function adjustResourceUrls(container, baseUrl) {
    try {
        const baseUrlObj = new URL(baseUrl);
        const baseHref = `${baseUrlObj.protocol}//${baseUrlObj.hostname}`;

        container.querySelectorAll('img, link, source').forEach(el => {
            const attr = el.tagName === 'LINK' ? 'href' : (el.tagName === 'SOURCE' ? 'src' : 'src');
            let url = el.getAttribute(attr);
            
            if (url && !url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('blob:')) {
                if (url.startsWith('/')) {
                    url = baseHref + url;
                } else {
                    url = baseUrl.split('?')[0].replace(/\/$/, '') + '/' + url;
                }
                el.setAttribute(attr, url);
            }
        });
    } catch (e) {
        console.warn('Error ajustando URLs:', e);
    }
}

function handleBack() {
    previewContainer.innerHTML = '<p class="placeholder">La página traducida aparecerá aquí...</p>';
    backBtn.style.display = 'none';
    downloadBtn.style.display = 'none';
    statusText.textContent = '';
    currentPageContent = null;
    urlInput.focus();
}

function handleDownload() {
    if (!currentPageContent) {
        showError('No hay contenido para descargar');
        return;
    }

    const blob = new Blob([currentPageContent], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `pagina-traducida-${new Date().getTime()}.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function handleLanguageChange() {
    currentLanguage = languageSelect.value;
    const langName = languageSelect.options[languageSelect.selectedIndex].text;
    statusText.textContent = `✅ Idioma cambiado a: ${langName}`;
}

function isValidUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
        return false;
    }
}

function showLoading(show) {
    loading.style.display = show ? 'block' : 'none';
}

function showError(message) {
    errorMessage.textContent = '❌ ' + message;
    errorMessage.style.display = 'block';
}

function clearError() {
    errorMessage.style.display = 'none';
    errorMessage.textContent = '';
}

// Inicialización
window.addEventListener('DOMContentLoaded', () => {
    console.log('✅ Web Translator v2.0 - Mejorado con múltiples proxies');
    console.log('Proxies disponibles:', CORS_PROXIES.length);
    urlInput.focus();
});

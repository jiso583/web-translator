// Content script - Se ejecuta en el contexto de la página web
let originalHtml = null;
let isTranslated = false;
let translationInProgress = false;

// Escuchar mensajes del popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[Translator] Mensaje recibido:', request.action);
    
    if (request.action === 'translate') {
        if (translationInProgress) {
            sendResponse({ success: false, error: 'Traducción en progreso' });
            return;
        }
        
        translationInProgress = true;
        translatePage(request.language).then(() => {
            translationInProgress = false;
            sendResponse({ success: true });
        }).catch(error => {
            translationInProgress = false;
            console.error('[Translator] Error:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true;
        
    } else if (request.action === 'reset') {
        resetPage();
        sendResponse({ success: true });
    }
});

async function translatePage(language) {
    try {
        // Guardar contenido original si no lo hemos hecho
        if (!originalHtml) {
            originalHtml = document.documentElement.outerHTML;
            console.log('[Translator] Contenido original guardado');
        }

        // Extraer todos los textos
        const texts = extractAllTexts();
        console.log(`[Translator] Textos encontrados: ${texts.length}`);

        if (texts.length === 0) {
            throw new Error('No se encontraron textos para traducir');
        }

        // Traducir
        const translations = await translateTexts(texts, language);
        console.log(`[Translator] Textos traducidos: ${Object.keys(translations).length}`);

        // Reemplazar en la página
        replaceTextsInPage(translations);

        isTranslated = true;
        console.log('[Translator] Página traducida exitosamente');
        
    } catch (error) {
        console.error('[Translator] Error:', error);
        throw error;
    }
}

function extractAllTexts() {
    const texts = [];
    const textMap = new Map();
    let id = 0;

    // Crear TreeWalker para todos los nodos de texto
    const walker = document.createTreeWalker(
        document.body || document.documentElement,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );

    let node;
    const tagsToIgnore = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME']);

    while (node = walker.nextNode()) {
        const text = node.textContent.trim();
        const parentTag = node.parentElement?.tagName;

        // Filtros
        if (text && 
            text.length > 2 && 
            !textMap.has(text) && 
            !isOnlyNumbers(text) && 
            !isDate(text) &&
            !tagsToIgnore.has(parentTag)) {
            
            texts.push({
                id: id,
                text: text,
                node: node
            });
            textMap.set(text, id);
            id++;
        }
    }

    // Extraer de atributos
    try {
        const elementsWithAttrs = document.querySelectorAll('[placeholder], [title], [alt], [aria-label]');
        elementsWithAttrs.forEach(elem => {
            ['placeholder', 'title', 'alt', 'aria-label'].forEach(attr => {
                const value = elem.getAttribute(attr);
                if (value && value.trim() && value.length > 2 && !textMap.has(value) && !isOnlyNumbers(value)) {
                    texts.push({
                        id: id,
                        text: value,
                        node: null,
                        element: elem,
                        attr: attr
                    });
                    textMap.set(value, id);
                    id++;
                }
            });
        });
    } catch (e) {
        console.warn('[Translator] Error extrayendo atributos:', e);
    }

    return texts;
}

function isOnlyNumbers(text) {
    return /^[\d\s\.\,\-\+\(\)%$€¥:;/]*$/.test(text);
}

function isDate(text) {
    return /^\d{1,4}[-\/]\d{1,2}[-\/]\d{1,4}|^\d{1,2}:\d{2}/.test(text);
}

async function translateTexts(textsArray, language) {
    const translations = {};
    const batchSize = 50;

    for (let i = 0; i < textsArray.length; i += batchSize) {
        const batch = textsArray.slice(i, Math.min(i + batchSize, textsArray.length));
        const batchTexts = batch.map(item => item.text);

        try {
            console.log(`[Translator] Traduciendo lote ${Math.floor(i / batchSize) + 1}/${Math.ceil(textsArray.length / batchSize)}`);
            const translated = await translateBatch(batchTexts, language);
            
            batch.forEach((item, index) => {
                translations[item.id] = {
                    original: item.text,
                    translated: translated[index] || item.text,
                    node: item.node,
                    element: item.element,
                    attr: item.attr
                };
            });

            // Pequeña pausa
            await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
            console.error('[Translator] Error en lote:', error);
            batch.forEach(item => {
                translations[item.id] = {
                    original: item.text,
                    translated: item.text
                };
            });
        }
    }

    return translations;
}

async function translateBatch(texts, language) {
    try {
        // LibreTranslate
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
                    target: language
                })
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 15000)
            )
        ]);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        if (!data.translatedText) {
            throw new Error('No translated text');
        }

        return data.translatedText.split('\n');

    } catch (error) {
        console.warn('[Translator] LibreTranslate falló, intentando MyMemory:', error);
        return await translateBatchMyMemory(texts, language);
    }
}

async function translateBatchMyMemory(texts, language) {
    const results = [];
    
    for (const text of texts) {
        try {
            const response = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${language}`
            );
            const data = await response.json();
            results.push(data.responseData?.translatedText || text);
        } catch (e) {
            console.warn('[Translator] MyMemory falló para:', text);
            results.push(text);
        }
    }
    
    return results;
}

function replaceTextsInPage(translations) {
    let replaced = 0;
    
    Object.values(translations).forEach(item => {
        try {
            if (item.node && item.node.parentElement) {
                // Reemplazar nodo de texto
                const currentText = item.node.textContent.trim();
                if (currentText === item.original) {
                    item.node.textContent = item.translated;
                    replaced++;
                }
            } else if (item.element && item.attr) {
                // Reemplazar atributo
                const currentAttr = item.element.getAttribute(item.attr);
                if (currentAttr === item.original) {
                    item.element.setAttribute(item.attr, item.translated);
                    replaced++;
                }
            }
        } catch (e) {
            console.warn('[Translator] Error reemplazando texto:', e);
        }
    });
    
    console.log(`[Translator] ${replaced} textos reemplazados`);
}

function resetPage() {
    try {
        if (originalHtml) {
            document.documentElement.outerHTML = originalHtml;
            isTranslated = false;
            console.log('[Translator] Página restaurada');
        }
    } catch (error) {
        console.error('[Translator] Error al restaurar:', error);
        // Intentar recargar como fallback
        location.reload();
    }
}

console.log('[Translator] Content script cargado');

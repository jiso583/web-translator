// Service Worker - Background script
console.log('[Translator] Service Worker iniciado');

chrome.runtime.onInstalled.addListener((details) => {
    console.log('[Translator] Extensión instalada/actualizada');
    console.log('Detalles:', details);
    
    // Inicializar configuración
    chrome.storage.local.set({ 
        lastLanguage: 'es',
        installDate: new Date().toISOString()
    });
});

// Listener para cuando se activa una pestaña
chrome.tabs.onActivated.addListener((activeInfo) => {
    console.log('[Translator] Pestaña activada:', activeInfo.tabId);
});

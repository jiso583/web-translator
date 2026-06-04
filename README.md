# 🌐 Web Translator

Una aplicación web que te permite traducir **cualquier página web** de cualquier idioma al español (o cualquier otro idioma) manteniendo las imágenes y la calidad del contenido.

## ✨ Características

- 🔗 **Traduce cualquier página web** simplemente pegando el URL
- 🖼️ **Mantiene todas las imágenes intactas** sin pérdida de calidad
- 🌍 **Soporta múltiples idiomas** de destino (Español, Inglés, Francés, Alemán, Italiano, Portugués, Japonés, Chino)
- 📥 **Descarga la página traducida** como archivo HTML
- ⚡ **Traducción rápida y confiable** usando LibreTranslate
- 🔒 **Sin dependencias de clave API** (usa LibreTranslate gratuito)
- 📱 **Responsive** - Funciona en desktop, tablet y móvil

## 🚀 Cómo Usar

1. **Abre la aplicación**: Accede a `index.html` en tu navegador
2. **Pega un URL**: Ingresa la dirección web que quieres traducir
3. **Selecciona el idioma destino**: Elige al cual traducir (español por defecto)
4. **Haz clic en "Traducir al Español"**: Espera a que procese
5. **Ver resultado**: La página traducida aparecerá en tiempo real
6. **Descarga (opcional)**: Guarda la página traducida como archivo HTML

## 📋 Requisitos

- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Conexión a Internet
- Sin necesidad de servidor local

## 🛠️ Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript vanilla
- **Traducción**: LibreTranslate API (gratuito)
- **CORS Proxy**: AllOrigins (para acceder a cualquier página)

## 📂 Estructura del Proyecto

```
web-translator/
├── index.html      # Estructura HTML principal
├── styles.css      # Estilos y diseño responsivo
├── script.js       # Lógica de traducción
└── README.md       # Este archivo
```

## 🎯 Cómo Funciona

1. **Obtiene el contenido** de la página web usando un proxy CORS
2. **Extrae todos los textos** (párrafos, títulos, botones, atributos)
3. **Traduce en lotes** para mejorar velocidad
4. **Reemplaza textos** en el HTML manteniendo estructura
5. **Muestra el resultado** en el navegador
6. **Permite descargar** la página traducida

## ⚙️ Configuración

### Cambiar API de Traducción

En `script.js`, puedes cambiar la API de traducción:

```javascript
// LibreTranslate (actual - gratuito)
const response = await fetch('https://libretranslate.de/translate', {
    // ...
});

// O usar Google Translate API (requiere clave)
const response = await fetch(
    `https://translation.googleapis.com/language/translate/v2?q=${text}&target_language=${targetLang}&key=${API_KEY}`
);
```

### Agregar más Idiomas

En `index.html`, añade más opciones al select:

```html
<option value="ru">Русский</option>
<option value="ar">العربية</option>
```

## 🔒 Limitaciones y Consideraciones

- ⚠️ Algunas páginas con contenido dinámico (JavaScript heavy) pueden no traducirse completamente
- ⚠️ Recursos bloqueados por CORS pueden no cargar
- ⚠️ Animaciones y funcionalidades interactivas se pierden
- ✓ Imágenes se mantienen si son URLs absolutas
- ✓ Estilos CSS se preservan

## 🐛 Solución de Problemas

### "No se pudo acceder a la página"
- La página tiene restricciones CORS
- Intenta con otra página
- Usa el proxy alternativo en la configuración

### "Traducción incompleta"
- Algunos textos pueden ser dinámicos (cargados con JavaScript)
- Los atributos y placeholder se traducen si están presentes

### "Las imágenes no carga"
- Las imágenes son relativas a la URL original
- Descarga la página y ajusta las rutas manualmente

## 📝 Ejemplos de Uso

```
URL: https://example.com
Idioma: Español
Resultado: Página en español con todas las imágenes
```

```
URL: https://ja.wikipedia.org
Idioma: Español
Resultado: Wikipedia en Español
```

## 🔄 Próximas Mejoras

- [ ] Soporte para JavaScript dinámico
- [ ] Mejora de CORS proxy
- [ ] Caché de traducciones
- [ ] Historial de traducciones
- [ ] Extensión de navegador
- [ ] Modo oscuro
- [ ] Traducción offline

## 📄 Licencia

Este proyecto es de código abierto y está disponible bajo la licencia MIT.

## 💬 Contacto y Soporte

Si encuentras problemas o tienes sugerencias, abre un issue en el repositorio.

---

**Creado con ❤️ para traducir el mundo**

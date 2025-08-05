// server.js - Backend para RSS de Página 12
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { DOMParser } = require('xmldom');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Servir archivos estáticos

// Cache simple en memoria
let newsCache = {
    data: [],
    lastUpdate: null,
    expireTime: 10 * 60 * 1000 // 10 minutos
};

// Función para parsear RSS XML
function parseRSS(xmlText) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        const items = xmlDoc.getElementsByTagName('item');
        
        const newsArray = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            const title = item.getElementsByTagName('title')[0]?.textContent?.trim() || 'Sin título';
            const description = item.getElementsByTagName('description')[0]?.textContent || '';
            const link = item.getElementsByTagName('link')[0]?.textContent?.trim() || '#';
            const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || new Date().toISOString();
            const category = item.getElementsByTagName('category')[0]?.textContent?.trim() || '';
            
            // Limpiar HTML de la descripción
            const cleanDescription = description.replace(/<[^>]*>/g, '').trim();
            
            // Extraer resumen
            const summary = cleanDescription.length > 200 
                ? cleanDescription.substring(0, 200) + '...'
                : cleanDescription;
            
            newsArray.push({
                id: i,
                title: title,
                summary: summary,
                content: cleanDescription,
                source: 'Página 12',
                sourceUrl: link,
                date: new Date(pubDate).toISOString(),
                category: category,
                readTime: Math.max(1, Math.ceil(cleanDescription.split(' ').length / 200)) + ' min'
            });
        }
        
        return newsArray.sort((a, b) => new Date(b.date) - new Date(a.date));
        
    } catch (error) {
        console.error('Error parseando RSS:', error);
        throw new Error('Error procesando RSS: ' + error.message);
    }
}

// Función para obtener RSS de Página 12
async function fetchPagina12RSS() {
    try {
        console.log('Obteniendo RSS de Página 12...');
        
        const response = await fetch('https://www.pagina12.com.ar/rss/secciones/economia/notas', {
            headers: {
                'User-Agent': 'InfoMercado RSS Reader 1.0',
                'Accept': 'application/rss+xml, application/xml, text/xml'
            },
            timeout: 10000 // 10 segundos timeout
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const xmlText = await response.text();
        console.log('RSS obtenido, parseando...');
        
        const parsedNews = parseRSS(xmlText);
        console.log(`Parseadas ${parsedNews.length} noticias`);
        
        return parsedNews;
        
    } catch (error) {
        console.error('Error obteniendo RSS:', error);
        throw error;
    }
}

// Endpoint principal para obtener noticias
app.get('/api/news', async (req, res) => {
    try {
        const now = Date.now();
        
        // Verificar cache
        if (newsCache.data.length > 0 && 
            newsCache.lastUpdate && 
            (now - newsCache.lastUpdate) < newsCache.expireTime) {
            
            console.log('Devolviendo noticias desde cache');
            return res.json({
                success: true,
                data: newsCache.data,
                cached: true,
                lastUpdate: new Date(newsCache.lastUpdate).toISOString(),
                count: newsCache.data.length
            });
        }
        
        // Obtener noticias frescas
        const news = await fetchPagina12RSS();
        
        // Actualizar cache
        newsCache.data = news;
        newsCache.lastUpdate = now;
        
        res.json({
            success: true,
            data: news,
            cached: false,
            lastUpdate: new Date(now).toISOString(),
            count: news.length
        });
        
    } catch (error) {
        console.error('Error en /api/news:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            data: [],
            count: 0
        });
    }
});

// Endpoint para forzar actualización
app.post('/api/news/refresh', async (req, res) => {
    try {
        console.log('Forzando actualización de noticias...');
        
        const news = await fetchPagina12RSS();
        
        // Actualizar cache
        newsCache.data = news;
        newsCache.lastUpdate = Date.now();
        
        res.json({
            success: true,
            message: 'Noticias actualizadas exitosamente',
            data: news,
            count: news.length,
            lastUpdate: new Date(newsCache.lastUpdate).toISOString()
        });
        
    } catch (error) {
        console.error('Error en refresh:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Endpoint de salud
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        cache: {
            hasData: newsCache.data.length > 0,
            lastUpdate: newsCache.lastUpdate ? new Date(newsCache.lastUpdate).toISOString() : null,
            count: newsCache.data.length
        }
    });
});

// Servir el frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Inicializar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
    console.log(`📰 RSS URL: https://www.pagina12.com.ar/rss/secciones/economia/notas`);
    console.log(`🌐 Frontend: http://localhost:${PORT}`);
    console.log(`📡 API: http://localhost:${PORT}/api/news`);
    
    // Cargar noticias iniciales
    fetchPagina12RSS()
        .then(news => {
            newsCache.data = news;
            newsCache.lastUpdate = Date.now();
            console.log(`✅ Cache inicial: ${news.length} noticias cargadas`);
        })
        .catch(error => {
            console.error('❌ Error cargando cache inicial:', error.message);
        });
});

// Actualización automática cada 10 minutos
setInterval(async () => {
    try {
        console.log('🔄 Actualización automática de noticias...');
        const news = await fetchPagina12RSS();
        newsCache.data = news;
        newsCache.lastUpdate = Date.now();
        console.log(`✅ Cache actualizado: ${news.length} noticias`);
    } catch (error) {
        console.error('❌ Error en actualización automática:', error.message);
    }
}, 10 * 60 * 1000); // 10 minutos

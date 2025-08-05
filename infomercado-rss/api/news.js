// api/news.js - Serverless function para Vercel
const fetch = require('node-fetch');
const { DOMParser } = require('xmldom');

// Cache simple (se resetea en cada cold start)
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
            }
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

// Handler principal de la función serverless
export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Solo permitir GET
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }
    
    try {
        const now = Date.now();
        const forceRefresh = req.query.refresh === 'true';
        
        // Verificar cache (solo si no es refresh forzado)
        if (!forceRefresh && 
            newsCache.data.length > 0 && 
            newsCache.lastUpdate && 
            (now - newsCache.lastUpdate) < newsCache.expireTime) {
            
            console.log('Devolviendo noticias desde cache');
            return res.status(200).json({
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
        
        res.status(200).json({
            success: true,
            data: news,
            cached: false,
            lastUpdate: new Date(now).toISOString(),
            count: news.length
        });
        
    } catch (error) {
        console.error('Error en API:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            data: [],
            count: 0
        });
    }
}

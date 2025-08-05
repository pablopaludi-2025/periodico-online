// api/news.js - API principal para obtener noticias RSS
const fetch = require('node-fetch');
const { DOMParser } = require('xmldom');

// Cache simple (se resetea en cada cold start pero funciona para requests múltiples)
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
        
        // Verificar si hay errores de parseo
        const parserError = xmlDoc.getElementsByTagName('parsererror');
        if (parserError.length > 0) {
            throw new Error('Error parsing XML: ' + parserError[0].textContent);
        }
        
        const items = xmlDoc.getElementsByTagName('item');
        
        if (items.length === 0) {
            console.log('No items found, trying alternative selectors...');
            // Intentar con formato Atom
            const entries = xmlDoc.getElementsByTagName('entry');
            if (entries.length > 0) {
                return parseAtomFeed(entries);
            }
            throw new Error('No news items found in RSS feed');
        }
        
        const newsArray = [];
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            try {
                const title = item.getElementsByTagName('title')[0]?.textContent?.trim() || 'Sin título';
                const description = item.getElementsByTagName('description')[0]?.textContent || '';
                const link = item.getElementsByTagName('link')[0]?.textContent?.trim() || '#';
                const pubDate = item.getElementsByTagName('pubDate')[0]?.textContent || new Date().toISOString();
                const category = item.getElementsByTagName('category')[0]?.textContent?.trim() || '';
                
                // Limpiar HTML de la descripción
                const cleanDescription = description
                    .replace(/<[^>]*>/g, '')
                    .replace(/&nbsp;/g, ' ')
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .trim();
                
                // Extraer resumen (primeras 200 caracteres)
                const summary = cleanDescription.length > 200 
                    ? cleanDescription.substring(0, 200) + '...'
                    : cleanDescription;
                
                // Calcular tiempo de lectura
                const wordCount = cleanDescription.split(' ').length;
                const readTime = Math.max(1, Math.ceil(wordCount / 200)) + ' min';
                
                newsArray.push({
                    id: i,
                    title: title,
                    summary: summary,
                    content: cleanDescription,
                    source: 'Página 12',
                    sourceUrl: link,
                    date: new Date(pubDate).toISOString(),
                    category: category,
                    readTime: readTime,
                    wordCount: wordCount
                });
            } catch (itemError) {
                console.error(`Error processing item ${i}:`, itemError);
                continue; // Skip this item and continue
            }
        }
        
        // Ordenar por fecha más reciente primero
        return newsArray.sort((a, b) => new Date(b.date) - new Date(a.date));
        
    } catch (error) {
        console.error('Error in parseRSS:', error);
        throw new Error('RSS parsing failed: ' + error.message);
    }
}

// Parser alternativo para feeds Atom
function parseAtomFeed(entries) {
    const newsArray = [];
    
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        
        try {
            const title = entry.getElementsByTagName('title')[0]?.textContent?.trim() || 'Sin título';
            const summary = entry.getElementsByTagName('summary')[0]?.textContent || 
                           entry.getElementsByTagName('content')[0]?.textContent || '';
            const link = entry.getElementsByTagName('link')[0]?.getAttribute('href') || '#';
            const updated = entry.getElementsByTagName('updated')[0]?.textContent || 
                           entry.getElementsByTagName('published')[0]?.textContent || 
                           new Date().toISOString();
            
            const cleanSummary = summary.replace(/<[^>]*>/g, '').trim();
            const shortSummary = cleanSummary.length > 200 ? cleanSummary.substring(0, 200) + '...' : cleanSummary;
            
            newsArray.push({
                id: i,
                title: title,
                summary: shortSummary,
                content: cleanSummary,
                source: 'Página 12',
                sourceUrl: link,
                date: new Date(updated).toISOString(),
                category: '',
                readTime: Math.max(1, Math.ceil(cleanSummary.split(' ').length / 200)) + ' min'
            });
        } catch (itemError) {
            console.error(`Error processing Atom entry ${i}:`, itemError);
            continue;
        }
    }
    
    return newsArray.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Función para obtener RSS de Página 12
async function fetchPagina12RSS() {
    try {
        console.log('Fetching RSS from Página 12...');
        
        const rssUrl = 'https://www.pagina12.com.ar/rss/secciones/economia/notas';
        
        const response = await fetch(rssUrl, {
            headers: {
                'User-Agent': 'InfoMercado RSS Reader 1.0 (Vercel)',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*',
                'Accept-Encoding': 'gzip, deflate'
            },
            timeout: 15000 // 15 segundos timeout
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        console.log('Response content-type:', contentType);
        
        const xmlText = await response.text();
        
        if (!xmlText || xmlText.trim() === '') {
            throw new Error('Empty RSS response');
        }
        
        console.log(`RSS content length: ${xmlText.length} characters`);
        
        const parsedNews = parseRSS(xmlText);
        console.log(`Successfully parsed ${parsedNews.length} news items`);
        
        return parsedNews;
        
    } catch (error) {
        console.error('Error fetching RSS:', error);
        throw new Error(`Failed to fetch RSS: ${error.message}`);
    }
}

// Handler principal de la función serverless
export default async function handler(req, res) {
    // Configurar CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Solo permitir GET
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed. Use GET.',
            allowedMethods: ['GET']
        });
    }
    
    try {
        const now = Date.now();
        const forceRefresh = req.query.refresh === 'true';
        
        console.log(`API called at ${new Date().toISOString()}, forceRefresh: ${forceRefresh}`);
        
        // Verificar cache (solo si no es refresh forzado)
        if (!forceRefresh && 
            newsCache.data.length > 0 && 
            newsCache.lastUpdate && 
            (now - newsCache.lastUpdate) < newsCache.expireTime) {
            
            console.log('Returning cached news');
            
            // Añadir cache headers
            res.setHeader('Cache-Control', 's-maxage=300'); // 5 minutos en CDN
            
            return res.status(200).json({
                success: true,
                data: newsCache.data,
                cached: true,
                lastUpdate: new Date(newsCache.lastUpdate).toISOString(),
                count: newsCache.data.length,
                source: 'cache'
            });
        }
        
        // Obtener noticias frescas
        console.log('Fetching fresh news...');
        const news = await fetchPagina12RSS();
        
        // Actualizar cache
        newsCache.data = news;
        newsCache.lastUpdate = now;
        
        console.log(`Cache updated with ${news.length} items`);
        
        // Headers para datos frescos
        res.setHeader('Cache-Control', 's-maxage=600'); // 10 minutos en CDN
        
        return res.status(200).json({
            success: true,
            data: news,
            cached: false,
            lastUpdate: new Date(now).toISOString(),
            count: news.length,
            source: 'fresh',
            rssUrl: 'https://www.pagina12.com.ar/rss/secciones/economia/notas'
        });
        
    } catch (error) {
        console.error('API Error:', error);
        
        // Si tenemos cache viejo, usarlo como fallback
        if (newsCache.data.length > 0) {
            console.log('Using stale cache as fallback');
            return res.status(200).json({
                success: true,
                data: newsCache.data,
                cached: true,
                stale: true,
                lastUpdate: new Date(newsCache.lastUpdate).toISOString(),
                count: newsCache.data.length,
                warning: 'Using cached data due to RSS fetch error',
                source: 'stale-cache'
            });
        }
        
        // Sin cache disponible, retornar error
        return res.status(500).json({
            success: false,
            error: error.message,
            data: [],
            count: 0,
            timestamp: new Date().toISOString(),
            source: 'error'
        });
    }
}
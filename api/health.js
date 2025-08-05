// api/health.js - Health check endpoint para monitoreo
const fetch = require('node-fetch');

export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'GET') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });
    }
    
    const startTime = Date.now();
    
    try {
        console.log('Health check initiated');
        
        // Test básico de conectividad RSS
        const rssUrl = 'https://www.pagina12.com.ar/rss/secciones/economia/notas';
        const testResponse = await fetch(rssUrl, {
            method: 'HEAD',
            headers: {
                'User-Agent': 'InfoMercado Health Check'
            },
            timeout: 10000 // 10 segundos
        });
        
        const responseTime = Date.now() - startTime;
        
        const healthData = {
            status: 'OK',
            timestamp: new Date().toISOString(),
            responseTime: responseTime + 'ms',
            vercel: {
                region: process.env.VERCEL_REGION || 'unknown',
                environment: process.env.VERCEL_ENV || 'development',
                deployment: process.env.VERCEL_GIT_COMMIT_SHA || 'unknown'
            },
            rss: {
                url: rssUrl,
                accessible: testResponse.ok,
                status: testResponse.status,
                statusText: testResponse.statusText,
                contentType: testResponse.headers.get('content-type')
            },
            api: {
                newsEndpoint: '/api/news',
                healthEndpoint: '/api/health',
                methods: ['GET'],
                cache: '10 minutes',
                cors: 'enabled'
            },
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                memory: process.memoryUsage(),
                uptime: process.uptime() + 's'
            }
        };
        
        console.log('Health check completed successfully');
        
        res.status(200).json(healthData);
        
    } catch (error) {
        console.error('Health check failed:', error);
        
        const errorResponse = {
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            responseTime: (Date.now() - startTime) + 'ms',
            error: {
                message: error.message,
                type: error.name || 'Unknown'
            },
            vercel: {
                region: process.env.VERCEL_REGION || 'unknown',
                environment: process.env.VERCEL_ENV || 'development'
            },
            rss: {
                url: 'https://www.pagina12.com.ar/rss/secciones/economia/notas',
                accessible: false,
                error: error.message
            }
        };
        
        res.status(503).json(errorResponse);
    }
}

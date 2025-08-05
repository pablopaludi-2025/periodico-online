# InfoMercado - Agregador RSS

📰 **Periódico online que obtiene noticias económicas de Página 12 en tiempo real**

![Vercel](https://img.shields.io/badge/vercel-%23000000.svg?style=for-the-badge&logo=vercel&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![HTML5](https://img.shields.io/badge/html5-%23E34F26.svg?style=for-the-badge&logo=html5&logoColor=white)

## 🚀 Características

- ✅ **Noticias en tiempo real** desde RSS de Página 12
- ✅ **Serverless Functions** en Vercel
- ✅ **Cache inteligente** (10 minutos)
- ✅ **Sin restricciones CORS**
- ✅ **Búsqueda instantánea**
- ✅ **Diseño responsive**
- ✅ **Deploy automático** desde GitHub

## 📁 Estructura del Proyecto

```
infomercado-rss/
├── api/
│   ├── news.js          # API principal para noticias
│   └── health.js        # Health check endpoint
├── index.html           # Frontend
├── package.json         # Dependencias
├── vercel.json          # Configuración Vercel
└── README.md            # Este archivo
```

## 🛠️ Instalación Local

### Prerrequisitos
- Node.js 14 o superior
- npm o yarn
- Cuenta en Vercel (gratuita)

### Pasos

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/infomercado-rss.git
cd infomercado-rss
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Desarrollo local**
```bash
npm run dev
# o
vercel dev
```

4. **Acceder a la aplicación**
- Frontend: http://localhost:3000
- API: http://localhost:3000/api/news
- Health: http://localhost:3000/api/health

## 🌐 Deploy en Vercel

### Opción 1: Desde GitHub (Recomendado)

1. **Subir código a GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/tu-usuario/infomercado-rss.git
git push -u origin main
```

2. **Conectar con Vercel**
- Ir a [vercel.com](https://vercel.com)
- Importar proyecto desde GitHub
- Deploy automático ✅

### Opción 2: CLI de Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
```

## 📡 API Endpoints

### `GET /api/news`
Obtiene noticias del RSS de Página 12

**Parámetros query:**
- `refresh=true` - Fuerza actualización ignorando cache

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": 0,
      "title": "Título de la noticia",
      "summary": "Resumen de 200 caracteres...",
      "content": "Contenido completo de la noticia",
      "source": "Página 12",
      "sourceUrl": "https://www.pagina12.com.ar/...",
      "date": "2025-08-05T15:30:00.000Z",
      "category": "Economía",
      "readTime": "3 min"
    }
  ],
  "cached": false,
  "count": 20,
  "lastUpdate": "2025-08-05T15:30:00.000Z"
}
```

### `GET /api/health`
Health check del sistema

**Respuesta:**
```json
{
  "status": "OK",
  "timestamp": "2025-08-05T15:30:00.000Z",
  "vercel": {
    "region": "iad1",
    "environment": "production"
  },
  "rss": {
    "url": "https://www.pagina12.com.ar/rss/secciones/economia/notas",
    "accessible": true,
    "status": 200
  }
}
```

## 🔧 Configuración

### Variables de Entorno (Opcional)

En el dashboard de Vercel puedes agregar:

| Variable | Valor | Descripción |
|----------|-------|-------------|
| `RSS_URL` | `https://www.pagina12.com.ar/rss/secciones/economia/notas` | URL del RSS |
| `CACHE_DURATION` | `600000` | Duración cache en ms (10 min) |

### Personalización

**Cambiar fuente RSS:**
Editar `api/news.js` línea 95:
```javascript
const rssUrl = 'https://nueva-fuente-rss.com/feed.xml';
```

**Modificar tiempo de cache:**
Editar `api/news.js` línea 8:
```javascript
expireTime: 15 * 60 * 1000 // 15 minutos
```

## 🐛 Troubleshooting

### Error: "RSS parsing failed"
- Verificar que la URL RSS sea válida
- Comprobar que el servidor RSS esté accesible
- Revisar logs en Vercel dashboard

### Error: "Method not allowed"
- Verificar que uses GET para `/api/news`
- Comprobar configuración CORS en `vercel.json`

### Cache no funciona
- El cache se resetea en cada cold start de Vercel
- Para cache persistente, usar Redis o base de datos

## 📊 Performance

- **Cold start:** ~500ms
- **Warm request:** ~50-100ms
- **RSS fetch:** ~1-3 segundos
- **Cache hit:** ~10ms

## 🤝 Contribuir

1. Fork del proyecto
2. Crear branch de feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agrega nueva funcionalidad'`)
4. Push al branch (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles

## 🆘 Soporte

- **Issues:** [GitHub Issues](https://github.com/tu-usuario/infomercado-rss/issues)
- **Documentación:** Este README
- **Vercel Docs:** [vercel.com/docs](https://vercel.com/docs)

## 🔗 Enlaces

- **Demo:** https://tu-proyecto.vercel.app
- **API:** https://tu-proyecto.vercel.app/api/news
- **Página 12:** https://www.pagina12.com.ar
- **Vercel:** https://vercel.com

---

**Desarrollado con ❤️ para InfoMercado**

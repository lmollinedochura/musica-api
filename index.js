const express = require('express');
const yts = require('yt-search');
const cors = require('cors');
const app = express();

app.use(cors()); // Permite que tu APK se conecte desde cualquier celular

app.get('/search', async (req, res) => {
    try {
        const r = await yts(req.query.q || 'music');
        res.json(r.videos.slice(0, 20).map(v => ({ 
            id: v.videoId, 
            n: v.title, 
            t: v.thumbnail, 
            a: v.author.name 
        })));
    } catch (e) {
        res.status(500).json({ error: "Error en el servidor" });
    }
});

// Render usa la variable de entorno PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Servidor en puerto ' + PORT));
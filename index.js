const express = require('express');
const yts = require('yt-search');
const { exec } = require('child_process');
const app = express();

const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Premium Music Player</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap" rel="stylesheet">
    <style>
        :root { --bg: #0a0a0a; --panel: #1a1a1c; --accent: #ffffff; }
        body { background: var(--bg); color: white; font-family: 'Inter', sans-serif; margin: 0; overflow: hidden; height: 100vh; display: flex; flex-direction: column; }
        
        /* Buscador Estilo Cápsula */
        .header { padding: 30px; display: flex; justify-content: center; }
        .search-pill { background: #181818; border-radius: 30px; padding: 5px 25px; width: 100%; max-width: 500px; border: 1px solid #333; }
        input { background: transparent; border: none; color: white; padding: 12px; width: 100%; outline: none; font-size: 16px; text-align: center; }

        /* Cuadrícula de Canciones (Grid) */
        .grid { flex: 1; overflow-y: auto; padding: 0 40px 150px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 30px; }
        .card { cursor: pointer; transition: 0.3s; }
        .card:hover { transform: translateY(-5px); }
        .card img { width: 100%; aspect-ratio: 1; border-radius: 24px; object-fit: cover; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .card h4 { margin: 15px 0 5px; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .card p { margin: 0; font-size: 12px; color: #71717a; }

        /* PANEL DE REPRODUCCIÓN PROFESIONAL */
        .player-bar { 
            position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); 
            width: 90%; max-width: 850px; background: rgba(28, 28, 30, 0.95); 
            backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1);
            border-radius: 40px; padding: 15px 30px; display: flex; align-items: center; gap: 20px; z-index: 1000;
        }
        
        .track-info { display: flex; align-items: center; gap: 15px; flex: 1; min-width: 0; }
        #curImg { width: 50px; height: 50px; border-radius: 12px; display: none; object-fit: cover; }
        .text-clip { overflow: hidden; }
        .text-clip b { display: block; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .controls-center { flex: 2; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .btns { display: flex; align-items: center; gap: 20px; }
        .btn-ui { background: none; border: none; color: white; cursor: pointer; font-size: 20px; transition: 0.2s; }
        .btn-play { background: white; color: black; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; }

        /* BARRA DE PROGRESO INTERACTIVA */
        .progress-box { width: 100%; display: flex; align-items: center; gap: 10px; }
        .bar-bg { flex: 1; height: 4px; background: rgba(255,255,255,0.1); border-radius: 2px; cursor: pointer; }
        .bar-fill { height: 100%; background: white; width: 0%; border-radius: 2px; position: relative; }
        .time { font-size: 11px; color: #71717a; min-width: 35px; font-family: monospace; }

        #youtube-player { display: none; }
    </style>
</head>
<body>
    <div class="header">
        <div class="search-pill"><input type="text" id="q" placeholder="¿Qué quieres escuchar?" onkeypress="if(event.key==='Enter') search()"></div>
    </div>

    <div class="grid" id="results"></div>

    <div class="player-bar">
        <div class="track-info">
            <img id="curImg">
            <div class="text-clip">
                <b id="curTitle">Pista detenida</b>
                <span id="curArtist" style="font-size:11px; color:#71717a;">Selecciona música</span>
            </div>
        </div>

        <div class="controls-center">
            <div class="btns">
                <button class="btn-ui" onclick="prev()">⏮</button>
                <button class="btn-ui btn-play" onclick="toggle()" id="pBtn">▶</button>
                <button class="btn-ui" onclick="next()">⏭</button>
            </div>
            <div class="progress-box">
                <span class="time" id="t-cur">0:00</span>
                <div class="bar-bg" onclick="seek(event)"><div class="bar-fill" id="p-fill"></div></div>
                <span class="time" id="t-total">0:00</span>
            </div>
        </div>
    </div>

    <div id="youtube-player"></div>

    <script src="https://www.youtube.com/iframe_api"></script>
    <script>
        let player, playlist = [], curIdx = -1;
        let updateTimer;

        function onYouTubeIframeAPIReady() {
            player = new YT.Player('youtube-player', { events: { 'onStateChange': onState } });
        }

        async function search() {
            const q = document.getElementById('q').value;
            if(!q) return;
            const res = await fetch('/search?q=' + encodeURIComponent(q));
            playlist = await res.json();
            document.getElementById('results').innerHTML = playlist.map((s, i) => \`
                <div class="card" onclick="playT(\${i})">
                    <img src="\${s.t}">
                    <h4>\${s.n}</h4>
                    <p>\${s.a}</p>
                </div>\`).join('');
        }

        function playT(i) {
            if(i < 0 || i >= playlist.length) return;
            curIdx = i; const s = playlist[i];
            player.loadVideoById(s.id);
            document.getElementById('curTitle').innerText = s.n;
            document.getElementById('curArtist').innerText = s.a;
            document.getElementById('curImg').src = s.t;
            document.getElementById('curImg').style.display = 'block';
        }

        function onState(e) {
            const btn = document.getElementById('pBtn');
            if(e.data === 1) {
                btn.innerText = '⏸';
                updateTimer = setInterval(updateUI, 1000);
            } else {
                btn.innerText = '▶';
                clearInterval(updateTimer);
            }
            if(e.data === 0) next();
        }

        function updateUI() {
            const cur = player.getCurrentTime();
            const dur = player.getDuration();
            if(dur > 0) {
                document.getElementById('p-fill').style.width = (cur / dur * 100) + '%';
                document.getElementById('t-cur').innerText = fmt(cur);
                document.getElementById('t-total').innerText = fmt(dur);
            }
        }

        function fmt(s) {
            const m = Math.floor(s/60);
            const r = Math.floor(s%60);
            return m + ':' + (r < 10 ? '0' : '') + r;
        }

        function seek(e) {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            player.seekTo(pct * player.getDuration());
        }

        function toggle() { player.getPlayerState() === 1 ? player.pauseVideo() : player.playVideo(); }
        function next() { playT(curIdx + 1); }
        function prev() { playT(curIdx - 1); }
    </script>
</body>
</html>
`;

app.get('/', (req, res) => res.send(html));
app.get('/search', async (req, res) => {
    const r = await yts(req.query.q);
    res.json(r.videos.slice(0, 20).map(v => ({ id: v.videoId, n: v.title, t: v.thumbnail, a: v.author.name })));
});

app.listen(3000, () => {
    console.log('Online');
    exec('start http://localhost:3000');
});
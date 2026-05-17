const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();

const CONFIG_PATH = path.join(__dirname, 'config.json');
let config = { videoDir: __dirname, port: 3000 };
try {
  config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
} catch (e) {
  console.warn('config.json not found, using default');
}

const PORT = config.port || 3000;
const VIDEO_DIR = config.videoDir || __dirname;

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv', '.flv', '.m4v', '.wmv'];

app.use(cors());
app.use(express.static(__dirname));

let videoCache = null;
let cacheTime = 0;
const CACHE_TTL = 30000;

function getVideosFromDir(dirPath, baseDir) {
  const videos = [];
  function scanDir(dir) {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        try {
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (stat.isFile()) {
            const ext = path.extname(item).toLowerCase();
            if (VIDEO_EXTENSIONS.includes(ext)) {
              const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
              videos.push({
                id: Buffer.from(fullPath).toString('base64').slice(0, 20),
                filename: item,
                path: relativePath,
                size: stat.size,
                mtime: stat.mtime,
                likes: Math.floor(Math.random() * 50000) + 1000,
                comments: Math.floor(Math.random() * 5000) + 100,
                favorites: Math.floor(Math.random() * 20000) + 500,
                shares: Math.floor(Math.random() * 10000) + 200,
                username: getUsername(item),
                description: getDescription(item),
                avatar: null
              });
            }
          }
        } catch (e) {}
      }
    } catch (e) {}
  }
  scanDir(dirPath);
  return videos;
}

function getUsername(filename) {
  const names = ['Creator_' + Math.floor(Math.random()*9999), 'VideoMaster', 'LifeLogger', 'CreativeStudio', 'VideoDiary'];
  return '@' + names[Math.floor(Math.random() * names.length)];
}

function getDescription(filename) {
  const name = path.basename(filename, path.extname(filename));
  return name + ' #local #video #lifestyle';
}

function formatNumber(num) {
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w';
  return num.toString();
}

app.get('/api/videos', (req, res) => {
  const now = Date.now();
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;

  if (!videoCache || now - cacheTime > CACHE_TTL) {
    videoCache = getVideosFromDir(VIDEO_DIR, VIDEO_DIR);
    cacheTime = now;
  }

  const shuffled = videoCache.sort(() => Math.random() - 0.5);
  const total = shuffled.length;
  const start = (page - 1) * limit;
  const end = start + limit;
  const videos = shuffled.slice(start, end);

  res.json({
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    videos
  });
});

app.get('/api/test-videos', (req, res) => {
  const testFilePath = path.join(__dirname, 'test.txt');
  try {
    const content = fs.readFileSync(testFilePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const testVideos = lines.map((line, index) => {
      const fullPath = line.trim();
      const filename = path.basename(fullPath);
      const relativePath = filename;
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        stat = { size: 0, mtime: new Date() };
      }
      return {
        id: 'test_' + index,
        filename,
        path: relativePath,
        fullPath,
        size: stat.size,
        mtime: stat.mtime,
        likes: Math.floor(Math.random() * 50000) + 1000,
        comments: Math.floor(Math.random() * 5000) + 100,
        favorites: Math.floor(Math.random() * 20000) + 500,
        shares: Math.floor(Math.random() * 10000) + 200,
        username: '@TestUser',
        description: '[TEST VIDEO] ' + filename,
        avatar: null,
        isTestVideo: true
      };
    });
    res.json({ testVideos });
  } catch (e) {
    res.json({ testVideos: [] });
  }
});

app.get('/video/path', (req, res) => {
  const videoPath = req.query.path;
  if (!videoPath) {
    return res.status(400).json({ error: 'Path required' });
  }
  const fullPath = path.join(VIDEO_DIR, decodeURIComponent(videoPath));
  const resolvedPath = path.resolve(fullPath);
  const resolvedDir = path.resolve(VIDEO_DIR);
  if (!resolvedPath.startsWith(resolvedDir)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: 'Not found' });
  }
  const stat = fs.statSync(fullPath);
  res.json({
    exists: true,
    size: stat.size,
    mtime: stat.mtime,
    path: fullPath
  });
});

// 流式传输视频（支持 Range 请求，实现拖拽进度条）
app.get('/video/*', (req, res) => {
  const relativePath = req.params[0];
  const videoPath = path.join(VIDEO_DIR, relativePath);
  
  // 安全检查：确保路径在视频目录内
  const resolvedPath = path.resolve(videoPath);
  const resolvedDir = path.resolve(VIDEO_DIR);
  if (!resolvedPath.startsWith(resolvedDir)) {
    return res.status(403).json({ error: '禁止访问' });
  }

  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: '视频不存在' });
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

app.listen(PORT, () => {
  console.log('');
  console.log('🎵 仿抖音本地视频播放器已启动！');
  console.log(`📱 请在浏览器打开: http://localhost:${PORT}`);
  console.log(`📁 视频目录: ${VIDEO_DIR}`);
  console.log('');
  console.log('💡 修改视频目录：编辑 config.json 中的 videoDir 字段');
  console.log('按 Ctrl+C 停止服务器');
});

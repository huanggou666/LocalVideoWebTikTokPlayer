# Douyin Local Player

仿抖音风格的本地视频播放器，支持滑动切换视频、点赞、评论等功能。
<img width="645" height="1399" alt="image" src="https://github.com/user-attachments/assets/6c8c15f3-ee16-40e9-b8b6-2880cd814302" />


## Features

- Douyin-style swipe video feed
- Local folder video scanning
- Pagination for large video collections
- Like, comment, favorite, share interactions
- Auto-detect Node.js environment
- Responsive design for mobile
- **Test Mode**: Randomly insert test videos during scrolling

## Quick Start

### 1. Clone & Install

```bash
git clone <your-repo-url>
cd douyin-local-player
npm install
```

### 2. Configure Video Directory

Edit `config.json`:

```json
{
  "videoDir": "D:/Your/Videos/Folder",
  "port": 3000
}
```

### 3. Run

```bash
npm start
```

Then open http://localhost:3000 in your browser.

## Project Structure

```
douyin-local-player/
├── server.js        # Express server with video API
├── app.js           # Frontend logic
├── index.html       # Main HTML
├── style.css        # Styles
├── config.json      # Configuration
├── package.json     # Dependencies
└── 启动.bat         # Windows launcher
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/videos` | GET | Get video list (paginated) |
| `/api/test-videos` | GET | Get test videos from test.txt |
| `/video/*` | GET | Stream video file |

### Pagination Parameters

```
GET /api/videos?page=1&limit=30
```

Response:

```json
{
  "total": 1000,
  "page": 1,
  "limit": 30,
  "totalPages": 34,
  "videos": [...]
}
```

## Test Mode

Test Mode allows you to randomly insert specific test videos during scrolling to evaluate user engagement.

### Setup

Create a `test.txt` file in the project root with video file paths (one per line):

```
D:/Videos/test1.mp4
D:/Videos/test2.mp4
D:/Videos/test3.mp4
```

### Usage

1. Click the "⚗ Test Mode" button in the top-right corner
2. The button will show remaining test count (e.g., "20 left")
3. During the next 20 scrolls, test videos will randomly appear
4. Test videos are marked with `[TEST VIDEO]` prefix
5. Click again to disable Test Mode

## Configuration

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `videoDir` | string | project root | Path to video folder |
| `port` | number | 3000 | Server port |

## Tech Stack

- Express.js
- Vanilla JavaScript
- CSS3

## License

MIT

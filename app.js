const API_BASE = 'http://localhost:3000';

let videos = [];
let currentIndex = 0;
let isLoading = false;
let hasMore = true;
let currentPage = 1;
const PAGE_SIZE = 30;
const BUFFER_SIZE = 3;

let testMode = false;
let testVideos = [];
let testRemaining = 0;
let usedTestVideos = new Set();
let lastPlayedIsTest = false;
let lastNonTestIndex = -1;
let isMuted = false;

function formatCount(n) {
  if (n >= 10000) return (n / 10000).toFixed(1) + 'w';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return String(n);
}

function getRandomColor() {
  const colors = [
    'linear-gradient(135deg, #FF6B6B, #FF8E53)',
    'linear-gradient(135deg, #4ECDC4, #44A08D)',
    'linear-gradient(135deg, #A18CD1, #FBC2EB)',
    'linear-gradient(135deg, #FFC3A0, #FFAFBD)',
    'linear-gradient(135deg, #2193b0, #6dd5ed)',
    'linear-gradient(135deg, #cc2b5e, #753a88)',
    'linear-gradient(135deg, #f7971e, #ffd200)',
    'linear-gradient(135deg, #56ab2f, #a8e063)',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

function getInitial(username) {
  return username.replace('@', '').charAt(0).toUpperCase();
}

function parseDescription(desc) {
  return desc.replace(/#[\u4e00-\u9fa5\w.]+/g, match =>
    `<span class="hashtag">${match}</span>`
  );
}

function createVideoItem(video, index) {
  const item = document.createElement('div');
  item.className = 'video-item';
  item.dataset.index = index;
  item.dataset.videoPath = video.path;

  const avatarColor = getRandomColor();
  const initial = getInitial(video.username);

  const musicTitles = [
    'Original - ' + video.username,
    'Hot BGM',
    'Local Video',
  ];
  const musicTitle = musicTitles[index % musicTitles.length];

  item.innerHTML = `
    <video
      id="video-${index}"
      preload="none"
      loop
      playsinline
      webkit-playsinline
      data-src="${API_BASE}/video/${encodeURIComponent(video.path).replace(/%2F/g, '/')}"
    ></video>

    <div class="video-tap-area" data-index="${index}"></div>

    <div class="pause-icon" id="pause-${index}">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
        <rect x="6" y="4" width="4" height="16" rx="1"/>
        <rect x="14" y="4" width="4" height="16" rx="1"/>
      </svg>
    </div>

    <div class="video-actions">
      <div class="action-item" id="avatar-${index}">
        <div class="action-avatar" style="background: ${avatarColor};">
          ${initial}
          <div class="follow-btn">+</div>
        </div>
      </div>

      <div class="action-item" id="like-btn-${index}" data-liked="false">
        <div class="action-btn">
          <span class="like-icon emoji-icon" style="font-size: 36px;">🤍</span>
        </div>
        <span class="action-count" id="like-count-${index}">${formatCount(video.likes)}</span>
      </div>

      <div class="action-item" id="comment-btn-${index}" data-comments="${video.comments}">
        <div class="action-btn">
          <span class="emoji-icon" style="font-size: 34px;">💬</span>
        </div>
        <span class="action-count">${formatCount(video.comments)}</span>
      </div>

      <div class="action-item" id="fav-btn-${index}" data-faved="false">
        <div class="action-btn">
          <span class="fav-icon emoji-icon" style="font-size: 33px;">☆</span>
        </div>
        <span class="action-count" id="fav-count-${index}">${formatCount(video.favorites)}</span>
      </div>

      <div class="action-item" id="share-btn-${index}">
        <div class="action-btn">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
            <polyline points="15 17 20 12 15 7"/>
            <path d="M4 18v-2a4 4 0 0 1 4-4h12"/>
          </svg>
        </div>
        <span class="action-count">${formatCount(video.shares)}</span>
      </div>

      <div class="action-item">
        <div class="music-disc"></div>
      </div>
    </div>

    <div class="video-info">
      <div class="video-username">${video.username}</div>
      <div class="video-description">${parseDescription(video.description)}</div>
      <div class="video-music">
        <span class="music-icon">♫</span>
        <span class="music-name">${musicTitle}</span>
      </div>
    </div>

    <div class="video-progress" id="progress-${index}">
      <div class="video-progress-bar" id="progress-bar-${index}"></div>
    </div>
  `;

  return item;
}

function bindVideoEvents(item, video, index) {
  const videoEl = item.querySelector(`#video-${index}`);
  const pauseIcon = item.querySelector(`#pause-${index}`);
  const tapArea = item.querySelector('.video-tap-area');
  const likeBtn = item.querySelector(`#like-btn-${index}`);
  const commentBtn = item.querySelector(`#comment-btn-${index}`);
  const favBtn = item.querySelector(`#fav-btn-${index}`);
  const progressBar = item.querySelector(`#progress-bar-${index}`);
  const progressEl = item.querySelector(`#progress-${index}`);

  videoEl.addEventListener('timeupdate', () => {
    if (videoEl.duration) {
      const pct = (videoEl.currentTime / videoEl.duration) * 100;
      progressBar.style.width = pct + '%';
    }
  });

  progressEl.addEventListener('click', e => {
    e.stopPropagation();
    if (videoEl.duration) {
      const rect = progressEl.getBoundingClientRect();
      const x = e.clientX - rect.left;
      videoEl.currentTime = (x / rect.width) * videoEl.duration;
    }
  });

  let tapTimeout = null;
  let tapCount = 0;

  tapArea.addEventListener('click', e => {
    tapCount++;
    const x = e.clientX;
    const y = e.clientY;
    clearTimeout(tapTimeout);
    tapTimeout = setTimeout(() => {
      if (tapCount === 1) {
        togglePlay(videoEl, pauseIcon, index);
      } else if (tapCount >= 2) {
        triggerLike(index, x, y);
      }
      tapCount = 0;
    }, 220);
  });

  likeBtn.addEventListener('click', e => {
    e.stopPropagation();
    triggerLike(index);
  });

  favBtn.addEventListener('click', e => {
    e.stopPropagation();
    const isFaved = favBtn.dataset.faved === 'true';
    const favIcon = favBtn.querySelector('.fav-icon');
    const favCount = item.querySelector(`#fav-count-${index}`);
    const current = parseInt(favBtn.dataset.count || video.favorites);

    if (!isFaved) {
      favIcon.textContent = '⭐';
      favBtn.dataset.faved = 'true';
      favBtn.dataset.count = current + 1;
      favCount.textContent = formatCount(current + 1);
    } else {
      favIcon.textContent = '☆';
      favBtn.dataset.faved = 'false';
      favBtn.dataset.count = current - 1;
      favCount.textContent = formatCount(current - 1);
    }
    favIcon.style.animation = 'none';
    favIcon.offsetHeight;
    favIcon.style.animation = 'heartBeat 0.4s cubic-bezier(0.34,1.56,0.64,1)';
  });

  commentBtn.addEventListener('click', e => {
    e.stopPropagation();
    openCommentSheet(video.comments);
  });
}

function togglePlay(videoEl, pauseIcon, index) {
  if (videoEl.paused) {
    videoEl.play().catch(() => {});
    pauseIcon.classList.remove('show');
    pauseIcon.classList.add('hide');
    setTimeout(() => pauseIcon.classList.remove('hide'), 300);
  } else {
    videoEl.pause();
    pauseIcon.classList.remove('hide');
    pauseIcon.classList.add('show');
    setTimeout(() => pauseIcon.classList.remove('show'), 1800);
  }
}

function triggerLike(index, x, y) {
  const likeBtn = document.querySelector(`#like-btn-${index}`);
  const likeIcon = likeBtn?.querySelector('.like-icon');
  const likeCount = document.querySelector(`#like-count-${index}`);
  const isLiked = likeBtn?.dataset.liked === 'true';
  const videoData = videos[index];
  const current = parseInt(likeBtn.dataset.count || videoData.likes);

  if (!isLiked) {
    likeIcon.textContent = '❤️';
    likeBtn.dataset.liked = 'true';
    likeBtn.dataset.count = current + 1;
    likeCount.textContent = formatCount(current + 1);
    spawnFloatHeart(x, y);
  } else {
    likeIcon.textContent = '🤍';
    likeBtn.dataset.liked = 'false';
    likeBtn.dataset.count = current - 1;
    likeCount.textContent = formatCount(current - 1);
  }

  if (likeIcon) {
    likeIcon.style.animation = 'none';
    likeIcon.offsetHeight;
    likeIcon.style.animation = 'heartBeat 0.4s cubic-bezier(0.34,1.56,0.64,1)';
  }
}

function spawnFloatHeart(x, y) {
  const heart = document.createElement('div');
  heart.className = 'float-heart';
  heart.textContent = '❤️';
  heart.style.left = (x || window.innerWidth / 2) + 'px';
  heart.style.top = (y || window.innerHeight / 2) + 'px';
  document.body.appendChild(heart);
  setTimeout(() => heart.remove(), 1000);
}

function openCommentSheet(count) {
  document.getElementById('commentCount').textContent = formatCount(count);
  document.getElementById('commentSheet').classList.add('show');
  document.getElementById('sheetOverlay').classList.add('show');
}

document.getElementById('closeComment').addEventListener('click', () => {
  document.getElementById('commentSheet').classList.remove('show');
  document.getElementById('sheetOverlay').classList.remove('show');
});
document.getElementById('sheetOverlay').addEventListener('click', () => {
  document.getElementById('commentSheet').classList.remove('show');
  document.getElementById('sheetOverlay').classList.remove('show');
});

function showToast(text, duration = 2000) {
  document.querySelectorAll('.dy-toast').forEach(t => t.remove());
  const toast = document.createElement('div');
  toast.className = 'dy-toast';
  toast.style.cssText = `
    position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
    background: rgba(30,30,30,0.92); backdrop-filter: blur(12px);
    color: white; padding: 10px 22px; border-radius: 22px; font-size: 14px;
    z-index: 400; pointer-events: none; white-space: nowrap;
    border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    animation: toastIn 0.2s ease;
  `;
  toast.textContent = text;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

function loadVideo(index) {
  if (index < 0 || index >= videos.length) return;
  const item = document.querySelector(`.video-item[data-index="${index}"]`);
  if (!item) return;
  const videoEl = item.querySelector('video');
  if (!videoEl || videoEl.src) return;
  videoEl.src = videoEl.dataset.src;
  videoEl.muted = isMuted;
}

function playVideo(index) {
  if (index < 0 || index >= videos.length) return;
  loadVideo(index);
  const item = document.querySelector(`.video-item[data-index="${index}"]`);
  if (!item) return;
  const videoEl = item.querySelector(`#video-${index}`);
  if (!videoEl) return;
  videoEl.muted = isMuted;
  videoEl.play().catch(() => {});
}

function pauseVideo(index) {
  if (index < 0 || index >= videos.length) return;
  const item = document.querySelector(`.video-item[data-index="${index}"]`);
  if (!item) return;
  const videoEl = item.querySelector(`#video-${index}`);
  if (videoEl && !videoEl.paused) videoEl.pause();
}

function renderVisibleVideos() {
  const feed = document.getElementById('videoFeed');
  const items = feed.querySelectorAll('.video-item');
  const viewHeight = window.innerHeight;

  items.forEach(item => {
    const rect = item.getBoundingClientRect();
    const index = parseInt(item.dataset.index);
    const shouldRender = rect.top < viewHeight && rect.bottom > 0;
    const isRendered = item.querySelector('video').src;

    if (shouldRender && !isRendered) {
      loadVideo(index);
    }
  });
}

function setupIntersectionObserver() {
  const feed = document.getElementById('videoFeed');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const index = parseInt(entry.target.dataset.index);
      if (entry.isIntersecting) {
        currentIndex = index;
        playVideo(index);
        loadVideo(index - 1);
        loadVideo(index + 1);
      } else {
        pauseVideo(index);
      }
    });
  }, {
    threshold: 0.6,
    rootMargin: '0px'
  });

  const items = feed.querySelectorAll('.video-item');
  items.forEach(item => observer.observe(item));
}

let observer = null;

function reobserveItems() {
  if (observer) observer.disconnect();
  const feed = document.getElementById('videoFeed');
  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const domIndex = parseInt(entry.target.dataset.index);
      const videoData = videos[domIndex];
      const isTest = videoData?.isTestVideo;

      if (entry.isIntersecting) {
        const prevIndex = currentIndex;
        currentIndex = domIndex;
        playVideo(domIndex);
        loadVideo(domIndex + 1);

        if (prevIndex !== domIndex && !isTest && testMode && shouldInsertTest()) {
          setTimeout(() => {
            insertTestVideoAfterIndex(domIndex);
          }, 150);
        }
      } else {
        pauseVideo(domIndex);
      }
    });
  }, {
    threshold: 0.6,
    rootMargin: '0px'
  });
  feed.querySelectorAll('.video-item').forEach(item => observer.observe(item));
}

async function loadMoreVideos() {
  if (isLoading || !hasMore) return;
  isLoading = true;

  try {
    const resp = await fetch(`${API_BASE}/api/videos?page=${currentPage + 1}&limit=${PAGE_SIZE}`);
    if (!resp.ok) throw new Error('Failed');
    const data = await resp.json();

    if (!data.videos || data.videos.length === 0) {
      hasMore = false;
      isLoading = false;
      return;
    }

    currentPage = data.page;
    hasMore = data.page < data.totalPages;

    const feed = document.getElementById('videoFeed');
    const startIndex = videos.length;

    data.videos.forEach((video, i) => {
      videos.push(video);
      const item = createVideoItem(video, startIndex + i);
      feed.appendChild(item);
      bindVideoEvents(item, video, startIndex + i);
    });

    reobserveItems();

    if (currentIndex >= 0 && currentIndex < videos.length) {
      loadVideo(currentIndex);
      loadVideo(currentIndex + 1);
    }

  } catch (err) {
    console.error('Load more failed:', err);
  }

  isLoading = false;
}

function setupScrollListener() {
  const feed = document.getElementById('videoFeed');
  let loadingTriggered = false;

  feed.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = feed;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom < 500 && !loadingTriggered && hasMore && !isLoading) {
      loadingTriggered = true;
      loadMoreVideos().then(() => {
        loadingTriggered = false;
      });
    }

    renderVisibleVideos();
  });
}

async function init() {
  const loadingProgress = document.getElementById('loadingProgress');
  const loadingScreen = document.getElementById('loadingScreen');
  const noVideoHint = document.getElementById('noVideoHint');
  const feed = document.getElementById('videoFeed');

  let progress = 0;
  const progressInterval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 15, 90);
    loadingProgress.style.width = progress + '%';
  }, 200);

  try {
    const resp = await fetch(`${API_BASE}/api/videos?page=1&limit=${PAGE_SIZE}`);
    if (!resp.ok) throw new Error('Server error');
    const data = await resp.json();

    clearInterval(progressInterval);
    loadingProgress.style.width = '100%';

    await new Promise(r => setTimeout(r, 400));

    videos = data.videos || [];
    hasMore = data.page < data.totalPages;
    currentPage = 1;

    if (!videos.length) {
      loadingScreen.style.display = 'none';
      noVideoHint.style.display = 'flex';
      return;
    }

    videos.forEach((video, index) => {
      const item = createVideoItem(video, index);
      feed.appendChild(item);
      bindVideoEvents(item, video, index);
    });

    loadingScreen.style.opacity = '0';
    loadingScreen.style.transition = 'opacity 0.5s';
    setTimeout(() => loadingScreen.style.display = 'none', 500);

    reobserveItems();
    setupScrollListener();

    loadVideo(0);
    loadVideo(1);

    const firstVideo = document.querySelector('#video-0');
    if (firstVideo) {
      firstVideo.play().catch(() => {
        const startPlay = () => {
          playVideo(0);
          document.removeEventListener('click', startPlay);
          document.removeEventListener('touchstart', startPlay);
        };
        document.addEventListener('click', startPlay);
        document.addEventListener('touchstart', startPlay);
      });
    }

  } catch (err) {
    clearInterval(progressInterval);
    loadingScreen.innerHTML = `
      <div style="text-align:center; padding: 40px;">
        <div style="font-size:48px; margin-bottom:16px;">!</div>
        <p style="color:#fff; font-size:16px; margin-bottom:8px;">Cannot connect to server</p>
        <p style="color:rgba(255,255,255,0.5); font-size:13px; line-height:1.6;">
          Make sure to run:<br/>
          <code style="background:rgba(255,255,255,0.1);padding:4px 8px;border-radius:4px;font-family:monospace;">npm start</code>
        </p>
        <button onclick="location.reload()" style="margin-top:20px;background:#FE2C55;color:#fff;border:none;padding:10px 24px;border-radius:20px;font-size:14px;cursor:pointer;">Retry</button>
      </div>
    `;
  }
}

document.addEventListener('DOMContentLoaded', init);

document.querySelectorAll('.bottom-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.bottom-tab').forEach(t => t.classList.remove('active'));
    if (!tab.classList.contains('tab-center')) {
      tab.classList.add('active');
    }
    if (tab.id === 'tab-home') {
      const feed = document.getElementById('videoFeed');
      feed.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
});

document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
  });
});

document.addEventListener('keydown', e => {
  const feed = document.getElementById('videoFeed');
  if (e.key === 'ArrowDown' || e.key === 'j') {
    const next = Math.min(currentIndex + 1, videos.length - 1);
    const nextItem = document.querySelector(`.video-item[data-index="${next}"]`);
    nextItem?.scrollIntoView({ behavior: 'smooth' });
  } else if (e.key === 'ArrowUp' || e.key === 'k') {
    const prev = Math.max(currentIndex - 1, 0);
    const prevItem = document.querySelector(`.video-item[data-index="${prev}"]`);
    prevItem?.scrollIntoView({ behavior: 'smooth' });
  } else if (e.key === ' ') {
    e.preventDefault();
    const currentItem = document.querySelector(`.video-item[data-index="${currentIndex}"]`);
    const videoEl = currentItem?.querySelector(`#video-${currentIndex}`);
    const pauseIcon = currentItem?.querySelector(`#pause-${currentIndex}`);
    if (videoEl && pauseIcon) togglePlay(videoEl, pauseIcon, currentIndex);
  } else if (e.key === 'l') {
    triggerLike(currentIndex);
  }
});

async function loadTestVideos() {
  try {
    const resp = await fetch(`${API_BASE}/api/test-videos`);
    const data = await resp.json();
    testVideos = data.testVideos || [];
  } catch (e) {
    testVideos = [];
  }
}

function updateTestModeUI() {
  const btn = document.getElementById('testModeBtn');
  const countEl = document.getElementById('testModeCount');
  if (!btn) return;

  if (testMode) {
    btn.classList.add('active');
    countEl.textContent = testRemaining + ' left';
  } else {
    btn.classList.remove('active');
    countEl.textContent = '';
  }
}

function toggleTestMode() {
  if (!testMode) {
    testMode = true;
    testRemaining = 20;
    usedTestVideos.clear();
    lastPlayedIsTest = false;
    lastNonTestIndex = -1;
    showToast('Test Mode ON - 20 test videos will appear randomly');
  } else {
    testMode = false;
    testRemaining = 0;
    showToast('Test Mode OFF');
  }
  updateTestModeUI();
}

function shouldInsertTest() {
  if (!testMode || testRemaining <= 0) return false;
  return Math.random() < 0.15;
}

function getNextTestVideo() {
  for (let i = 0; i < testVideos.length; i++) {
    if (!usedTestVideos.has(i)) {
      usedTestVideos.add(i);
      testRemaining--;
      updateTestModeUI();
      return { ...testVideos[i], isTestVideo: true };
    }
  }
  if (testVideos.length > 0) {
    const i = Math.floor(Math.random() * testVideos.length);
    usedTestVideos.add(i);
    testRemaining--;
    updateTestModeUI();
    return { ...testVideos[i], isTestVideo: true };
  }
  return null;
}

function insertTestVideoAfterIndex(targetIndex) {
  const testVideo = getNextTestVideo();
  if (!testVideo) return false;

  const feed = document.getElementById('videoFeed');
  const items = feed.querySelectorAll('.video-item');
  const targetItem = items[targetIndex];
  if (!targetItem) return false;

  const testIndex = videos.length;
  const item = createVideoItem(testVideo, testIndex);
  bindVideoEvents(item, testVideo, testIndex);

  targetItem.insertAdjacentElement('afterend', item);
  videos.push(testVideo);

  reobserveItems();
  return true;
}

document.getElementById('testModeBtn').addEventListener('click', toggleTestMode);

loadTestVideos();

function updateMuteUI() {
  const btn = document.getElementById('muteBtn');
  const icon = document.getElementById('muteIcon');
  if (!btn || !icon) return;

  if (isMuted) {
    btn.classList.add('muted');
    icon.textContent = '🔇';
  } else {
    btn.classList.remove('muted');
    icon.textContent = '🔊';
  }
}

function toggleMute() {
  isMuted = !isMuted;
  updateMuteUI();

  const feed = document.getElementById('videoFeed');
  const videoEls = feed.querySelectorAll('video');
  videoEls.forEach(v => {
    v.muted = isMuted;
  });
}

function applyMuteToVideo(videoEl) {
  if (videoEl) {
    videoEl.muted = isMuted;
  }
}

document.getElementById('muteBtn').addEventListener('click', toggleMute);

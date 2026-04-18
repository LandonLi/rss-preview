document.addEventListener('DOMContentLoaded', () => {
    const rssUrlInput = document.getElementById('rssUrl');
    const previewBtn = document.getElementById('previewBtn');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const feedContent = document.getElementById('feedContent');
    const itemList = document.getElementById('itemList');

    previewBtn.addEventListener('click', () => {
        const url = rssUrlInput.value.trim();
        if (!url) {
            showError('请输入有效的 RSS 地址');
            return;
        }
        fetchRss(url);
    });

    rssUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') previewBtn.click();
    });

    async function fetchRss(url) {
        showLoading(true);
        hideError();
        feedContent.classList.add('hidden');

        try {
            const apiUrl = `/api/parse?url=${encodeURIComponent(url)}`;
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (!response.ok || data.error) {
                throw new Error(data.error || '解析失败');
            }

            renderFeed(data);
        } catch (err) {
            showError(err.message);
        } finally {
            showLoading(false);
        }
    }

    function renderFeed(data) {
        // Feed Header Info
        document.getElementById('feedTitle').textContent = data.title || '无标题';
        document.getElementById('feedDescription').textContent = data.description || '';
        document.getElementById('feedAuthor').textContent = data.itunesAuthor || data.creator || '';

        // Channel Image (iTunes focus)
        const feedImage = document.getElementById('feedImage');
        const channelImageUrl = data.itunesImage || (data.image && data.image.url);
        if (channelImageUrl) {
            feedImage.src = channelImageUrl;
            feedImage.classList.remove('hidden');
        } else {
            feedImage.classList.add('hidden');
        }

        const isPodcast = !!(data.itunesAuthor || data.items.some(i => i.enclosure && i.enclosure.type && i.enclosure.type.startsWith('audio/')));

        // Render Items
        itemList.innerHTML = '';
        data.items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = `rss-item ${isPodcast ? 'podcast-item' : ''}`;

            const dateStr = item.pubDate ? new Date(item.pubDate).toLocaleDateString('zh-CN', { 
                year: 'numeric', month: '2-digit', day: '2-digit' 
            }) : '';
            
            const duration = item.itunesDuration ? ` · ${item.itunesDuration}` : '';

            // Image handling
            const itemImageUrl = item.itunesImage || null;
            let itemImageHtml = '';
            let content = item.contentEncoded || item.content || item.summary || '';

            if (itemImageUrl) {
                itemImageHtml = `<img src="${itemImageUrl}" class="item-cover" alt="">`;
            }

            // Audio Player (Custom)
            let audioPlayerHtml = '';
            if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith('audio/')) {
                audioPlayerHtml = `
                    <div class="custom-audio-wrapper">
                        <button class="play-btn" data-url="${item.enclosure.url}">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                        <div class="audio-progress">
                            <div class="audio-progress-fill"></div>
                        </div>
                        <div class="audio-time">0:00</div>
                        <audio src="${item.enclosure.url}" class="hidden-audio"></audio>
                    </div>
                `;
            }

            itemEl.innerHTML = `
                <div class="item-meta">${dateStr}${duration}</div>
                <h3><a href="${item.link}" target="_blank" rel="noopener">${item.title}</a></h3>
                ${itemImageHtml}
                <div class="item-content">${content}</div>
                ${audioPlayerHtml}
                ${isPodcast ? '<button class="toggle-content" style="background:none;border:none;color:var(--text-muted);font-size:12px;cursor:pointer;margin-top:8px;">显示更多</button>' : ''}
            `;
            
            itemList.appendChild(itemEl);

            // Add events for audio and toggle
            if (audioPlayerHtml) {
                setupAudioPlayer(itemEl.querySelector('.custom-audio-wrapper'));
            }
            if (isPodcast) {
                const btn = itemEl.querySelector('.toggle-content');
                const contentDiv = itemEl.querySelector('.item-content');
                btn.addEventListener('click', () => {
                    const isCollapsed = contentDiv.style.maxHeight !== 'none';
                    contentDiv.style.maxHeight = isCollapsed ? 'none' : '100px';
                    contentDiv.style.maskImage = isCollapsed ? 'none' : 'linear-gradient(to bottom, black 50%, transparent 100%)';
                    btn.textContent = isCollapsed ? '收起内容' : '显示更多';
                });
            }
        });

        feedContent.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function setupAudioPlayer(wrapper) {
        const audio = wrapper.querySelector('.hidden-audio');
        const playBtn = wrapper.querySelector('.play-btn');
        const progress = wrapper.querySelector('.audio-progress');
        const progressFill = wrapper.querySelector('.audio-progress-fill');
        const timeDisplay = wrapper.querySelector('.audio-time');

        playBtn.addEventListener('click', () => {
            if (audio.paused) {
                // Pause all other audio first
                document.querySelectorAll('audio').forEach(a => {
                    if (a !== audio) {
                        a.pause();
                        const w = a.closest('.custom-audio-wrapper');
                        if (w) w.querySelector('.play-btn').innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
                    }
                });
                audio.play();
                playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            } else {
                audio.pause();
                playBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            }
        });

        audio.addEventListener('timeupdate', () => {
            const percent = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = `${percent}%`;
            
            const curMin = Math.floor(audio.currentTime / 60);
            const curSec = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
            const durMin = Math.floor(audio.duration / 60) || 0;
            const durSec = Math.floor(audio.duration % 60 || 0).toString().padStart(2, '0');
            timeDisplay.textContent = `${curMin}:${curSec} / ${durMin}:${durSec}`;
        });

        progress.addEventListener('click', (e) => {
            const rect = progress.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            audio.currentTime = pos * audio.duration;
        });
    }

    function showLoading(show) {
        loadingDiv.classList.toggle('hidden', !show);
    }

    function showError(msg) {
        errorDiv.textContent = msg;
        errorDiv.classList.remove('hidden');
    }

    function hideError() {
        errorDiv.classList.add('hidden');
    }
});

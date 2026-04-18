document.addEventListener('DOMContentLoaded', () => {
    const rssUrlInput = document.getElementById('rssUrl');
    const previewBtn = document.getElementById('previewBtn');
    const loadingDiv = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const feedContent = document.getElementById('feedContent');
    const itemList = document.getElementById('itemList');
    const siteFooter = document.getElementById('siteFooter');

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
        siteFooter.classList.add('hidden');

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
        // Feed Title
        document.getElementById('feedTitle').textContent = data.title || '无标题';

        // Feed Description
        document.getElementById('feedDescription').textContent = data.description || '';

        // Feed Meta (author + categories)
        const feedMeta = document.getElementById('feedMeta');
        feedMeta.innerHTML = '';

        const author = data.itunesAuthor || data.creator || '';
        if (author) {
            const authorEl = document.createElement('span');
            authorEl.className = 'feed-meta-author';
            authorEl.textContent = author;
            feedMeta.appendChild(authorEl);
        }

        const categories = data.categories_extra || [];
        categories.forEach(cat => {
            const tagEl = document.createElement('span');
            tagEl.className = 'feed-meta-tag';
            tagEl.textContent = cat;
            feedMeta.appendChild(tagEl);
        });

        // Channel Image
        const feedImage = document.getElementById('feedImage');
        const feedHeader = document.getElementById('feedHeader');
        let channelImageUrl = extractImageUrl(data.itunesImage);
        if (!channelImageUrl) channelImageUrl = (data.image && data.image.url);

        if (channelImageUrl) {
            feedImage.src = channelImageUrl;
            feedImage.classList.remove('hidden');
            feedHeader.classList.remove('no-image');
        } else {
            feedImage.classList.add('hidden');
            feedHeader.classList.add('no-image');
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

            // Image handling — enhanced extraction
            let itemImageUrl = extractImageUrl(item.itunesImage);

            let content = item.contentEncoded || item.content || item.summary || '';

            // For non-podcast items, try to extract first image from content as cover
            if (!itemImageUrl && !isPodcast && content) {
                const imgMatch = content.match(/<img[^>]+src=["']([^"']+)["'][^>]*\/?>/i);
                if (imgMatch && imgMatch[1]) {
                    itemImageUrl = imgMatch[1];
                    // Remove the entire img tag from content to avoid duplication
                    content = content.replace(imgMatch[0], '');
                }
            }

            let itemImageHtml = '';
            if (itemImageUrl) {
                itemImageHtml = `<img src="${itemImageUrl}" class="item-cover" alt="" loading="lazy" onerror="this.style.display='none'">`;
            }

            // Audio Player
            let audioPlayerHtml = '';
            if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith('audio/')) {
                audioPlayerHtml = `
                    <div class="custom-audio-wrapper">
                        <button class="play-btn" aria-label="Play">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                        </button>
                        <div class="audio-progress">
                            <div class="audio-progress-fill"></div>
                        </div>
                        <div class="audio-time">0:00</div>
                        <button class="volume-btn" aria-label="Volume">
                            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
                        </button>
                        <input type="range" class="volume-slider hidden" min="0" max="100" value="100">
                        <audio src="${item.enclosure.url}" class="hidden-audio" preload="none"></audio>
                    </div>
                `;
            }

            if (isPodcast) {
                itemEl.innerHTML = `
                    <div class="item-left">
                        ${itemImageHtml || `<div style="width:120px;height:120px;background:var(--bg-secondary);border:1px solid var(--border-color);"></div>`}
                    </div>
                    <div class="item-right">
                        <div class="item-meta">${dateStr}${duration}</div>
                        <h3><a href="${item.link}" target="_blank" rel="noopener">${item.title}</a></h3>
                        <div class="item-content">${content}</div>
                        ${audioPlayerHtml}
                        <button class="toggle-content">READ MORE</button>
                    </div>
                `;
            } else {
                itemEl.innerHTML = `
                    <div class="item-meta">${dateStr}</div>
                    <h3><a href="${item.link}" target="_blank" rel="noopener">${item.title}</a></h3>
                    ${itemImageHtml}
                    <div class="item-content">${content}</div>
                `;
            }

            itemList.appendChild(itemEl);

            if (audioPlayerHtml) setupAudioPlayer(itemEl.querySelector('.custom-audio-wrapper'));

            if (isPodcast) {
                const btn = itemEl.querySelector('.toggle-content');
                const contentDiv = itemEl.querySelector('.item-content');
                btn.addEventListener('click', () => {
                    const isCollapsed = !contentDiv.classList.contains('expanded');
                    contentDiv.classList.toggle('expanded', isCollapsed);
                    btn.textContent = isCollapsed ? 'COLLAPSE' : 'READ MORE';
                });
            }
        });

        feedContent.classList.remove('hidden');
        siteFooter.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Extract image URL from various rss-parser formats:
    // string "url", { url: "url" }, { $: { href: "url" } }, { href: "url" }
    function extractImageUrl(img) {
        if (!img) return null;
        if (typeof img === 'string') return img;
        if (typeof img === 'object') {
            if (img.url) return img.url;
            if (img.href) return img.href;
            if (img.$ && img.$.href) return img.$.href;
        }
        return null;
    }

    function setupAudioPlayer(wrapper) {
        const audio = wrapper.querySelector('.hidden-audio');
        const playBtn = wrapper.querySelector('.play-btn');
        const progress = wrapper.querySelector('.audio-progress');
        const progressFill = wrapper.querySelector('.audio-progress-fill');
        const timeDisplay = wrapper.querySelector('.audio-time');
        const volumeBtn = wrapper.querySelector('.volume-btn');
        const volumeSlider = wrapper.querySelector('.volume-slider');

        const playSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
        const pauseSvg = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

        playBtn.addEventListener('click', () => {
            if (audio.paused) {
                // Pause all other audio
                document.querySelectorAll('.hidden-audio').forEach(a => {
                    if (a !== audio) {
                        a.pause();
                        const w = a.closest('.custom-audio-wrapper');
                        if (w) w.querySelector('.play-btn').innerHTML = playSvg;
                    }
                });
                audio.play();
                playBtn.innerHTML = pauseSvg;
            } else {
                audio.pause();
                playBtn.innerHTML = playSvg;
            }
        });

        audio.addEventListener('timeupdate', () => {
            if (!audio.duration) return;
            const percent = (audio.currentTime / audio.duration) * 100;
            progressFill.style.width = `${percent}%`;
            const curMin = Math.floor(audio.currentTime / 60);
            const curSec = Math.floor(audio.currentTime % 60).toString().padStart(2, '0');
            const durMin = Math.floor(audio.duration / 60) || 0;
            const durSec = Math.floor(audio.duration % 60 || 0).toString().padStart(2, '0');
            timeDisplay.textContent = `${curMin}:${curSec} / ${durMin}:${durSec}`;
        });

        progress.addEventListener('click', (e) => {
            if (!audio.duration) return;
            const rect = progress.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            audio.currentTime = pos * audio.duration;
        });

        // Volume control
        volumeBtn.addEventListener('click', () => {
            volumeSlider.classList.toggle('hidden');
        });

        volumeSlider.addEventListener('input', () => {
            audio.volume = volumeSlider.value / 100;
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

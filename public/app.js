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
            showError('请输入有效的 RSS 链接');
            return;
        }
        fetchRss(url);
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
        // Render Header
        document.getElementById('feedTitle').textContent = data.title || '无标题';
        document.getElementById('feedDescription').textContent = data.description || '';
        document.getElementById('feedAuthor').textContent = data.itunesAuthor || data.creator || '';

        const feedImage = document.getElementById('feedImage');
        const imageUrl = (data.itunesImage && data.itunesImage.href) || (data.image && data.image.url);
        if (imageUrl) {
            feedImage.src = imageUrl;
            feedImage.classList.remove('hidden');
        } else {
            feedImage.classList.add('hidden');
        }

        // Render Items
        itemList.innerHTML = '';
        data.items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'rss-item';

            const pubDate = item.pubDate ? new Date(item.pubDate).toLocaleString() : '';
            
            // Check for audio enclosure (Podcast)
            let audioHtml = '';
            if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('audio/')) {
                audioHtml = `
                    <audio controls class="audio-player">
                        <source src="${item.enclosure.url}" type="${item.enclosure.type}">
                        您的浏览器不支持音频播放。
                    </audio>
                `;
            }

            const content = item.contentEncoded || item.content || item.summary || '';

            itemEl.innerHTML = `
                <h3><a href="${item.link}" target="_blank" rel="noopener">${item.title}</a></h3>
                <div class="item-meta">发布时间: ${pubDate} ${item.author ? ' | 作者: ' + item.author : ''}</div>
                <div class="item-content">${content}</div>
                ${audioHtml}
            `;
            itemList.appendChild(itemEl);
        });

        feedContent.classList.remove('hidden');
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

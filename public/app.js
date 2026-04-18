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

    // Support Enter key
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
        // Render Header
        document.getElementById('feedTitle').textContent = data.title || '无标题';
        document.getElementById('feedDescription').textContent = data.description || '';
        document.getElementById('feedAuthor').textContent = data.itunesAuthor || data.creator || '';

        // Categories
        const catContainer = document.getElementById('feedCategories');
        catContainer.innerHTML = '';
        const cats = data.categories_extra || [];
        cats.forEach(cat => {
            const span = document.createElement('span');
            span.className = 'feed-category';
            span.textContent = cat;
            catContainer.appendChild(span);
        });

        // Channel Image
        const feedImage = document.getElementById('feedImage');
        const channelImageUrl = data.itunesImage || (data.image && data.image.url);
        if (channelImageUrl) {
            feedImage.src = channelImageUrl;
            feedImage.classList.remove('hidden');
        } else {
            feedImage.classList.add('hidden');
        }

        // Render Items
        itemList.innerHTML = '';
        data.items.forEach(item => {
            const itemEl = document.createElement('div');
            itemEl.className = 'rss-item';

            const pubDate = item.pubDate ? new Date(item.pubDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '';
            
            // Audio (Podcast)
            let audioHtml = '';
            if (item.enclosure && item.enclosure.url && item.enclosure.type && item.enclosure.type.startsWith('audio/')) {
                audioHtml = `
                    <audio controls class="audio-player">
                        <source src="${item.enclosure.url}" type="${item.enclosure.type}">
                    </audio>
                `;
            }

            // Image handling (Duplicate detection)
            const itemImageUrl = item.itunesImage;
            let itemImageHtml = '';
            let content = item.contentEncoded || item.content || item.summary || '';

            if (itemImageUrl) {
                // Check if the same image is already in the content (simple URL check)
                if (!content.includes(itemImageUrl)) {
                    itemImageHtml = `<img src="${itemImageUrl}" class="item-cover" alt="">`;
                }
            }

            itemEl.innerHTML = `
                <h3><a href="${item.link}" target="_blank" rel="noopener">${item.title}</a></h3>
                <div class="item-meta">${pubDate} ${item.itunesDuration ? ' | ' + item.itunesDuration : ''}</div>
                ${itemImageHtml}
                <div class="item-content">${content}</div>
                ${audioHtml}
            `;
            itemList.appendChild(itemEl);
        });

        feedContent.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
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

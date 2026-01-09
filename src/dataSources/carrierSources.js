import { getRandomUserAgent, sleep, stripHtml, isDateWithinLastDays } from '../helpers.js';

const CarrierDataSource = {
    type: 'carrier-sources',
    
    // Configurable feeds
    feeds: [
        {
            name: 'ArXiv (cs.NI)',
            url: 'http://export.arxiv.org/rss/cs.NI',
            category: 'Academic'
        },
        {
            name: 'Google News - Standards (TM Forum/ETSI/3GPP)',
            url: 'https://news.google.com/rss/search?q=site:tmforum.org+OR+site:etsi.org+OR+site:3gpp.org+%22AI%22+OR+%22Autonomous+Network%22+when:7d&hl=en-US&gl=US&ceid=US:en',
            category: 'Standards'
        },
        {
            name: 'Google News - Vendors (Huawei/Ericsson/Nokia)',
            url: 'https://news.google.com/rss/search?q=site:nokia.com+OR+site:ericsson.com+OR+site:huawei.com+%22Network+AI%22+OR+%226G%22+when:7d&hl=en-US&gl=US&ceid=US:en',
            category: 'Vendors'
        },
        {
            name: 'Google News - Media (SDxCentral)',
            url: 'https://news.google.com/rss/search?q=site:sdxcentral.com+%22AI%22+when:7d&hl=en-US&gl=US&ceid=US:en',
            category: 'Media'
        },
        {
            name: '邮电设计技术 (WeChat)',
            url: 'https://rsshub.app/wechat/gzh/ydsjjs', // 使用 RSSHub 生成的 RSS 链接
            category: 'Academic'
        }
    ],

    async fetch(env) {
        const allItems = [];
        const filterDays = parseInt(env.FOLO_FILTER_DAYS || '3', 10);

        const fetchTextWithRetry = async (url, options, maxAttempts = 3) => {
            let lastError;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    const res = await fetch(url, options);
                    const bodyText = await res.text();

                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status} ${res.statusText}: ${bodyText.slice(0, 300)}`);
                    }

                    if (/internal error;\s*reference=/i.test(bodyText)) {
                        throw new Error(bodyText.match(/internal error;\s*reference=[^\s<]+/i)?.[0] || 'Google News internal error');
                    }

                    return bodyText;
                } catch (error) {
                    lastError = error;
                    if (attempt < maxAttempts) {
                        await sleep(600 * attempt);
                        continue;
                    }
                }
            }
            throw lastError;
        };

        for (const feed of this.feeds) {
            try {
                console.log(`Fetching Carrier Source: ${feed.name}...`);

                const headers = {
                    'User-Agent': getRandomUserAgent(),
                    'Accept': 'application/rss+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.7',
                    'Accept-Language': 'en-US,en;q=0.9'
                };

                const urlsToTry = [feed.url];
                if (feed.url.startsWith('https://news.google.com/rss/')) {
                    urlsToTry.push(`https://r.jina.ai/${feed.url}`);
                }

                let text = null;
                let lastError = null;
                for (const url of urlsToTry) {
                    try {
                        text = await fetchTextWithRetry(url, { headers }, 3);
                        break;
                    } catch (error) {
                        lastError = error;
                    }
                }

                if (text === null) {
                    console.error(`Failed to fetch ${feed.name}: ${lastError?.message || lastError}`);
                    continue;
                }

                const items = this.parseRSS(text);
                
                // Add metadata and filter
                const validItems = items.filter(item => {
                    if (!item.date) return false; 
                    if (!isDateWithinLastDays(item.date, filterDays)) return false;
                    return true;
                }).map(item => ({
                    id: item.link,
                    url: item.link,
                    title: item.title,
                    content_html: item.description,
                    date_published: item.date,
                    authors: [{ name: feed.name }],
                    source: feed.name,
                    category: feed.category
                }));

                allItems.push(...validItems);

            } catch (error) {
                console.error(`Error fetching ${feed.name}:`, error);
            }
        }

        return {
            version: "https://jsonfeed.org/version/1.1",
            title: "Carrier Network AI Feeds",
            home_page_url: "https://github.com/justlovemaki/CloudFlare-AI-Insight-Daily",
            description: "Aggregated Carrier Network AI feeds",
            language: "zh-cn",
            items: allItems
        };
    },

    parseRSS(xmlText) {
        const items = [];
        const itemRegex = /<item[\s\S]*?>([\s\S]*?)<\/item>/gi;
        let match;

        while ((match = itemRegex.exec(xmlText)) !== null) {
            const itemContent = match[1];
            
            const extractTag = (tag) => {
                const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))<\\/${tag}>`, 'i');
                const m = regex.exec(itemContent);
                return m ? (m[1] || m[2]).trim() : '';
            };

            const title = extractTag('title');
            const link = extractTag('link');
            const description = extractTag('description');
            const pubDate = extractTag('pubDate');

            let date = null;
            if (pubDate) {
                try {
                    date = new Date(pubDate).toISOString();
                } catch (e) {
                    // ignore invalid date
                }
            }

            if (title && link) {
                items.push({ title, link, description, date });
            }
        }
        return items;
    },

    transform(rawData, sourceType) {
        return rawData.items || [];
    }
};

export default CarrierDataSource;

import { getRandomUserAgent, isDateWithinLastDays, stripHtml, formatDateToChineseWithTime, escapeHtml } from '../helpers.js';

const AiyuanshengDataSource = {
    fetch: async (env) => {
        const rssUrl = env.AI_SUANLIJIAGOU_RSS_URL;
        const filterDays = parseInt(env.FOLO_FILTER_DAYS || '3', 10);
        const allAiyuanshengItems = [];

        if (!rssUrl) {
            console.error('AI_SUANLIJIAGOU_RSS_URL is not set in environment variables.');
            return {
                version: "https://jsonfeed.org/version/1.1",
                title: "Aiyuansheng.AI Daily Feeds",
                home_page_url: "https://www.jintiankansha.me/column/VDmgc0Hjrq",
                description: "Aggregated Aiyuansheng.AI Daily feeds",
                language: "zh-cn",
                items: []
            };
        }

        try {
            console.log('Fetching Aiyuansheng.AI RSS data...');
            const userAgent = getRandomUserAgent();
            const response = await fetch(rssUrl, {
                headers: {
                    'User-Agent': userAgent,
                    'Accept': 'application/rss+xml, application/xml, text/xml, */*'
                }
            });

            if (!response.ok) {
                console.error(`Failed to fetch Aiyuansheng.AI RSS: ${response.statusText}`);
                return {
                    version: "https://jsonfeed.org/version/1.1",
                    title: "Aiyuansheng.AI Daily Feeds",
                    home_page_url: "https://www.jintiankansha.me/column/VDmgc0Hjrq",
                    description: "Aggregated Aiyuansheng.AI Daily feeds",
                    language: "zh-cn",
                    items: []
                };
            }

            const xmlText = await response.text();
            
            // 使用正则表达式解析 RSS（Cloudflare Workers 不支持 DOMParser）
            const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
            const itemMatches = xmlText.matchAll(itemRegex);

            for (const match of itemMatches) {
                const itemXml = match[1];
                
                // 提取各个字段
                const extractCDATA = (xml, tag) => {
                    const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
                    if (cdataMatch) return cdataMatch[1];
                    const normalMatch = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
                    return normalMatch ? normalMatch[1] : '';
                };

                const title = extractCDATA(itemXml, 'title').trim();
                const link = extractCDATA(itemXml, 'link').trim();
                const pubDate = extractCDATA(itemXml, 'pubDate').trim();
                const description = extractCDATA(itemXml, 'description');
                const guid = extractCDATA(itemXml, 'guid') || link;
                
                // 尝试提取 content:encoded，如果没有则使用 description
                const contentEncoded = extractCDATA(itemXml, 'content:encoded');
                const content = contentEncoded || description;
                
                // 提取作者（支持多种格式）
                let author = extractCDATA(itemXml, 'author') || 
                            extractCDATA(itemXml, 'dc:creator') || 
                            extractCDATA(itemXml, 'creator') || 
                            'AI云原生智能算力架构';

                // 转换日期为 ISO 格式
                let isoDate = '';
                if (pubDate) {
                    try {
                        isoDate = new Date(pubDate).toISOString();
                    } catch (e) {
                        console.warn('Failed to parse date:', pubDate);
                        isoDate = new Date().toISOString();
                    }
                }

                // 日期过滤
                if (isoDate && isDateWithinLastDays(isoDate, filterDays)) {
                    allAiyuanshengItems.push({
                        id: guid,
                        url: link,
                        title: title,
                        content_html: content,
                        date_published: isoDate,
                        authors: [{ name: author }],
                        source: 'AI云原生智能算力架构',
                    });
                }
            }

            console.log(`Fetched ${allAiyuanshengItems.length} items from Aiyuansheng.AI RSS`);
        } catch (error) {
            console.error('Error fetching Aiyuansheng.AI RSS:', error);
        }

        return {
            version: "https://jsonfeed.org/version/1.1",
            title: "Aiyuansheng.AI Daily Feeds",
            home_page_url: "https://www.jintiankansha.me/column/VDmgc0Hjrq",
            description: "Aggregated Aiyuansheng.AI Daily feeds",
            language: "zh-cn",
            items: allAiyuanshengItems
        };
    },
    transform: (rawData, sourceType) => {
        const unifiedNews = [];
        if (rawData && Array.isArray(rawData.items)) {
            rawData.items.forEach((item) => {
                unifiedNews.push({
                    id: item.id,
                    type: sourceType,
                    url: item.url,
                    title: item.title,
                    description: stripHtml(item.content_html || ""),
                    published_date: item.date_published,
                    authors: item.authors ? item.authors.map(a => a.name).join(', ') : 'Unknown',
                    source: item.source || 'AI云原生智能算力架构',
                    details: {
                        content_html: item.content_html || ""
                    }
                });
            });
        }
        return unifiedNews;
    },

    generateHtml: (item) => {
        return `
            <strong>${escapeHtml(item.title)}</strong><br>
            <small>来源: ${escapeHtml(item.source || '未知')} | 发布日期: ${formatDateToChineseWithTime(item.published_date)}</small>
            <div class="content-html">${item.details.content_html || '无内容。'}</div>
            <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">阅读更多</a>
        `;
    }
};

export default AiyuanshengDataSource;

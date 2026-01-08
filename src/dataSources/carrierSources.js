import { getRandomUserAgent, sleep, stripHtml, isDateWithinLastDays, isRelevantToCarrierNetworkAI } from '../helpers';

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
                    
                    // Apply Carrier-Grade Filter
                    // Check title and content/description
                    return isRelevantToCarrierNetworkAI(item.title, item.content || item.description);
                }).map(item => ({
                    ...item,
                    source_name: feed.name,
                    category: feed.category
                }));

                allItems.push(...validItems);
                
                await sleep(1000); // Be polite
            } catch (error) {
                console.error(`Error fetching ${feed.name}:`, error);
            }
        }

        return {
            items: allItems
        };
    },

    // Simple Regex-based RSS Parser
    parseRSS(xml) {
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(xml)) !== null) {
            const itemContent = match[1];
            
            const titleMatch = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/.exec(itemContent);
            const linkMatch = /<link>(.*?)<\/link>/.exec(itemContent);
            const descMatch = /<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/.exec(itemContent);
            const pubDateMatch = /<pubDate>(.*?)<\/pubDate>/.exec(itemContent);

            if (titleMatch && linkMatch) {
                items.push({
                    title: titleMatch[1],
                    url: linkMatch[1],
                    description: descMatch ? descMatch[1] : '',
                    date: pubDateMatch ? new Date(pubDateMatch[1]) : new Date(),
                    content: descMatch ? descMatch[1] : '' // RSS usually puts summary in description
                });
            }
        }
        return items;
    },

    transform(rawData, sourceType) {
        if (!rawData || !rawData.items) return [];

        return rawData.items.map(item => ({
            id: item.url, // Use URL as ID
            type: sourceType,
            url: item.url,
            title: stripHtml(item.title),
            description: stripHtml(item.description || ""),
            published_date: item.date.toISOString(),
            authors: item.source_name, // Use source name as author for now
            source: item.source_name,
            tags: [item.category],
            details: {
                content_html: item.content
            }
        }));
    }
};

export default CarrierDataSource;

// src/handlers/writeData.js
import { getISODate, getFetchDate, stripHtml, removeMarkdownCodeBlock } from '../helpers.js';
import { fetchAllData, fetchDataByCategory, dataSources } from '../dataFetchers.js'; // 导入 fetchDataByCategory 和 dataSources
import { storeInKV } from '../kv.js';
import { callChatAPIStream } from '../chatapi.js';
import { getSystemPromptMindmapTagging, getUserPromptMindmapTagging } from '../prompt/mindmapTaggingPrompt.js';

const isMindmapTaggingEnabled = (env) => String(env.ENABLE_MINDMAP_TAGGING ?? '').toLowerCase() === 'true';

const toPositiveInt = (v, fallback) => {
    const n = Number.parseInt(String(v ?? ''), 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
};

const toNonNegativeInt = (v, fallback) => {
    const n = Number.parseInt(String(v ?? ''), 10);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const allowedBoardIds = new Set([
    '0', '0.1', '0.2', '0.3',
    '1', '1.1', '1.2', '1.3', '1.4', '1.5',
    '2', '2.1', '2.2', '2.3', '2.4', '2.5',
    '3', '3.1', '3.2', '3.3', '3.4', '3.5', '3.6'
]);

const normalizeBoardId = (id) => {
    const s = String(id ?? '').trim();
    if (!s) return null;
    if (!allowedBoardIds.has(s)) return null;
    return s;
};

const normalizeSourceDimension = (v) => {
    const s = String(v ?? '').trim();
    if (s === '学' || s === '产' || s === '学/产') return s;
    return null;
};

const buildTaggingContent = (item) => {
    const title = item?.title ? `标题：${item.title}` : '';
    const desc = item?.description ? `描述：${item.description}` : '';
    const contentHtml = item?.details?.content_html ? stripHtml(item.details.content_html) : '';
    const content = contentHtml ? `内容：${contentHtml}` : '';
    const parts = [title, desc, content].filter(Boolean);
    return parts.join('\n').slice(0, 2400);
};

const tagItemsByMindmap = async (env, items, category) => {
    if (!isMindmapTaggingEnabled(env)) return items;
    if (!Array.isArray(items) || items.length === 0) return items;

    const batchSize = toPositiveInt(env.MINDMAP_TAGGING_BATCH_SIZE, 8);
    const maxItemsPerCategory = toNonNegativeInt(env.MINDMAP_TAGGING_MAX_ITEMS_PER_CATEGORY, 40);
    const tagTargetItems = maxItemsPerCategory === 0 ? items : items.slice(0, maxItemsPerCategory);

    const systemPrompt = getSystemPromptMindmapTagging();
    const tagMap = new Map();

    const payloadItems = tagTargetItems.map((it) => ({
        id: String(it?.id ?? ''),
        type: it?.type ?? category ?? '',
        title: it?.title ?? '',
        url: it?.url ?? '',
        published_date: it?.published_date ?? '',
        source: it?.source ?? '',
        content: buildTaggingContent(it)
    })).filter((it) => it.id);

    if (payloadItems.length === 0) return items;

    for (let i = 0; i < payloadItems.length; i += batchSize) {
        const batch = payloadItems.slice(i, i + batchSize);
        const userPrompt = getUserPromptMindmapTagging(batch);

        let aiText = '';
        try {
            const chunks = [];
            for await (const chunk of callChatAPIStream(env, userPrompt, systemPrompt)) {
                chunks.push(chunk);
            }
            aiText = removeMarkdownCodeBlock(chunks.join(''));
        } catch (error) {
            console.error(`Mindmap tagging failed for category=${category} batchStart=${i}:`, error);
            continue;
        }

        let data;
        try {
            data = JSON.parse(aiText);
        } catch (error) {
            console.error(`Mindmap tagging JSON parse failed for category=${category} batchStart=${i}:`, error, aiText);
            continue;
        }

        const outItems = Array.isArray(data?.items) ? data.items : [];
        for (const out of outItems) {
            const id = String(out?.id ?? '').trim();
            if (!id) continue;

            const primary = normalizeBoardId(out?.primary_board_id);
            if (!primary) continue;

            const secondaryRaw = Array.isArray(out?.secondary_board_ids) ? out.secondary_board_ids : [];
            const secondary = secondaryRaw.map(normalizeBoardId).filter(Boolean).slice(0, 2);
            const sourceDimension = normalizeSourceDimension(out?.source_dimension) ?? '学/产';
            const confidenceNum = Number(out?.confidence);
            const confidence = Number.isFinite(confidenceNum) ? Math.max(0, Math.min(1, confidenceNum)) : 0.5;
            const reasons = String(out?.reasons ?? '').trim().slice(0, 300);

            tagMap.set(id, {
                primary_board_id: primary,
                secondary_board_ids: secondary,
                source_dimension: sourceDimension,
                confidence,
                reasons
            });
        }
    }

    if (tagMap.size === 0) return items;

    return items.map((it) => {
        const id = String(it?.id ?? '').trim();
        if (!id) return it;
        const tag = tagMap.get(id);
        if (!tag) return it;
        return { ...it, mindmap_tags: tag };
    });
};

export async function handleWriteData(request, env) {
    const dateParam = getFetchDate();
    const dateStr = dateParam ? dateParam : getISODate();
    console.log(`Starting /writeData process for date: ${dateStr}`);
    let category = null;
    let foloCookie = null;
    
    try {
        // 尝试解析请求体，获取 category 参数
        if (request.headers.get('Content-Type')?.includes('application/json')) {
            const requestBody = await request.json();
            category = requestBody.category;
            foloCookie = requestBody.foloCookie; // 获取 foloCookie
        }

        console.log(`Starting /writeData process for category: ${category || 'all'} with foloCookie presence: ${!!foloCookie}`);

        let dataToStore = {};
        let fetchPromises = [];
        let successMessage = '';

        if (category) {
            // 只抓取指定分类的数据
            const fetchedData = await fetchDataByCategory(env, category, foloCookie); // 传递 foloCookie
            const taggedData = await tagItemsByMindmap(env, fetchedData, category);
            dataToStore[category] = taggedData;
            fetchPromises.push(storeInKV(env.DATA_KV, `${dateStr}-${category}`, taggedData));
            successMessage = `Data for category '${category}' fetched and stored.`;
            console.log(`Transformed ${category}: ${taggedData.length} items.`);
        } else {
            // 抓取所有分类的数据 (现有逻辑)
            const allUnifiedData = await fetchAllData(env, foloCookie); // 传递 foloCookie
            
            for (const sourceType in dataSources) {
                if (Object.hasOwnProperty.call(dataSources, sourceType)) {
                    const rawItems = allUnifiedData[sourceType] || [];
                    const taggedItems = await tagItemsByMindmap(env, rawItems, sourceType);
                    dataToStore[sourceType] = taggedItems;
                    fetchPromises.push(storeInKV(env.DATA_KV, `${dateStr}-${sourceType}`, taggedItems));
                    console.log(`Transformed ${sourceType}: ${taggedItems.length} items.`);
                }
            }
            successMessage = `All data categories fetched and stored.`;
        }

        await Promise.all(fetchPromises);

        const errors = []; // Placeholder for potential future error aggregation from fetchAllData or fetchDataByCategory

        if (errors.length > 0) {
            console.warn("/writeData completed with errors:", errors);
            return new Response(JSON.stringify({ 
                success: false, 
                message: `${successMessage} Some errors occurred.`, 
                errors: errors, 
                ...Object.fromEntries(Object.entries(dataToStore).map(([key, value]) => [`${key}ItemCount`, value.length]))
            }), {
                status: 200, headers: { 'Content-Type': 'application/json' }
            });
        } else {
            console.log("/writeData process completed successfully.");
            return new Response(JSON.stringify({ 
                success: true, 
                message: successMessage,
                ...Object.fromEntries(Object.entries(dataToStore).map(([key, value]) => [`${key}ItemCount`, value.length]))
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        console.error("Unhandled error in /writeData:", error);
        return new Response(JSON.stringify({ success: false, message: "An unhandled error occurred during data processing.", error: error.message, details: error.stack }), {
            status: 500, headers: { 'Content-Type': 'application/json' }
        });
    }
}

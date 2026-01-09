// src/handlers/writeData.js
import { getISODate, getFetchDate } from '../helpers.js';
import { fetchAllData, fetchDataByCategory, dataSources } from '../dataFetchers.js'; // 导入 fetchDataByCategory 和 dataSources
import { storeInKV } from '../kv.js';
import { callAIModel } from '../chatapi.js';
import { getSystemPromptMindmapTagging, getUserPromptMindmapTagging } from '../prompt/mindmapTaggingPrompt.js';

async function tagItemsWithMindmap(env, items) {
    if (!items || items.length === 0) return items;

    const batchSize = parseInt(env.MINDMAP_TAGGING_BATCH_SIZE || "8", 10);
    const maxItems = parseInt(env.MINDMAP_TAGGING_MAX_ITEMS_PER_CATEGORY || "40", 10);
    const processedItems = items.slice(0, maxItems);
    const taggedItems = [];

    for (let i = 0; i < processedItems.length; i += batchSize) {
        const batch = processedItems.slice(i, i + batchSize);
        console.log(`Tagging batch ${i / batchSize + 1}/${Math.ceil(processedItems.length / batchSize)}...`);

        try {
            const systemPrompt = getSystemPromptMindmapTagging();
            const userPrompt = getUserPromptMindmapTagging(batch);
            
            // 使用 callAIModel (复用 chatapi.js 逻辑)
            // 注意：callAIModel 内部期望的是 messages 数组
            const messages = [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ];

            const responseText = await callAIModel(env, messages); // 确保 callAIModel 支持 env 传入
            
            // 解析 JSON
            let aiResponse = null;
            try {
                // 尝试清理 markdown 代码块标记
                const jsonStr = responseText.replace(/```json\n?|\n?```/g, "").trim();
                aiResponse = JSON.parse(jsonStr);
            } catch (e) {
                console.warn("Failed to parse AI tagging response:", e);
                // Fallback: don't tag this batch
            }

            if (aiResponse && Array.isArray(aiResponse.items)) {
                // Merge tags back to items
                const tagsMap = new Map(aiResponse.items.map(it => [String(it.id), it]));
                
                batch.forEach(originalItem => {
                    const tagInfo = tagsMap.get(String(originalItem.id));
                    if (tagInfo) {
                        taggedItems.push({
                            ...originalItem,
                            mindmap_tags: {
                                primary_board_id: tagInfo.primary_board_id,
                                secondary_board_ids: tagInfo.secondary_board_ids,
                                source_dimension: tagInfo.source_dimension,
                                confidence: tagInfo.confidence,
                                reasons: tagInfo.reasons
                            }
                        });
                    } else {
                        taggedItems.push(originalItem); // Keep original if no tag found
                    }
                });
            } else {
                taggedItems.push(...batch); // Keep original if AI failed
            }

        } catch (error) {
            console.error("Error during batch tagging:", error);
            taggedItems.push(...batch); // Keep original on error
        }
    }
    
    // Add remaining items without tags if any
    if (items.length > maxItems) {
        taggedItems.push(...items.slice(maxItems));
    }

    return taggedItems;
}

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
            let fetchedData = await fetchDataByCategory(env, category, foloCookie); // 传递 foloCookie
            
            // Mindmap Tagging Integration
            if (env.ENABLE_MINDMAP_TAGGING === "true") {
                fetchedData = await tagItemsWithMindmap(env, fetchedData);
            }

            dataToStore[category] = fetchedData;
            fetchPromises.push(storeInKV(env.DATA_KV, `${dateStr}-${category}`, fetchedData));
            successMessage = `Data for category '${category}' fetched and stored.`;
            console.log(`Transformed ${category}: ${fetchedData.length} items.`);
        } else {
            // 抓取所有分类的数据 (现有逻辑)
            const allUnifiedData = await fetchAllData(env, foloCookie); // 传递 foloCookie
            
            for (const sourceType in dataSources) {
                if (Object.hasOwnProperty.call(dataSources, sourceType)) {
                    let items = allUnifiedData[sourceType] || [];
                    
                    // Mindmap Tagging Integration
                    if (env.ENABLE_MINDMAP_TAGGING === "true") {
                        items = await tagItemsWithMindmap(env, items);
                    }

                    dataToStore[sourceType] = items;
                    fetchPromises.push(storeInKV(env.DATA_KV, `${dateStr}-${sourceType}`, dataToStore[sourceType]));
                    console.log(`Transformed ${sourceType}: ${dataToStore[sourceType].length} items.`);
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

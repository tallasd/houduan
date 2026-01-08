// src/htmlGenerators.js
import { escapeHtml, formatDateToChinese, convertEnglishQuotesToChinese, replaceImageProxy} from './helpers.js';
import { dataSources } from './dataFetchers.js'; // Import dataSources
import { marked } from './marked.esm.js';

function generateHtmlListForContentPage(items, dateStr) {
    let listHtml = '';

    if (!Array.isArray(items) || items.length === 0) {
        listHtml += `<p>此日期无可用数据。抓取/筛选过程可能没有为此日期生成任何结果。</p>`;
        return listHtml;
    }

    listHtml += '<ul class="item-list">';
    items.forEach((item, index) => {
        let displayContent = '';
        let itemId = item.id;

        // Use the generateHtml method from the corresponding data source
        const dataSourceConfig = dataSources[item.type];
        // console.log("item.type:", item.type);
        // console.log("dataSourceConfig:", dataSourceConfig);
        if (dataSourceConfig && dataSourceConfig.sources && dataSourceConfig.sources.length > 0 && dataSourceConfig.sources[0].generateHtml) {
            displayContent = dataSourceConfig.sources[0].generateHtml(item);
        } else {
            // Fallback for unknown types or if generateHtml is not defined
            displayContent = `<strong>未知项目类型: ${escapeHtml(item.type)}</strong><br>${escapeHtml(item.title || item.description || JSON.stringify(item))}`;
        }

        listHtml += `<li class="item-card">
            <label>
                <input type="checkbox" name="selectedItems" value="${item.type}:${itemId}" class="item-checkbox">
                <div class="item-content">${displayContent}</div>
            </label>
        </li>`;
    });
    listHtml += '</ul>';
    return listHtml;
}

export function generateContentSelectionPageHtml(env, dateStr, allData, dataCategories) {
    // Ensure allData is an object and dataCategories is an array
    const data = allData || {};
    const categories = Array.isArray(dataCategories) ? dataCategories : [];

    // Generate tab buttons and content dynamically
    const tabButtonsHtml = categories.map((category, index) => `
        <div class="tab-buttons-wrapper">
            <button type="button" class="tab-button ${index === 0 ? 'active' : ''}" onclick="openTab(event, '${category.id}-tab')" ondblclick="confirmFetchCategoryData(this,'${category.id}')">${escapeHtml(category.name)}</button>
        </div>
    `).join('');

    const tabContentsHtml = categories.map((category, index) => `
        <div id="${category.id}-tab" class="tab-content ${index === 0 ? 'active' : ''}">
            ${generateHtmlListForContentPage(data[category.id], dateStr)}
        </div>
    `).join('');

    return `
        <!DOCTYPE html>
        <html lang="zh-Hans">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${formatDateToChinese(escapeHtml(dateStr))} ${env.FOLO_FILTER_DAYS}天内的数据</title>
            <style>
                :root { --primary-color: #007bff; --light-gray: #f8f9fa; --medium-gray: #e9ecef; --dark-gray: #343a40; --line-height-normal: 1.4; --font-size-small: 0.9rem;}
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; background-color: var(--light-gray); color: var(--dark-gray); padding: 1rem; }
                .container { max-width: 1200px; margin: 0 auto; background-color: #fff; padding: 1rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
                h1 { font-size: 1.8rem; color: var(--dark-gray); margin-bottom: 0.5rem; }
                .submit-button { background-color: var(--primary-color); color: white; border: none; padding: 0.6rem 1.2rem; font-size: 0.9rem; border-radius: 5px; cursor: pointer; transition: background-color 0.2s; white-space: nowrap; }
                .submit-button:hover { background-color: #0056b3; }
                .tab-navigation { display: flex; flex-wrap: wrap; margin-bottom: 1rem; border-bottom: 1px solid var(--medium-gray); }
                .tab-buttons-wrapper { display: flex; align-items: center; margin-right: 1rem; margin-bottom: 0.5rem; }
                .tab-button { background-color: transparent; border: none; border-bottom: 3px solid transparent; padding: 0.8rem 1rem; cursor: pointer; font-size: 1rem; color: #555; transition: color 0.2s, border-color 0.2s; }
                .tab-button.active { color: var(--primary-color); border-bottom-color: var(--primary-color); font-weight: 600; }
                .tab-button:hover { color: var(--primary-color); }
                .tab-content { display: none; animation: fadeIn 0.5s; }
                .tab-content.active { display: block; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .item-list { list-style-type: none; counter-reset: item-counter; padding-left: 0; }
                .item-card { margin-bottom: 1rem; padding: 1rem; padding-left: 3em; border: 1px solid var(--medium-gray); border-radius: 6px; background-color: #fff; position: relative; counter-increment: item-counter; }
                .item-card::before { content: counter(item-counter) "."; position: absolute; left: 0.8em; top: 1rem; font-weight: 600; color: var(--dark-gray); min-width: 1.5em; text-align: right; }
                .item-card label { display: flex; align-items: flex-start; cursor: pointer; }
                .item-checkbox { margin-right: 0.8rem; margin-top: 0.2rem; transform: scale(1.2); flex-shrink: 0; }
                .item-content { flex-grow: 1; min-width: 0; }
                .item-content strong { font-size: 1.1rem; }
                .item-content small { color: #6c757d; display: block; margin: 0.2rem 0; }
                .content-html { border: 1px dashed #ccc; padding: 0.5rem; margin-top: 0.5rem; background: #fdfdfd; font-size: var(--font-size-small); line-height: var(--line-height-normal); max-width: 100%; overflow-wrap: break-word; word-break: break-word; overflow-y: hidden; transition: max-height 0.35s ease-in-out; position: relative; }
                .content-html.is-collapsed { max-height: calc(var(--font-size-small) * var(--line-height-normal) * 6 + 1rem); }
                .content-html.is-expanded { max-height: 3000px; overflow-y: auto; }
                .read-more-btn { display: block; margin-top: 0.5rem; padding: 0.3rem 0.6rem; font-size: 0.85rem; color: var(--primary-color); background-color: transparent; border: 1px solid var(--primary-color); border-radius: 4px; cursor: pointer; text-align: center; width: fit-content; }
                .read-more-btn:hover { background-color: #eef; }
                .item-content a { color: var(--primary-color); text-decoration: none; }
                .item-content a:hover { text-decoration: underline; }
                .error { color: #dc3545; font-weight: bold; background-color: #f8d7da; padding: 0.5rem; border-radius: 4px; border: 1px solid #f5c6cb;}
                hr { border: 0; border-top: 1px solid var(--medium-gray); margin: 0.5rem 0; }
                @media (max-width: 768px) {
                    body { padding: 0.5rem; } .container { padding: 0.8rem; } h1 { font-size: 1.5rem; }
                    .header-bar { flex-direction: column; align-items: flex-start; }
                    .submit-button { margin-top: 0.5rem; width: 100%; }
                    .tab-button { padding: 0.7rem 0.5rem; font-size: 0.9rem; flex-grow: 1; text-align: center; }
                    .item-card { padding-left: 2.5em; } .item-card::before { left: 0.5em; top: 0.8rem; }
                }
            </style>
        </head>
        <body>
            <div class="container">
                <form action="/genAIContent" method="POST">
                    <input type="hidden" name="date" value="${escapeHtml(dateStr)}">
                    <div class="header-bar">
                        <button type="button" class="submit-button" onclick="confirmFetchAndWriteData(this)">抓取并写入今日数据</button>
                        <h1>${formatDateToChinese(escapeHtml(dateStr))} ${env.FOLO_FILTER_DAYS}天内的数据</h1>
                        <div style="display: flex; gap: 1rem;">
                            <button type="submit" class="submit-button" onclick="return confirmGenerateAIContent(event)">从选中内容生成 AI 日报</button>
                            <button type="submit" class="submit-button" onclick="return confirmGenerateAIContent(event, '确定要生成网络智能化决策日报吗？此操作将调用 AI 模型生成内容。')">生成网络智能化决策日报</button>
                        </div>
                    </div>
                    <div class="cookie-setting-area" style="margin-bottom: 1rem; padding: 0.8rem; border: 1px solid var(--medium-gray); border-radius: 6px; background-color: #fefefe;">
                        <label for="foloCookie" style="font-weight: bold; margin-right: 0.5rem;">Folo Cookie:</label>
                        <input type="text" id="foloCookie" placeholder="在此输入 Folo Cookie" style="flex-grow: 1; padding: 0.4rem; border: 1px solid #ccc; border-radius: 4px; width: 300px; max-width: 70%;">
                        <button type="button" class="submit-button" onclick="saveFoloCookie(this)" style="margin-left: 0.5rem; padding: 0.4rem 0.8rem; font-size: 0.85rem;">保存 Cookie</button>
                        <p style="font-size: 0.8rem; color: #666; margin-top: 0.5rem;">此 Cookie 将保存在您的浏览器本地存储中，以便下次使用。</p>
                    </div>
                    <div class="tab-navigation">
                        ${tabButtonsHtml}
                    </div>
                    ${tabContentsHtml}
                </form>
            </div>
            <script>
                function openTab(evt, tabName) {
                    var i, tabcontent, tablinks;
                    tabcontent = document.getElementsByClassName("tab-content");
                    for (i = 0; i < tabcontent.length; i++) { tabcontent[i].style.display = "none"; tabcontent[i].classList.remove("active"); }
                    tablinks = document.getElementsByClassName("tab-button");
                    for (i = 0; i < tablinks.length; i++) { tablinks[i].classList.remove("active"); }
                    document.getElementById(tabName).style.display = "block"; document.getElementById(tabName).classList.add("active");
                    if (evt && evt.currentTarget) { evt.currentTarget.classList.add("active"); }
                }
                document.addEventListener('DOMContentLoaded', function() {
                    if (document.querySelector('.tab-button') && !document.querySelector('.tab-button.active')) { document.querySelector('.tab-button').click(); }
                    else if (document.querySelector('.tab-content.active') === null && document.querySelector('.tab-content')) {
                        const firstTabButton = document.querySelector('.tab-button'); const firstTabContent = document.querySelector('.tab-content');
                        if (firstTabButton) firstTabButton.classList.add('active');
                        if (firstTabContent) { firstTabContent.style.display = 'block'; firstTabContent.classList.add('active');}
                    }
                    document.querySelectorAll('.content-html').forEach(contentDiv => {
                        contentDiv.classList.add('is-collapsed');
                        requestAnimationFrame(() => {
                            const readMoreBtn = document.createElement('button'); readMoreBtn.type = 'button';
                            readMoreBtn.textContent = '展开'; readMoreBtn.className = 'read-more-btn';
                            contentDiv.insertAdjacentElement('afterend', readMoreBtn);
                            readMoreBtn.addEventListener('click', function() {
                                contentDiv.classList.toggle('is-expanded'); contentDiv.classList.toggle('is-collapsed', !contentDiv.classList.contains('is-expanded'));
                                this.textContent = contentDiv.classList.contains('is-expanded') ? '折叠' : '展开';
                            });
                        });
                    });
                });

                async function saveFoloCookie(button) {
                    const cookieInput = document.getElementById('foloCookie');
                    const cookieValue = cookieInput.value;

                    if (!cookieValue.trim()) {
                        alert('Folo Cookie 不能为空。');
                        return;
                    }

                    const originalButtonText = button.textContent;
                    button.textContent = '保存中...';
                    button.disabled = true;

                    try {
                        localStorage.setItem('${env.FOLO_COOKIE_KV_KEY}', cookieValue); // 直接保存到 localStorage
                        alert('Folo Cookie 已成功保存在本地存储！');
                    } catch (error) {
                        console.error('Error saving Folo Cookie to localStorage:', error);
                        alert(\`保存 Folo Cookie 到本地存储时发生错误: \${error.message}\`);
                    } finally {
                        button.textContent = originalButtonText;
                        button.disabled = false;
                    }
                }

                document.addEventListener('DOMContentLoaded', function() {
                    const savedCookie = localStorage.getItem('${env.FOLO_COOKIE_KV_KEY}');
                    if (savedCookie) {
                        document.getElementById('foloCookie').value = savedCookie;
                    }
                });

                function confirmFetchAndWriteData(button) {
                    if (confirm('确定要抓取并写入今日数据吗？此操作将更新今日数据。')) {
                        fetchAndWriteData(button);
                    }
                }

                async function fetchAndWriteData(button, category = null) {
                    const originalText = button.textContent;
                    button.textContent = '正在抓取和写入...';
                    button.disabled = true;

                    const foloCookie = localStorage.getItem('${env.FOLO_COOKIE_KV_KEY}'); // 从 localStorage 获取 foloCookie

                    try {
                        const response = await fetch('/writeData', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ category: category, foloCookie: foloCookie }), // 将 foloCookie 添加到请求体
                        });

                        if (response.ok) {
                            const result = await response.text();
                            alert('数据抓取和写入成功！' + result);
                            window.location.reload();
                        } else {
                            const errorText = await response.text();
                            alert('数据抓取和写入失败: ' + errorText);
                        }
                    } catch (error) {
                        console.error('Error fetching and writing data:', error);
                        alert('请求失败，请检查网络或服务器。');
                    } finally {
                        button.textContent = originalText;
                        button.disabled = false;
                    }
                }

                function confirmFetchCategoryData(button, category) {
                    if (confirm(\`确定要抓取并写入 \${category} 分类的数据吗？此操作将更新 \${category} 数据。\`)) {
                        fetchAndWriteData(button, category);
                    }
                }

                function confirmGenerateAIContent(event, message) {
                    const selectedCheckboxes = document.querySelectorAll('input[name="selectedItems"]:checked');
                    if (selectedCheckboxes.length === 0) {
                        alert('请至少选择一个内容条目。');
                        event.preventDefault(); // Prevent form submission
                        return false;
                    }
                    const button = event.currentTarget; // 获取触发事件的按钮
                    const confirmMessage = message || '确定要从选中内容生成 AI 日报吗？此操作将调用 AI 模型生成内容。';
                    if (confirm(confirmMessage)) {
                        button.innerText = '生成中...'; // 更改按钮文案
                        //button.disabled = true; // 禁用按钮，防止重复提交
                        return true; // Allow form submission
                    } else {
                        event.preventDefault(); // Prevent form submission
                        return false;
                    }
                }

            </script>
        </body>
        </html>
    `;
}


export function generateBestBlogsPageHtml(env, dateStr, aiData) {
    const { executive_insight, sidebar_stats, sidebar_tags, news_cards } = aiData;

    const statsHtml = sidebar_stats.map(stat => `
        <div class="stat-item">
            <span>${escapeHtml(stat.label)}</span>
            <span class="stat-val" ${stat.label.includes('Risk') ? 'style="color: #e74c3c;"' : ''}>${escapeHtml(stat.value)}</span>
        </div>
    `).join('');

    const tagsHtml = sidebar_tags.map(tag => `
        <span class="tag">${escapeHtml(tag)}</span>
    `).join('');

    const newsCardsHtml = news_cards.map(card => {
        let typeClass = '';
        let tagClass = '';
        let typeLabel = '';

        if (card.type === 'strategy') { typeClass = 'card-type-strategy'; tagClass = 'tag-strategy'; typeLabel = '战略机会'; }
        else if (card.type === 'tech') { typeClass = 'card-type-tech'; tagClass = 'tag-tech'; typeLabel = '技术突破'; }
        else if (card.type === 'risk') { typeClass = 'card-type-risk'; tagClass = 'tag-risk'; typeLabel = '风险预警'; }
        else { typeClass = 'card-type-strategy'; tagClass = 'tag-strategy'; typeLabel = '其他'; }

        return `
        <div class="news-card ${typeClass}">
            <div class="card-header">
                <span class="card-tag ${tagClass}">${escapeHtml(typeLabel)}</span>
                <span style="color: #999; font-size: 0.8em;">来源: ${escapeHtml(card.source)}</span>
            </div>
            <div class="card-title">${escapeHtml(card.title)}</div>
            <div class="card-body">
                ${escapeHtml(card.body)}
            </div>
            <div class="ai-insight">
                <i class="fas fa-robot ai-icon"></i>
                <strong>创新院落地建议：</strong> ${escapeHtml(card.ai_insight)}
            </div>
        </div>
        `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>网络智能化决策日报 - ${escapeHtml(dateStr)}</title>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        :root {
            --cmcc-blue: #007aff;
            --cmcc-dark: #0056b3;
            --bg-light: #f5f7fa;
            --card-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
            background-color: #fff;
        }
        .mockup-window {
            background-color: #f0f2f5;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.15);
            overflow: hidden;
            font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif;
            border: 1px solid #dcdfe6;
        }
        .mockup-header {
            background: linear-gradient(135deg, #0056b3 0%, #007aff 100%);
            color: white;
            padding: 15px 25px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .mockup-logo {
            font-size: 1.2em;
            font-weight: bold;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .mockup-user {
            font-size: 0.9em;
            opacity: 0.9;
        }
        .mockup-body {
            padding: 25px;
            display: grid;
            grid-template-columns: 300px 1fr;
            gap: 25px;
        }
        
        /* 左侧边栏 */
        .sidebar-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: var(--card-shadow);
        }
        .sidebar-title {
            font-size: 1em;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 15px;
            border-bottom: 1px solid #eee;
            padding-bottom: 8px;
        }
        .stat-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 12px;
            font-size: 0.9em;
        }
        .stat-val {
            font-weight: bold;
            color: var(--cmcc-blue);
        }
        .tag-cloud {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .tag {
            background: #e6f1fc;
            color: var(--cmcc-blue);
            padding: 4px 10px;
            border-radius: 20px;
            font-size: 0.85em;
        }

        /* 主要内容区 */
        .main-content {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        
        .daily-summary {
            background: #fff9db; /* 淡黄色背景，强调摘要 */
            border-left: 5px solid #f1c40f;
            padding: 20px;
            border-radius: 4px;
            margin-bottom: 10px;
        }
        .daily-summary h3 {
            margin: 0 0 10px 0;
            color: #d35400;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .news-card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: var(--card-shadow);
            border-left: 4px solid transparent;
            transition: transform 0.2s;
        }
        .news-card:hover {
            transform: translateY(-2px);
        }
        .card-type-strategy { border-left-color: #007aff; } /* 战略机会 */
        .card-type-risk { border-left-color: #e74c3c; } /* 风险预警 */
        .card-type-tech { border-left-color: #27ae60; } /* 技术突破 */

        .card-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        .card-tag {
            font-size: 0.8em;
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: bold;
        }
        .tag-strategy { background: #e6f1fc; color: #007aff; }
        .tag-risk { background: #fdeaea; color: #e74c3c; }
        .tag-tech { background: #e8f5e9; color: #27ae60; }

        .card-title {
            font-size: 1.1em;
            font-weight: bold;
            margin-bottom: 10px;
            color: #2c3e50;
        }
        .card-body {
            font-size: 0.95em;
            color: #555;
            margin-bottom: 15px;
        }
        .ai-insight {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 6px;
            font-size: 0.9em;
            border: 1px dashed #ccc;
        }
        .ai-insight strong {
            color: var(--cmcc-dark);
        }
        .ai-icon {
            color: #9b59b6;
            margin-right: 5px;
        }
    </style>
</head>
<body>

    <div class="mockup-window">
        <!-- 仿真头部 -->
        <div class="mockup-header">
            <div class="mockup-logo">
                <i class="fas fa-network-wired"></i>
                浙江移动创新研究院 | 网络智能化决策日报
            </div>
            <div class="mockup-user">
                <i class="far fa-calendar-alt"></i> ${escapeHtml(formatDateToChinese(dateStr))}
            </div>
        </div>

        <div class="mockup-body">
            <!-- 左侧边栏 -->
            <div class="mockup-sidebar">
                <div class="sidebar-card">
                    <div class="sidebar-title">📊 创新态势仪表盘</div>
                    ${statsHtml}
                </div>

                <div class="sidebar-card">
                    <div class="sidebar-title">🏷️ 重点关注领域</div>
                    <div class="tag-cloud">
                        ${tagsHtml}
                    </div>
                </div>
            </div>

            <!-- 右侧主要内容 -->
            <div class="main-content">
                
                <!-- 核心决策摘要 -->
                <div class="daily-summary">
                    <h3><i class="fas fa-lightbulb"></i> 决策参考摘要 (Executive Insight)</h3>
                    <p><strong>今日研判：</strong> ${escapeHtml(executive_insight)}</p>
                </div>

                ${newsCardsHtml}

            </div>
        </div>
    </div>

</body>
</html>
    `;
}

function generatePromptSectionHtmlForGenAI(systemPrompt, userPrompt, promptTitle, promptIdSuffix) {
    if (!systemPrompt && !userPrompt) return '';
    let fullPromptTextForCopy = "";
    if (systemPrompt) fullPromptTextForCopy += `系统指令:\n${systemPrompt}\n\n`;
    if (userPrompt) fullPromptTextForCopy += `用户输入:\n${userPrompt}`;
    fullPromptTextForCopy = fullPromptTextForCopy.trim();

    return `
        <div style="margin-top: 1rem; border: 1px solid #ddd; padding: 0.8rem; border-radius: 4px; background-color: #f9f9f9;">
            <h3 style="font-size: 1.1rem; margin-bottom: 0.5rem; color: #333;">${escapeHtml(promptTitle)}</h3>
            <button type="button" class="button-link toggle-prompt-btn" onclick="togglePromptVisibility('promptDetails_${promptIdSuffix}', this)">显示提示详情</button>
            <button type="button" class="button-link copy-prompt-btn" onclick="copyToClipboard(this.dataset.fullPrompt, this)" data-full-prompt="${escapeHtml(fullPromptTextForCopy)}">复制完整提示</button>
            <div id="promptDetails_${promptIdSuffix}" class="content-box" style="display: none; margin-top: 0.5rem; background-color: #e9ecef; border-color: #ced4da; max-height: 400px; overflow-y: auto; text-align: left;">
                ${systemPrompt ? `<strong>系统指令:</strong><pre style="white-space: pre-wrap; word-wrap: break-word; font-size: 0.85rem; margin-top:0.2em; margin-bottom:0.8em; padding: 0.5em; background: #fff; border: 1px solid #ccc; border-radius: 3px;">${escapeHtml(systemPrompt)}</pre>` : '<p><em>本次调用无系统指令。</em></p>'}
                ${userPrompt ? `<strong>用户输入:</strong><pre style="white-space: pre-wrap; word-wrap: break-word; font-size: 0.85rem; margin-top:0.2em; padding: 0.5em; background: #fff; border: 1px solid #ccc; border-radius: 3px;">${escapeHtml(userPrompt)}</pre>` : '<p><em>本次调用无用户输入。</em></p>'}
            </div>
        </div>`;
}


export function generateGenAiPageHtml(env, title, bodyContent, pageDate, isErrorPage = false, selectedItemsForAction = null,
                                 systemP1 = null, userP1 = null, systemP2 = null, userP2 = null,
                                 promptsMd = null, dailyMd = null, podcastMd = null, readGithub = null) {


    let actionButtonHtml = '';
    // Regenerate button for AI Content Summary page
    if (title.includes('AI日报') && selectedItemsForAction && Array.isArray(selectedItemsForAction) && selectedItemsForAction.length > 0) {
        actionButtonHtml = `
            <form action="/genAIContent" method="POST" style="display: inline-block; margin-left: 0.5rem;">
                <input type="hidden" name="date" value="${escapeHtml(pageDate)}">
                ${selectedItemsForAction.map(item => `<input type="hidden" name="selectedItems" value="${escapeHtml(item)}">`).join('')}
                <button type="submit" class="button-link regenerate-button">${isErrorPage ? '重试生成' : '重新生成'}</button>
            </form>`;
    }
    // Regenerate button for AI Podcast Script page
    else if (title.includes('AI播客') && selectedItemsForAction && Array.isArray(selectedItemsForAction) && selectedItemsForAction.length > 0) {
        actionButtonHtml = `
            <form action="/genAIPodcastScript" method="POST" style="display: inline-block; margin-left: 0.5rem;">
                <input type="hidden" name="date" value="${escapeHtml(pageDate)}">
                ${selectedItemsForAction.map(item => `<input type="hidden" name="selectedItems" value="${escapeHtml(item)}">`).join('')}
                <input type="hidden" name="summarizedContent" value="${escapeHtml(convertEnglishQuotesToChinese(dailyMd))}">
                <button type="submit" class="button-link regenerate-button">${isErrorPage ? '重试生成' : '重新生成'}</button>
            </form>
        `;
    } 

    let githubSaveFormHtml = '';
    let generatePodcastButtonHtml = ''; 
    let aiDailyAnalysisButtonHtml = '';
    let outDisplayButtonHtml = '';

    // Since commitToGitHub and genAIPodcastScript are now API calls,
    // these forms should be handled by JavaScript on the client side.
    // We will provide the data as hidden inputs for potential client-side use,
    // but the submission will be via JS fetch, not direct form POST.
    if (!isErrorPage) {
        if (title === 'AI日报' && promptsMd && dailyMd) {
            githubSaveFormHtml = `
                <input type="hidden" id="promptsMdCall1" value="${escapeHtml(promptsMd)}">
                <input type="hidden" id="dailyMd" value="${escapeHtml(dailyMd)}">
                <button type="button" class="button-link github-save-button" onclick="commitToGitHub('${pageDate}', 'daily')">保存日报到 GitHub</button>`;
        } else if (title === 'AI播客脚本' && promptsMd && podcastMd) {
            githubSaveFormHtml = `
                <input type="hidden" id="promptsMdCall2" value="${escapeHtml(promptsMd)}">
                <input type="hidden" id="podcastMd" value="${escapeHtml(podcastMd)}">
                <button type="button" class="button-link github-save-button" onclick="commitToGitHub('${pageDate}', 'podcast')">保存播客到 GitHub</button>`;
        }
    }

    if (title === 'AI日报' && !isErrorPage && podcastMd === null) { // podcastMd === null indicates it's the Call 1 page
        generatePodcastButtonHtml = `
            <form action="/genAIPodcastScript" method="POST" style="display: inline-block; margin-left: 0.5rem;">
                <input type="hidden" name="date" value="${escapeHtml(pageDate)}">
                <input type="hidden" name="readGithub" value="${readGithub}">
                ${selectedItemsForAction.map(item => `<input type="hidden" name="selectedItems" value="${escapeHtml(item)}">`).join('')}
                <input type="hidden" name="summarizedContent" value="${escapeHtml(convertEnglishQuotesToChinese(bodyContent))}">
                <button type="submit" class="button-link">生成播客脚本</button>
            </form>`;
        aiDailyAnalysisButtonHtml = `
            <input type="hidden" id="summarizedContentInput" value="${escapeHtml(convertEnglishQuotesToChinese(bodyContent))}">
            <button type="button" class="button-link" onclick="generateAIDailyAnalysis('${escapeHtml(pageDate)}')">AI 日报分析</button>
        `;
        outDisplayButtonHtml = `
            <button type="button" class="button-link" onclick="openContentInNewWindow()" >新窗口预览内容</button>
        `;
    }

    let promptDisplayHtml = '';
    if (title === 'AI日报' || title.includes('生成AI日报出错(')) {
        if (systemP1 || userP1) {
            promptDisplayHtml = `
                <div style="margin-top: 1.5rem;">
                    <h2 style="font-size:1.3rem; margin-bottom:0.5rem;">API 调用详情</h2>
                    ${generatePromptSectionHtmlForGenAI(convertEnglishQuotesToChinese(systemP1), convertEnglishQuotesToChinese(userP1), '调用 1: 日报', 'call1')}
                </div>`;
        }
    } else if (title === 'AI播客脚本') {
        if (systemP2 || userP2) {
            promptDisplayHtml = `
                <div style="margin-top: 1.5rem;">
                    <h2 style="font-size:1.3rem; margin-bottom:0.5rem;">API 调用详情</h2>
                    ${generatePromptSectionHtmlForGenAI(convertEnglishQuotesToChinese(systemP2), convertEnglishQuotesToChinese(userP2), '调用 2: 播客格式化', 'call2')}
                </div>`;
        }
    }

    return `
        <!DOCTYPE html><html lang="zh-Hans"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${escapeHtml(title)}</title>
            <style>
                :root { --primary-color: #007bff; --light-gray: #f8f9fa; --medium-gray: #e9ecef; --dark-gray: #343a40; --retry-color: #ffc107; --retry-text-color: #212529; --info-color: #17a2b8; --github-green: #28a745;}
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; background-color: var(--light-gray); color: var(--dark-gray); padding: 1rem; }
                .container { max-width: 900px; margin: 0 auto; background-color: #fff; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { font-size: 1.8rem; color: ${isErrorPage ? '#dc3545' : 'var(--dark-gray)'}; margin-bottom: 0.5rem; }
                p { margin-bottom: 1rem; }
                .content-box { margin-top: 1.5rem; padding: 1rem; background-color: ${isErrorPage ? '#f8d7da' : '#f0f9ff'}; border: 1px solid ${isErrorPage ? '#f5c6cb' : '#cce7ff'}; color: ${isErrorPage ? '#721c24' : 'var(--dark-gray)'}; border-radius: 6px; white-space: pre-wrap; word-wrap: break-word; line-height: 1.5; font-family: ${isErrorPage ? 'inherit' : 'Menlo, Monaco, Consolas, "Courier New", monospace'}; font-size: ${isErrorPage ? '1rem' : '0.95rem'};}
                .header-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: flex-end; align-items: center; margin-bottom: 1rem; }
                .navigation-links { margin-top: 1.5rem; }
                .button-link { display: inline-block; background-color: var(--primary-color); color: white; border: none; padding: 0.6rem 1.2rem; font-size: 0.9rem; border-radius: 5px; cursor: pointer; text-decoration: none; transition: background-color 0.2s; margin-right: 0.5rem; margin-bottom: 0.5rem;}
                .button-link:hover { background-color: #0056b3; }
                .regenerate-button { background-color: ${isErrorPage ? 'var(--retry-color)' : 'var(--info-color)'}; color: ${isErrorPage ? 'var(--retry-text-color)' : 'white'}; }
                .regenerate-button:hover { background-color: ${isErrorPage ? '#e0a800' : '#138496'}; }
                .github-save-button { background-color: var(--github-green); }
                .github-save-button:hover { background-color: #218838; }
                .toggle-prompt-btn { background-color: #6c757d; font-size: 0.85rem; padding: 0.4rem 0.8rem;}
                .toggle-prompt-btn:hover { background-color: #5a6268; }
                .copy-prompt-btn { background-color: #17a2b8; font-size: 0.85rem; padding: 0.4rem 0.8rem;}
                .copy-prompt-btn:hover { background-color: #138496;}
                #outContentBox { display: none;}
            </style>
        </head><body><div class="container">
            <div class="header-bar" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <h1>${escapeHtml(title)}</h1>
                <div class="header-actions">
                    ${generatePodcastButtonHtml}
                    ${aiDailyAnalysisButtonHtml}
                    ${outDisplayButtonHtml}
                </div>
            </div>
            <p>所选内容日期: <strong>${formatDateToChinese(escapeHtml(pageDate))}</strong></p>
            <div class="content-box" id="mainContentBox">${bodyContent}</div>
             <div class="content-box" id="outContentBox">${marked.parse(replaceImageProxy(env.IMG_PROXY, bodyContent))}</div>
            ${promptDisplayHtml}
            <div class="navigation-links">
                <a href="/getContentHtml?date=${encodeURIComponent(pageDate)}" class="button-link">返回内容选择</a>
                ${actionButtonHtml}
                ${githubSaveFormHtml}
                <div id="dailyAnalysisResult" style="margin-top: 1rem; padding: 1rem; border: 1px solid #ccc; border-radius: 5px; background-color: #f9f9f9; display: none;"></div>
            </div>
        </div>
        <script>
            function openContentInNewWindow() {
                const content = document.getElementById('outContentBox').innerHTML;
                const newWindow = window.open('', '_blank');
                newWindow.document.write('<!DOCTYPE html><html><head><title>内容预览</title><style> img{max-width: 100%;} video{max-width: 100%;} div{max-width: 36%; margin: 0 auto;} body {font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; padding: 1rem; }</style></head><body>');
                newWindow.document.write('<div>'+content+'</div>');
                newWindow.document.write('</body></html>');
                newWindow.document.close();
            }

            function togglePromptVisibility(elementId, buttonElement) {
                const promptDiv = document.getElementById(elementId);
                if (promptDiv) {
                    promptDiv.style.display = (promptDiv.style.display === 'none') ? 'block' : 'none';
                    if (buttonElement) buttonElement.textContent = (promptDiv.style.display === 'none') ? '显示提示详情' : '隐藏提示详情';
                }
            }
            function copyToClipboard(textToCopy, buttonElement) {
                if (!textToCopy) { alert("Nothing to copy."); return; }
                navigator.clipboard.writeText(textToCopy).then(() => {
                    const originalText = buttonElement.textContent;
                    buttonElement.textContent = '已复制!'; buttonElement.style.backgroundColor = '#28a745';
                    setTimeout(() => { buttonElement.textContent = originalText; buttonElement.style.backgroundColor = '#17a2b8'; }, 2000);
                }, (err) => { console.error('Async: Could not copy text: ', err); alert('复制提示失败。'); });
            }

            async function commitToGitHub(date, type) {
                const button = event.target;
                const originalText = button.textContent;
                button.textContent = '保存中...';
                button.disabled = true;

                const formData = new FormData();
                formData.append('date', date);

                if (type === 'daily') {
                    formData.append('prompts_markdown-1', document.getElementById('promptsMdCall1').value);
                    formData.append('daily_summary_markdown', document.getElementById('dailyMd').value);
                } else if (type === 'podcast') {
                    formData.append('prompts_markdown-2', document.getElementById('promptsMdCall2').value);
                    formData.append('podcast_script_markdown', document.getElementById('podcastMd').value);
                }

                let githubSuccess = false;
                let supabaseSuccess = false;

                try {
                    // Commit to GitHub
                    const githubResponse = await fetch('/commitToGitHub', {
                        method: 'POST',
                        body: formData
                    });

                    const githubResult = await githubResponse.json();
                    if (githubResponse.ok) {
                        alert('GitHub 提交成功！');
                        console.log('GitHub Commit Success:', githubResult);
                        githubSuccess = true;
                    } else {
                        alert('GitHub 提交失败: ' + githubResult.message);
                        console.error('GitHub Commit Failed:', githubResult);
                    }
                } catch (error) {
                    console.error('Error committing to GitHub:', error);
                    alert('GitHub 请求失败，请检查网络或服务器。');
                }

                if (githubSuccess || supabaseSuccess) {
                    // Optionally reload or update UI if both or one succeeded
                }

                button.textContent = originalText;
                button.disabled = false;
            }

            async function generateAIDailyAnalysis(date) {
                const button = event.target;
                const originalText = button.textContent;
                button.textContent = '正在分析...';
                button.disabled = true;
                const analysisResultDiv = document.getElementById('dailyAnalysisResult');
                analysisResultDiv.style.display = 'none'; // Hide previous result
                analysisResultDiv.innerHTML = ''; // Clear previous result

                const summarizedContent = document.getElementById('summarizedContentInput').value; // Get summarized content from hidden input

                try {
                    const response = await fetch('/genAIDailyAnalysis', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ date: date, summarizedContent: summarizedContent })
                    });

                    if (response.ok) {
                        const result = await response.text();
                        analysisResultDiv.innerHTML = \`<h2>AI 日报分析结果</h2><div class="content-box">\${result}</div>\`;
                        analysisResultDiv.style.display = 'block';
                        //alert('AI 日报分析成功！');
                    } else {
                        const errorText = await response.text();
                        analysisResultDiv.innerHTML = \`<h2>AI 日报分析失败</h2><div class="content-box error">\${errorText}</div>\`;
                        analysisResultDiv.style.display = 'block';
                        alert('AI 日报分析失败: ' + errorText);
                    }
                } catch (error) {
                    console.error('Error generating AI daily analysis:', error);
                    analysisResultDiv.innerHTML = \`<h2>AI 日报分析失败</h2><div class="content-box error">请求失败，请检查网络或服务器。错误: \${escapeHtml(error.message)}</div>\`;
                    analysisResultDiv.style.display = 'block';
                    alert('请求失败，请检查网络或服务器。');
                } finally {
                    button.textContent = originalText;
                    button.disabled = false;
                }
            }
        </script>
        </body></html>`;
}

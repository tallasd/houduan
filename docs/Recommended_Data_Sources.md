# 网络智能化优质内容源推荐清单 (面向浙江移动创新研究院)

本清单基于全网搜索与甄选，专门针对运营商（Carrier）网络智能部需求定制。旨在剔除通用 AI 噪音，聚焦 **自智网络 (AN)**、**算力网络 (CFN)**、**AIOps**、**6G** 等垂直领域。

## 1. 国际标准与行业组织 (Standards & Alliances)
> **价值**：把握顶层设计，对标 L4 自智网络演进路径。

*   **TM Forum (自智网络权威)**
    *   **核心关注**: Autonomous Networks (AN) Project, IG1218 (AN Framework), IG1230 (AN Levels).
    *   **资源地址**: `https://www.tmforum.org/topics/autonomous-networks/`
    *   **内容**: 白皮书、蓝图、催化剂项目 (Catalyst Projects) 成果。
*   **ETSI ENI (欧洲电信标准化协会 - 体验式网络智能)**
    *   **核心关注**: ENI 架构、认知网络管理、AI 在 5G 中的应用 POC。
    *   **资源地址**: `https://www.etsi.org/technologies/experiential-networked-intelligence`
    *   **内容**: GR (Group Reports)、GS (Group Specifications)、白皮书。
*   **3GPP (SA5 工作组)**
    *   **核心关注**: 管理、编排与计费 (Telecom Management)。关注 Rel-18/19 中关于 AI/ML 在 RAN 和 Core 的标准化 (如 NWDAF 增强)。
    *   **资源地址**: `https://www.3gpp.org/news-events/3gpp-news` (需筛选 SA5 标签)
*   **O-RAN Alliance**
    *   **核心关注**: RIC (RAN Intelligent Controller), xApp/rApp 接口标准。
    *   **资源地址**: `https://www.o-ran.org/blog`

## 2. 头部设备商与实验室 (Tier-1 Vendors & Labs)
> **价值**：洞察竞品能力，了解设备侧 AI 落地的最新实践。

*   **Nokia Bell Labs (诺基亚贝尔实验室)**
    *   **特点**: 学术性强，前瞻性高 (6G, AI-Native Air Interface)。
    *   **推荐栏目**: "Machine Learning and Systems", "AI Research Lab".
    *   **地址**: `https://www.nokia.com/bell-labs/research/air-lab/`
*   **Ericsson (爱立信技术博客)**
    *   **特点**: 务实，聚焦 5G 现网优化、节能、认知网络 (Cognitive Networks)。
    *   **推荐栏目**: "AI and Automation", "Future Technologies".
    *   **地址**: `https://www.ericsson.com/en/ai`
*   **Huawei (华为)**
    *   **特点**: 算力网络、ADN (自动驾驶网络) 解决方案、MBB Lab 研究。
    *   **关注**: 华为运营商 BG 公众号、ICT Insights。
    *   **地址**: `https://www.huawei.com/en/news` (需关键词过滤)

## 3. 学术前沿与顶会 (Academic & Research)
> **价值**：捕捉算法突破，寻找可引入现网的“黑科技”。

*   **ArXiv (计算机科学 - 网络与互联网架构)**
    *   **Category**: `cs.NI` (Networking and Internet Architecture) + `cs.AI`
    *   **监控关键词**: `Deep Reinforcement Learning + RAN`, `Graph Neural Networks + Topology`, `LLM + NetOps`.
    *   **RSS**: `http://arxiv.org/rss/cs.NI`
*   **顶级会议 (Proceedings)**
    *   **SIGCOMM / NSDI**: 网络领域的奥斯卡。关注其中的 AI/ML Track。
    *   **IEEE INFOCOM**: 关注“AI for Networking”相关 Session。

## 4. 垂直行业媒体 (Vertical Media)
> **价值**：获取行业动态、高管言论、并购信息。

*   **SDxCentral**
    *   **专注**: SDN, NFV, Cloud Native, AI Security.
    *   **地址**: `https://www.sdxcentral.com/category/ai-automation/`
*   **Light Reading**
    *   **专注**: 运营商财经、战略转型、OSS/BSS 变革。
    *   **地址**: `https://www.lightreading.com/ai-automation`
*   **RCR Wireless**
    *   **专注**: 无线接入网、Open RAN、Telco AI。

## 5. 建议的数据接入策略 (Implementation Strategy)

针对上述源，建议采用分级接入策略：

1.  **RSS 直接接入**: ArXiv, SDxCentral, Light Reading, Ericsson Blog.
2.  **API/页面监控**: ETSI, TM Forum (通常无 RSS，需定制爬虫监控 PDF 发布).
3.  **关键词重过滤**: 即使是垂直源，也包含大量无关信息（如纯硬件发布）。必须使用以下关键词库进行二次清洗：
    *   `Autonomous Network` / `自智网络`
    *   `Computing Force Network` / `算力网络`
    *   `Network Digital Twin` / `网络数字孪生`
    *   `NWDAF` / `RIC` / `NetGPT`
    *   `Intent-based` / `意图驱动`

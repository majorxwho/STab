// 📂 popup.js [STab LRSE Engine Unified Decoupled Version]

(function() {
  let cardsData = [];
  let currentSelectedIndex = 0;
  let pageTitle = "";
  let pageUrl = "";
  let favIconUrl = ""; // 用于提取原始图标并安全压缩
  let sitesList = [];
  let activeLang = 'en';
  let localSkew = 0; // 缓存的本地时钟校准值
  let sTabIconCache = {}; // 解耦保存的哈希图标表

  // 🌐 综合取词包装函数（完全下沉并解耦，依赖 i18n.js 及 messages.json 语言包）
  function t(key, defaultVal) {
    if (typeof window.getI18nMsg === 'function') {
      const res = window.getI18nMsg(key);
      if (res !== key) return res; 
    }
    return defaultVal;
  }

  // 规范化语言检测
  function normalizeLanguage(lang) {
    if (!lang) return 'en';
    lang = lang.replace('-', '_');
    if (lang.startsWith('zh')) return 'zh_CN';
    const supported = ['zh_CN', 'en', 'ja', 'ko', 'de', 'ru', 'fr', 'it'];
    for (const s of supported) {
      if (lang.toLowerCase().startsWith(s.toLowerCase())) return s;
    }
    return 'en';
  }

  // 🛡️ 高效无损 Canvas 压缩提取 Favicon，通过 Blob / ObjectURL 彻底避免 CORS Taint 污染画布
  // 引入 AbortController 并设定 600ms 强制超时限制，避免因目标网站网络阻塞或断开导致的保存延迟
  async function compressFaviconTo48(rawFaviconUrl) {
    if (!rawFaviconUrl) return null;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 600); // 600ms 严格超时机制

    try {
      const response = await fetch(rawFaviconUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!response.ok) return null;
      const blob = await response.blob();
      const objectURL = URL.createObjectURL(blob);
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 48;
            canvas.height = 48;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 48, 48);
            URL.revokeObjectURL(objectURL);
            resolve(canvas.toDataURL('image/png'));
          } catch (e) {
            URL.revokeObjectURL(objectURL);
            resolve(null);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectURL);
          resolve(null);
        };
        img.src = objectURL;
      });
    } catch (e) {
      clearTimeout(timeoutId);
      return null;
    }
  }

  // 🛡️ 限额 LRU 图标淘汰过滤：若 cache 序列化文本接近 2MB 则自动淘汰最久未读取的对象
  function applyLruEviction(cache) {
    let str = JSON.stringify(cache);
    const limit = 2 * 1024 * 1024; // 2MB 强制配额安全线
    if (str.length <= limit) return cache;

    const entries = Object.entries(cache).map(([key, value]) => ({
      key,
      lr: value.lr || 0
    }));
    entries.sort((a, b) => a.lr - b.lr); // 升序排列：最旧的在前面

    for (let entry of entries) {
      delete cache[entry.key];
      if (JSON.stringify(cache).length < 1.5 * 1024 * 1024) { // 清退空出到 1.5MB 安全区
        break;
      }
    }
    return cache;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    // 🛡️ 极速对准 i18n 框架，确保 window.getI18nMsg 可用
    const checkI18n = () => {
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          if (typeof window.getI18nMsg === 'function') {
            clearInterval(interval);
            resolve();
          }
        }, 5);
      });
    };
    await checkI18n();

    // 读取语言环境
    const stored = await new Promise(r => chrome.storage.local.get(['userLanguage'], r));
    let langCode = stored.userLanguage;
    if (!langCode || langCode === 'auto') {
      langCode = chrome.i18n.getUILanguage();
    }
    activeLang = normalizeLanguage(langCode);

    // 动态翻译 popup.html 静态标签元素
    const translateStaticPopupHTML = () => {
      const h3 = document.querySelector('.s-add-header h3');
      if (h3) h3.textContent = t('popup_add_title', '添加当前网页到 S导航');
      const st = document.querySelector('.s-add-section-title');
      if (st) st.textContent = t('popup_select_location', '选择保存位置');
      const nf = document.querySelector('#sNestedFolderModal h4');
      if (nf) nf.textContent = t('new_folder', '新建文件夹');
    };
    translateStaticPopupHTML();

    // 首先检查 URL 查询参数是否有传入的 tab 数据 (从右键菜单弹窗降级方案传过来)
    const urlParams = new URLSearchParams(window.location.search);
    const paramTitle = urlParams.get("title");
    const paramUrl = urlParams.get("url");
    const paramFavIconUrl = urlParams.get("favIconUrl");

    if (paramUrl) {
      pageTitle = paramTitle || "";
      pageUrl = paramUrl;
      favIconUrl = paramFavIconUrl || "";
      document.getElementById('sAddPageTitleInput').value = pageTitle;
      document.getElementById('sAddPageUrlInput').value = pageUrl;
    } else {
      // 如果没有传入参数，获取当前活动标签页
      const tabs = await new Promise(resolve => chrome.tabs.query({ active: true, currentWindow: true }, resolve));
      if (tabs && tabs[0]) {
        pageTitle = tabs[0].title || "";
        pageUrl = tabs[0].url || "";
        favIconUrl = tabs[0].favIconUrl || "";
        document.getElementById('sAddPageTitleInput').value = pageTitle;
        document.getElementById('sAddPageUrlInput').value = pageUrl;
      }
    }

    // 载入必要的同步时钟偏差、图标缓存表与主网格数据
    chrome.storage.local.get(['mySites', 'localSkew', 's_tab_icon_cache'], (result) => {
      sitesList = result.mySites || [];
      localSkew = result.localSkew || 0;
      sTabIconCache = result.s_tab_icon_cache || {};
      buildCardsData();
      analyzeAndPositionDuplicateUrl();
      renderFolderGrid();
      setupEventListeners();
    });
  });

  function buildCardsData() {
    cardsData = [
      { id: 'folder_uncategorized', name: t('uncategorized', '未分类'), isSpecialFolder: true, isMainGrid: false, isAddBtn: false },
      { id: 'main_grid', name: t('main_grid', '主网格'), isSpecialFolder: true, isMainGrid: true, isAddBtn: false }
    ];
    sitesList.forEach(s => {
      if (s.type === 'folder' && s.id !== 'folder_uncategorized') {
        cardsData.push({ id: s.id, name: s.name, isSpecialFolder: false, isMainGrid: false, isAddBtn: false });
      }
    });
    cardsData.push({ id: 'add_folder_btn', name: t('new_folder', '新建文件夹'), isSpecialFolder: false, isMainGrid: false, isAddBtn: true });
    currentSelectedIndex = 0;
  }

  function analyzeAndPositionDuplicateUrl() {
    if (!pageUrl) return;
    const targetMinUrl = pageUrl.trim().toLowerCase().replace(/\/$/, "");
    let targetContainerId = null;
    let containerName = t('main_grid', "主网格");

    for (let node of sitesList) {
      if (node.type === 'nav' && node.url && node.url.trim().toLowerCase().replace(/\/$/, "") === targetMinUrl) {
        targetContainerId = 'main_grid';
        containerName = t('main_grid', "主网格");
        break;
      }
      if (node.type === 'folder' && node.children) {
        let hasChild = node.children.some(c => c.url && c.url.trim().toLowerCase().replace(/\/$/, "") === targetMinUrl);
        if (hasChild) {
          targetContainerId = node.id;
          containerName = node.name;
          break;
        }
      }
    }

    if (targetContainerId) {
      const headerBox = document.querySelector('.s-add-header');
      if (headerBox) {
        const tipEl = document.createElement('div');
        tipEl.className = "s-add-dup-toast-bar";
        tipEl.innerText = t('toast_dup', '💡 提示：该网页已收藏在 [') + containerName + t('toast_dup_suffix', '] 中');
        headerBox.appendChild(tipEl);
      }
      
      const foundIdx = cardsData.findIndex(c => c.id === targetContainerId);
      if (foundIdx !== -1) {
        currentSelectedIndex = foundIdx;
      }

      const saveBtn = document.getElementById('sAddSaveBtn');
      if (saveBtn) {
        saveBtn.innerText = t('update_pos', "更新位置");
        saveBtn.style.background = "#10b981";
      }
    }
  }

  function renderFolderGrid() {
    const grid = document.getElementById('sAddFolderGrid'); if (!grid) return;
    grid.innerHTML = '';
    cardsData.forEach((card, idx) => {
      const cardEl = document.createElement('div'); cardEl.className = 's-add-card';
      if (idx === currentSelectedIndex) cardEl.classList.add('selected');
      cardEl.setAttribute('title', card.name);

      if (card.isAddBtn) {
        cardEl.classList.add('btn-add-folder');
        cardEl.innerHTML = `<div class="s-add-card-body"><span>＋</span><div class="s-popup-folder-badge">📁</div></div><div class="s-add-card-title">${escapeHtml(card.name)}</div>`;
      } else {
        cardEl.classList.add('is-folder');
        let iconHtml = card.isMainGrid ? '<span class="s-add-card-icon">🏠</span>' : '<span class="s-add-card-icon">📁</span>';
        cardEl.innerHTML = `<div class="s-add-card-body">${iconHtml}</div><div class="s-add-card-title">${escapeHtml(card.name)}</div>`;
      }

      cardEl.onclick = (e) => { e.stopPropagation(); currentSelectedIndex = idx; updateSelectionUI(); if (card.isAddBtn) openNestedModal(); };
      grid.appendChild(cardEl);
    });
    setTimeout(updateSelectionUI, 40);
  }

  function updateSelectionUI() {
    const grid = document.getElementById('sAddFolderGrid'); if (!grid) return;
    Array.from(grid.children).forEach((child, idx) => {
      if (idx === currentSelectedIndex) { child.classList.add('selected'); child.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } 
      else child.classList.remove('selected');
    });
  }

  function setupEventListeners() {
    document.getElementById('sAddSaveBtn').onclick = savePage;
    document.getElementById('sNestedCancelBtn').onclick = closeNestedModal;
    document.getElementById('sNestedSaveBtn').onclick = saveNewFolder;
    document.addEventListener('keydown', handleGlobalKeyDown);
  }

  function handleGlobalKeyDown(e) {
    const nestedModal = document.getElementById('sNestedFolderModal');
    if (nestedModal && nestedModal.style.display === 'flex') {
      if (e.key === 'Escape') { closeNestedModal(); e.preventDefault(); }
      else if (e.key === 'Enter') { saveNewFolder(); e.preventDefault(); }
      return;
    }
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.id === 'sAddPageTitleInput' || activeEl.id === 'sAddPageUrlInput')) {
      if (e.key === 'Enter') { savePage(); e.preventDefault(); }
      return;
    }
    if (e.key === 'Escape') { window.close(); e.preventDefault(); } 
    else if (e.key === 'Enter') {
      const activeCard = cardsData[currentSelectedIndex];
      if (activeCard && activeCard.isAddBtn) openNestedModal(); else savePage();
      e.preventDefault();
    } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault(); const cols = 4; const total = cardsData.length; let targetIdx = currentSelectedIndex;
      if (e.key === 'ArrowRight') targetIdx = Math.min(total - 1, targetIdx + 1);
      else if (e.key === 'ArrowLeft') targetIdx = Math.max(0, targetIdx - 1);
      else if (e.key === 'ArrowDown') targetIdx = Math.min(total - 1, targetIdx + cols);
      else if (e.key === 'ArrowUp') targetIdx = Math.max(0, targetIdx - cols);
      if (targetIdx !== currentSelectedIndex) { currentSelectedIndex = targetIdx; updateSelectionUI(); }
    }
  }

  function openNestedModal() {
    const nestedModal = document.getElementById('sNestedFolderModal');
    if (nestedModal) {
      nestedModal.style.display = 'flex';
      const input = document.getElementById('sNestedFolderNameInput');
      if (input) { input.value = ''; setTimeout(() => input.focus(), 60); }
    }
  }
  
  function closeNestedModal() {
    const nestedModal = document.getElementById('sNestedFolderModal'); if (nestedModal) nestedModal.style.display = 'none';
    const container = document.getElementById('sAddGridContainer'); if (container) container.focus();
  }

  function saveNewFolder() {
    const input = document.getElementById('sNestedFolderNameInput'); const folderName = input ? input.value.trim() : '';
    if (!folderName) { alert(t('err_empty_name', '文件夹名称不能为空！')); return; }
    
    let isNameExists = sitesList.some(s => s.type === 'folder' && s.name.trim().toLowerCase() === folderName.toLowerCase());
    if (isNameExists) { alert(`⚠️ ` + t('err_dup_name', "发现已存在同名文件夹 [") + `${folderName}` + t('err_dup_suffix', "]，请重新换个名字！")); return; }

    const folderId = "folder_" + Date.now();
    const calibratedTimestamp = Date.now() + localSkew;
    
    // 注入 LWW 时间戳
    sitesList.push({ 
      id: folderId, 
      type: "folder", 
      name: folderName, 
      children: [], 
      u: calibratedTimestamp 
    });

    chrome.storage.local.set({ 
      mySites: sitesList, 
      lastLocalUpdated: calibratedTimestamp 
    }, () => {
      buildCardsData(); const newIdx = cardsData.findIndex(c => c.id === folderId);
      if (newIdx !== -1) currentSelectedIndex = newIdx;
      renderFolderGrid(); closeNestedModal();
    });
  }

  async function savePage() {
    const titleInput = document.getElementById('sAddPageTitleInput'); const urlInput = document.getElementById('sAddPageUrlInput');
    const finalTitle = titleInput ? titleInput.value.trim() : pageTitle; let finalUrl = urlInput ? urlInput.value.trim() : pageUrl;
    if (!finalTitle || !finalUrl) { alert(t('alert_empty', "名称和网址不得为空！")); return; }
    if (!finalUrl.startsWith('http') && !finalUrl.startsWith('chrome')) finalUrl = "https://" + finalUrl;

    const selectedCard = cardsData[currentSelectedIndex]; if (!selectedCard) return;

    if (selectedCard.isAddBtn) {
      alert(t('alert_new_folder', "⚠️ 请先双击卡片或按回车输入新建文件夹的名称！"));
      openNestedModal();
      return;
    }

    // 禁用保存按钮并置灰，防止等待 Favicon 时重复点击发生并发覆盖
    const saveBtn = document.getElementById('sAddSaveBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.6';
      saveBtn.style.cursor = 'not-allowed';
    }

    const matchMinUrl = finalUrl.trim().toLowerCase().replace(/\/$/, "");
    const calibratedTimestamp = Date.now() + localSkew;

    let targetIconIdx = 0;
    let oldFolderNode = null;

    // 1. 排重清理，若原卡片存在则保留其换图标索引值；并标记其曾处的旧文件夹
    sitesList = sitesList.filter(node => {
      if (node.type === 'nav' && node.url && node.url.trim().toLowerCase().replace(/\/$/, "") === matchMinUrl) {
        targetIconIdx = node.iconSourceIdx || 0;
        return false;
      }
      if (node.type === 'folder' && node.children) {
        const found = node.children.find(c => c.url && c.url.trim().toLowerCase().replace(/\/$/, "") === matchMinUrl);
        if (found) {
          targetIconIdx = found.iconSourceIdx || 0;
          oldFolderNode = node; 
        }
        node.children = node.children.filter(c => !c.url || c.url.trim().toLowerCase().replace(/\/$/, "") !== matchMinUrl);
      }
      return true;
    });

    // 2. 如果之前属于某个父文件夹，在移出时也要更新该父文件夹的 LWW 戳
    if (oldFolderNode) {
      oldFolderNode.u = calibratedTimestamp;
    }

    // 3. 构建不包含 Base64 脏数据的超轻量卡片节点并注入 LWW 时间戳
    const newNavNode = { 
      id: "id_" + Math.random().toString(36).substring(2, 11), 
      type: 'nav', 
      name: finalTitle, 
      url: finalUrl, 
      iconSourceIdx: targetIconIdx,
      u: calibratedTimestamp 
    };

    // 4. 将卡片并入指定位置，并更新受影响容器的 LWW 时间戳
    if (selectedCard.isMainGrid) {
      sitesList.push(newNavNode);
    } else {
      let folderNode = sitesList.find(s => s.id === selectedCard.id);
      if (!folderNode && selectedCard.id === 'folder_uncategorized') { 
        folderNode = { id: 'folder_uncategorized', type: 'folder', name: t('uncategorized', '未分类'), children: [], u: calibratedTimestamp }; 
        sitesList.push(folderNode); 
      }
      if (folderNode) { 
        if (!folderNode.children) folderNode.children = []; 
        folderNode.children.push(newNavNode); 
        folderNode.u = calibratedTimestamp; // 更新受影响文件夹的时间戳
      }
    }

    // 5. 提取并等比物理压缩 48x48 Base64 图标独立写入解耦缓存表 (包含 600ms 强制超时硬保护)
    if (favIconUrl) {
      const compressedB64 = await compressFaviconTo48(favIconUrl);
      if (compressedB64) {
        sTabIconCache[finalUrl] = {
          icon: compressedB64,
          lr: calibratedTimestamp
        };
        sTabIconCache = applyLruEviction(sTabIconCache); // 执行 LRU 安全清退
      }
    }

    // 6. 原子性写盘：写入不含 Base64 脏数据的主列表、LRU 限制的缓存表与写盘标志戳
    chrome.storage.local.set({ 
      mySites: sitesList, 
      s_tab_icon_cache: sTabIconCache,
      lastLocalUpdated: calibratedTimestamp
    }, () => window.close());
  }

  function escapeHtml(str) { return str ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;") : ''; }
})();
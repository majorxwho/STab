// 📂 newtab.js [STab Full Optimized Version with i18n Guard & LRSE 24-Points Core Engine - Fixed Reentrancy & Sync Loop]
let isContextMenuActive = false; 

let engineIconSources = {}; 
let engineIconBase64Map = {}; 

let globalIconFallbackCount = 0;
const MAX_FALLBACKS_PER_SESSION = 60; 

let isSyncingInProgress = false; 
let activeSyncTab = 'browser'; 

// 🛡️ 拖拽专用保护状态锁，防止并发重绘时中途销毁 DOM 导致拖拽链崩溃
let isDraggingFromSearch = false;

// ⭐ 跑马灯高精逐条跃进闭环引擎核心全局变量
let marqueeGlobalTimerInstance = null;
let marqueeCurrentLineIndex = 0; 
let isMarqueePausedByHoverLock = false;
const MARQUEE_SINGLE_LINE_HEIGHT = 18;

// ⭐ 宿主级高级状态机驱动
let leftPanelFolderId = null;
let rightPanelFolderId = null;
let folderViewStates = {}; 

// ⭐ 云同步配置三通道本地内存化影子独立变量
let cachedSyncBrowserConfig = null;
let cachedSyncNasConfig = null;
let cachedSyncWebdavConfig = null;

// ⭐ Supabase 云集群配置
const SUPABASE_URL = "https://lweziakgzdjfqghjnpiq.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_C9faI4PDzdRuBtnix8hoCg_UqwiLe3_"; 

const DEFAULT_EARTH_ICON = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='64' height='64' fill='%2394a3b8'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.53c-.26-.81-1-1.4-1-2.42v-3c0-.55-.45-1-1-1h-6v-2c0-.55-.45-1-1-1H7V7c0-.55-.45-1-1-1H5.07c1.72-2.34 4.44-3.9 7.53-3.9 5.52 0 10 4.48 10 10 0 2.95-1.28 5.61-3.3 7.47z'/></svg>";

// 🔍 官方合规放大镜高清矢量图标
const DEFAULT_SEARCH_ICON = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='64' height='64' fill='%2394a3b8'><path d='M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/></svg>";
// 🔒 密码设置向导全局临时缓冲
let wizardTempCharPwd = "";
let wizardTempCharPwdHint = "";
let wizardFirstGesture = "";
let wizardSecondGesture = "";
let wizardIsOnlyChangingGesture = false;
// 🔒 网页图标选择器全局临时缓冲
let activeIconSelectorTarget = null; 
let selectedIconSourceIdx = 0;

// 🔒 统一安全验证组件回调句柄
let activeVerifySuccessCallback = null;
let activeVerifyCancelCallback = null;
// 🔒 暂存当前正在操作加密的文件夹 ID，用以实现向导设置后的自动回路
let pendingEncryptionFolderId = null;

// 🔒 9宫格绘制全局坐标缓存
let staticGridPoints = [];

// 🛡️ 新增：无痕模式切换高精矢量 SVG
const SVG_EYE_OPEN = `<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const SVG_EYE_CLOSED = `<svg viewBox="0 0 24 24"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

/* ========================================================================= */
/* 🚀 24点 LRSE 引擎核心底层变量与事件流控制 */
/* ========================================================================= */
const myTabId = "tab_" + Math.random().toString(36).substring(2, 11);
let isLeader = false;
let localSkew = 0; // 服务器与本地时钟时差校准值
let adaptiveInterval = 3000; // 探针动态频率：起步 3 秒
let idleTimer = null; // 键盘鼠标空闲期判定计时器
let networkBackoffCount = 0; // 网络异常连续发生次数（指数退避依据）
let isFirstSyncCompleted = false; // 是否已完成开机全量同步
let currentSyncDebounceTimer = null; // 视口防抖定时器
let probeTimer = null; // 定时器句柄

// ⭐ 并发与防重入渲染锁
let currentRenderId = 0;
let folderRenderIds = {};

// 🌐 极速取词器代理函数
function t(key, defaultVal = '') {
  if (typeof window.getI18nMsg === 'function') {
    return window.getI18nMsg(key, defaultVal);
  }
  return defaultVal;
}

// 🌐 统一网页卡片点击处理引擎
function handleWebpageCardClick(e, url) {
  if (e.ctrlKey) {
    chrome.tabs.create({ url: url, active: false });
  } else {
    window.location.href = url;
  }
}

function reloadPageWithModalRestored() {
  sessionStorage.setItem('autoOpenSyncModal', 'true');
  window.location.reload();
}

// ⭐ 消除焦虑：安全静默旋转指标
function showSyncIndicator() {}
function hideSyncIndicator() {}

function imgToBase64Canvas(img) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 48;
    canvas.height = 48;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, 48, 48);
    return canvas.toDataURL('image/png');
  } catch (e) { return null; }
}

async function urlToBase64(url) {
  try {
    const response = await fetch(url);
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
  } catch (e) { return null; }
}

function saveIconSourceIdxQuietly(realIdx, correctIdx) {
  chrome.storage.local.get(['mySites'], result => {
    let sites = result.mySites || [];
    if (sites[realIdx] && sites[realIdx].iconSourceIdx !== correctIdx) {
      sites[realIdx].iconSourceIdx = correctIdx;
      sites[realIdx].u = Date.now() + localSkew; 
      chrome.storage.local.set({ mySites: sites });
    }
  });
}

// 保存引擎的换图标索引
function saveEngineIconSourceIdxQuietly(engId, correctIdx) {
  chrome.storage.local.get(['engineIconSources'], result => {
    let sources = result.engineIconSources || {};
    if (sources[engId] !== correctIdx) {
      sources[engId] = correctIdx;
      chrome.storage.local.set({ engineIconSources: sources });
    }
  });
}

function saveCapturedBase64(realIndex, engId, base64Str, correctIdx) {
  const nowTime = Date.now() + localSkew;
  if (realIndex !== null && realIndex !== undefined) {
    chrome.storage.local.get(['mySites', 's_tab_icon_cache'], result => {
      let sites = result.mySites || [];
      let iconCache = result.s_tab_icon_cache || {};
      const idx = parseInt(realIndex);
      if (sites[idx]) {
        sites[idx].iconSourceIdx = correctIdx;
        sites[idx].u = nowTime; 
        const itemUrl = sites[idx].url || "";
        if (itemUrl) {
          iconCache[itemUrl] = { icon: base64Str, lr: nowTime }; 
          iconCache = applyLruEviction(iconCache); 
        }
        delete sites[idx].localIconBase64;
        chrome.storage.local.set({ mySites: sites, s_tab_icon_cache: iconCache });
      }
    });
  }
  if (engId) {
    chrome.storage.local.get(['engineIconSources', 'engineIconBase64'], result => {
      let sources = result.engineIconSources || {};
      let base64Map = result.engineIconBase64 || {};
      sources[engId] = correctIdx;
      base64Map[engId] = base64Str; 
      chrome.storage.local.set({ engineIconSources: sources, engineIconBase64: base64Map });
    });
  }
}

function processIconFallback(target) {
  const url = target.getAttribute('data-url');
  if (!url) return;
  let startIdx = parseInt(target.getAttribute('data-startidx')) || 0;
  if (startIdx === -1) return; 
  
  let attempt = parseInt(target.getAttribute('data-attempt')) || 0;
  attempt++;
  globalIconFallbackCount++;

  if (attempt >= 18 || globalIconFallbackCount > MAX_FALLBACKS_PER_SESSION) {
    target.removeAttribute('data-url');
    target.src = DEFAULT_EARTH_ICON;
    const realIndex = target.getAttribute('data-realindex');
    if (realIndex !== null && realIndex !== undefined) saveIconSourceIdxQuietly(parseInt(realIndex), -1);
    const engId = target.getAttribute('data-engid');
    if (engId) saveEngineIconSourceIdxQuietly(engId, -1);
  } else {
    target.setAttribute('data-attempt', attempt);
    target.removeAttribute('data-base64-processed'); 
    const nextIdx = (startIdx + attempt) % 18; 
    target.src = getFaviconUrlBySource(url, nextIdx);
  }
}

document.addEventListener('error', function(event) {
  if (event.target && event.target.tagName === 'IMG' && event.target.hasAttribute('data-url')) processIconFallback(event.target);
}, true);

document.addEventListener('load', function(event) {
  const target = event.target;
  if (target && target.tagName === 'IMG' && target.hasAttribute('data-url')) {
    if (target.naturalWidth <= 4 || target.naturalHeight <= 4) {
      processIconFallback(target);
    } else {
      const attempt = parseInt(target.getAttribute('data-attempt')) || 0;
      const startIdx = parseInt(target.getAttribute('data-startidx')) || 0;
      const correctIdx = (startIdx + attempt) % 18; 
      const realIndex = target.getAttribute('data-realindex');
      const engId = target.getAttribute('data-engid');

      if (!target.hasAttribute('data-base64-processed') && !target.src.includes('data:image') && target.src.startsWith('http')) {
        target.setAttribute('data-base64-processed', 'true');
        let base64Str = imgToBase64Canvas(target);
        if (base64Str) {
          saveCapturedBase64(realIndex, engId, base64Str, correctIdx);
        } else {
          urlToBase64(target.src).then(fetchedBase64 => {
            if (fetchedBase64) {
              saveCapturedBase64(realIndex, engId, fetchedBase64, correctIdx);
            } else {
              if (attempt > 0) {
                if (realIndex !== null && realIndex !== undefined) saveIconSourceIdxQuietly(parseInt(realIndex), correctIdx);
                if (engId) saveEngineIconSourceIdxQuietly(engId, correctIdx);
              }
            }
          });
        }
      } else {
         if (attempt > 0) { 
           if (realIndex !== null && realIndex !== undefined) saveIconSourceIdxQuietly(parseInt(realIndex), correctIdx);
           if (engId) saveEngineIconSourceIdxQuietly(engId, correctIdx);
         }
      }
    }
  }
}, true);

function getTodayDateStr() {
  const d = new Date();
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function getSites() {
  return new Promise(resolve => {
    chrome.storage.local.get(['mySites'], result => {
      let sites = result.mySites || [];
      sites = sites.map(s => { 
        if (!s.id) s.id = "id_" + Math.random().toString(36).substring(2, 11);
        if (!s.type) s.type = s.folder ? 'bookmark' : 'nav'; 
        if (s.iconSourceIdx === undefined) s.iconSourceIdx = 0; 
        if (s.type === 'folder' && !s.children) s.children = [];
        if (s.u === undefined) s.u = 0; 
        return s; 
      });
      resolve(sites);
    });
  });
}

function saveSites(data) { 
  const filteredData = strictFilterDuplicateUrlsAndMergeFolders(data);
  return new Promise(resolve => {
    isSyncingInProgress = true;
    chrome.storage.local.set({ mySites: filteredData, lastLocalUpdated: Date.now() + localSkew }, () => {
      isSyncingInProgress = false;
      resolve();
    });
  }); 
}

function strictFilterDuplicateUrlsAndMergeFolders(sites) {
  const seenUrls = new Set();
  const folderNameMap = new Map();
  const mergedSites = [];

  sites.forEach(node => {
    if (!node) return;
    if (node.type === 'folder' && node.id !== 'folder_uncategorized') {
      const normalName = node.name.trim();
      if (folderNameMap.has(normalName)) {
        const primaryFolder = folderNameMap.get(normalName);
        if (node.children && Array.isArray(node.children)) {
          primaryFolder.children = [...(primaryFolder.children || []), ...node.children];
        }
        if (node.isEncrypted) primaryFolder.isEncrypted = true;
        primaryFolder.u = Math.max(primaryFolder.u || 0, node.u || 0);
      } else {
        folderNameMap.set(normalName, node);
        mergedSites.push(node);
      }
    } else {
      mergedSites.push(node);
    }
  });

  const cleanFolderChildren = (children) => {
    if (!children) return [];
    return children.filter(item => {
      if (item.type === 'nav' && item.url) {
        const minimizedUrl = item.url.trim().toLowerCase().replace(/\/$/, "");
        if (seenUrls.has(minimizedUrl)) return false;
        seenUrls.add(minimizedUrl);
      }
      return true;
    });
  };

  return mergedSites.filter(node => {
    if (node.type === 'nav' && node.url) {
      const minimizedUrl = node.url.trim().toLowerCase().replace(/\/$/, "");
      if (seenUrls.has(minimizedUrl)) return false;
      seenUrls.add(minimizedUrl);
    } else if (node.type === 'folder') {
      node.children = cleanFolderChildren(node.children);
    }
    return true;
  });
}

function initThemeSystem() {
  chrome.storage.local.get(['userTheme'], (res) => {
    let theme = res.userTheme || 'theme-time';
    if (theme === 'theme-glacier') {
      theme = 'theme-time';
      chrome.storage.local.set({ userTheme: 'theme-time' });
    }
    document.body.className = theme;
    localStorage.setItem('s_tab_theme_fallback', theme);
  });
  document.querySelectorAll('.bg-menu button').forEach(btn => {
    btn.onclick = (e) => {
      const theme = e.target.getAttribute('data-theme');
      document.body.className = theme;
      chrome.storage.local.set({ userTheme: theme });
      localStorage.setItem('s_tab_theme_fallback', theme);
    };
  });
}

const defaultEngines = [
  { id: 'chrome_default', name: '默认', url: 'chrome_default' }, // 🟢 置顶的默认选项
  { id: 'bing', name: 'Bing', url: 'https://www.bing.com/search?q=%s' },
  { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=%s' },
  { id: 'github', name: 'GitHub', url: 'https://github.com/search?q=%s' },
  { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=%s' }
];
let customEngines = [];
let currentEngineId = 'chrome_default'; // 🟢 默认搜索引擎初始化更改

function loadEngineSystem() {
  chrome.storage.local.get(['customEngines', 'lastEngine', 'engineIconSources', 'engineIconBase64Map'], (res) => {
    customEngines = res.customEngines || [];
    currentEngineId = res.lastEngine || 'chrome_default'; // 🟢 后备默认设定更改
    engineIconSources = res.engineIconSources || {};
    engineIconBase64Map = res.engineIconBase64Map || {};
    renderEngineUI();
  });
}

function renderEngineUI() {
  const all = [...defaultEngines, ...customEngines];
const active = all.find(e => e.id === currentEngineId) || defaultEngines[0];

const lbl = document.getElementById('lblCurrentEngine');
if(lbl) {
  // 🟢 动态对准国际化“默认”键值
  const displayName = active.id === 'chrome_default' ? t('engine_default_name', '默认') : active.name;
  lbl.innerText = displayName + " ▾";
}
  
  const img = document.getElementById('currentEngineIcon');
  if(img) {
    if (active.id === 'chrome_default') {
      img.src = DEFAULT_SEARCH_ICON;
      img.removeAttribute('data-url');
      img.removeAttribute('data-engid');
      img.setAttribute('data-base64-processed', 'true');
    } else {
      let activeIdx = engineIconSources[active.id] !== undefined ? engineIconSources[active.id] : 0;
      img.src = engineIconBase64Map[active.id] || getFaviconUrlBySource(active.url, activeIdx);
      img.setAttribute('data-url', active.url);
      img.setAttribute('data-startidx', activeIdx);
      img.setAttribute('data-attempt', '0');
      img.setAttribute('data-engid', active.id);
      if (engineIconBase64Map[active.id]) {
        img.setAttribute('data-base64-processed', 'true');
      } else {
        img.removeAttribute('data-base64-processed');
      }
    }
  }
  
  const menu = document.getElementById('popupEngineMenu');
  if(!menu) return;
  menu.innerHTML = "";
  
  all.forEach(eng => {
        const row = document.createElement('div');
        row.className = "engine-item-row";
        
        let iconSrc = '';
        let opsHtml = '';
        
        if (eng.id === 'chrome_default') {
          iconSrc = DEFAULT_SEARCH_ICON;
          opsHtml = ''; // 🟢 默认引擎不渲染任何修改、删除 or 换图标按钮
        } else {
          let idx = engineIconSources[eng.id] !== undefined ? engineIconSources[eng.id] : 0;
          iconSrc = engineIconBase64Map[eng.id] || getFaviconUrlBySource(eng.url, idx);
          let b64Attr = engineIconBase64Map[eng.id] ? ' data-base64-processed="true"' : '';
          opsHtml = `
            <span class="eng-rotate-icon-btn" data-id="${eng.id}">${t('menu_change_icon', '换图标')}</span>
            &emsp;
            <span class="eng-edit-btn" data-id="${eng.id}">${t('btn_edit', '修改')}</span>
            &emsp;
            <span class="eng-del-btn" data-id="${eng.id}" style="display:${defaultEngines.some(d=>d.id===eng.id)?'none':'inline'}">${t('btn_delete', '删除')}</span>
          `;
        }
        
        // 🟢 解决痛点：判断如果是默认引擎，就自动在语言包中拿“默认”对应的翻译词，否则显示原有用户起的名字。
        const displayName = eng.id === 'chrome_default' ? t('engine_default_name', '默认') : eng.name;
        
        row.innerHTML = `
          <div class="engine-item-left">
            <img src="${iconSrc}" ${eng.id !== 'chrome_default' ? `data-url="${eng.url}" data-startidx="${engineIconSources[eng.id] !== undefined ? engineIconSources[eng.id] : 0}" data-attempt="0" data-engid="${eng.id}"` : ''}>
            <span>${displayName}</span>
          </div>
          <div class="engine-item-ops">${opsHtml}</div>
        `;
    
    row.querySelector('.engine-item-left').onclick = () => {
      currentEngineId = eng.id;
      chrome.storage.local.set({ lastEngine: eng.id }, () => {
        renderEngineUI();
        menu.style.display = "none";
        document.getElementById('searchInput').focus();
      });
    };

    // 🟢 点击换图标事件增加安全判断（if）:
    const rotateBtn = row.querySelector('.eng-rotate-icon-btn');
    if (rotateBtn) {
      rotateBtn.onclick = (e) => {
        e.stopPropagation();
        if (menu) menu.style.display = "none"; // 自动关闭搜索引擎下拉菜单
        let currentIdx = engineIconSources[eng.id] !== undefined ? engineIconSources[eng.id] : 0;
        if (currentIdx === -1) currentIdx = 0;
        openIconSelectorModal('engine', eng.url, { engId: eng.id, currentIdx });
      };
    }
    
    // 🟢 点击修改事件增加安全判断（if）:
    const editBtn = row.querySelector('.eng-edit-btn');
    if (editBtn) {
      editBtn.onclick = (e) => {
        e.stopPropagation();
        menu.style.display = "none";
        evModifyEngine(eng);
      };
    }
    
    const del = row.querySelector('.eng-del-btn');
    if(del) {
      del.onclick = (e) => {
        e.stopPropagation();
        if(confirm(t('confirm_delete', '确认删除吗？') + ` [${eng.name}]`)) {
          customEngines = customEngines.filter(c => c.id !== eng.id);
          if(currentEngineId === eng.id) currentEngineId = 'chrome_default'; // 🟢 默认重置回 chrome_default
          chrome.storage.local.set({ customEngines, lastEngine: currentEngineId }, () => { renderEngineUI(); });
        }
      };
    }
    menu.appendChild(row);
  });
  
  const addBar = document.createElement('div');
  addBar.style.cssText = "padding:10px; text-align:center; font-size:12px; font-weight:700; color:#3b82f6; cursor:pointer; border-top:1px solid rgba(0,0,0,0.04);";
  addBar.innerText = "+ " + t('btn_add_custom_search', '添加自定义搜索');
  addBar.onclick = () => {
    menu.style.display = "none";
    openEngineModal();
  };
  menu.appendChild(addBar);
}

// 🌐 粘性延时自动收起搜索引擎菜单
let engineMenuCloseTimer = null;
const menu = document.getElementById('popupEngineMenu');
const trigger = document.getElementById('lblCurrentEngine');
const iconContainer = document.querySelector('.search-engine-icon-container');

const handleEngineMenuEnter = () => {
  clearTimeout(engineMenuCloseTimer);
};

const handleEngineMenuLeave = () => {
  clearTimeout(engineMenuCloseTimer);
  engineMenuCloseTimer = setTimeout(() => {
    if (menu) menu.style.display = 'none';
  }, 400); // 400ms 未滑入则收起，实现平滑粘性收纳
};

if (menu) {
  menu.addEventListener('mouseenter', handleEngineMenuEnter);
  menu.addEventListener('mouseleave', handleEngineMenuLeave);
}
if (trigger) {
  trigger.addEventListener('mouseenter', handleEngineMenuEnter);
  trigger.addEventListener('mouseleave', handleEngineMenuLeave);
}
if (iconContainer) {
  iconContainer.addEventListener('mouseenter', handleEngineMenuEnter);
  iconContainer.addEventListener('mouseleave', handleEngineMenuLeave);
}

if (trigger) {
  trigger.onclick = (e) => {
    e.stopPropagation();
    if (menu) {
      menu.style.display = menu.style.display === "block" ? "none" : "block";
    }
  };
}

if (document.getElementById('btnSearch')) document.getElementById('btnSearch').onclick = executeSearch;

if (document.getElementById('searchInput')) {
  document.getElementById('searchInput').onkeydown = (e) => { 
    if (e.key === 'Enter') { 
      const sugBox = document.getElementById('searchSuggestions');
      if (sugBox && sugBox.style.display !== 'none' && activeSuggestionIdx >= 0) {
        const items = sugBox.querySelectorAll('.suggestion-item');
        if (items[activeSuggestionIdx]) {
          document.getElementById('searchInput').value = items[activeSuggestionIdx].textContent;
        }
      }
      closeSuggestions();
      executeSearch(); 
    } 
  };
}

if (document.getElementById('btnClearSearchLogs')) {
  document.getElementById('btnClearSearchLogs').onclick = () => {
    const input = document.getElementById('searchInput');
    if (input) { input.value = ""; input.blur(); }
    chrome.storage.local.remove(['mySearchLogs', 'searchHistory'], () => { 
      setTimeout(() => { if (input) input.focus(); }, 30); 
    });
  };
}

function executeSearch() {
  const q = document.getElementById('searchInput').value.trim();
  if(!q) return;
  
  chrome.storage.local.get(['searchHistoryEnabled', 'mySearchLogs'], (res) => {
    const enabled = res.searchHistoryEnabled !== false; 
    if (enabled) {
      let logs = res.mySearchLogs || [];
      logs = logs.filter(item => item !== q);
      logs.unshift(q);
      if (logs.length > 30) logs = logs.slice(0, 30);
      chrome.storage.local.set({ mySearchLogs: logs });
    }
    
    if (typeof closeSuggestions === 'function') closeSuggestions();
    const all = [...defaultEngines, ...customEngines];
    const active = all.find(e => e.id === currentEngineId) || defaultEngines[0];
    
    // 🟢 核心功能拦截：若是默认搜索引擎，调用官方合规 API，如果是其他第三方引擎，则走原有的重定向拼接
    if (active.id === 'chrome_default') {
      chrome.search.query({ text: q, disposition: 'CURRENT_TAB' });
    } else {
      window.location.href = active.url.replace('%s', encodeURIComponent(q));
    }
  });
}

let targetEngineObj = null;
function openEngineModal() {
  targetEngineObj = null;
  document.getElementById('newEngineName').value = "";
  document.getElementById('newEngineUrl').value = "";
  document.getElementById('engineModal').style.display = "flex"; 
}
function evModifyEngine(eng) {
  targetEngineObj = eng;
  document.getElementById('newEngineName').value = eng.name;
  document.getElementById('newEngineUrl').value = eng.url;
  document.getElementById('engineModal').style.display = "flex"; 
}
if (document.getElementById('btnCancelEngineModal')) document.getElementById('btnCancelEngineModal').onclick = () => { document.getElementById('engineModal').style.display = "none"; };
if (document.getElementById('btnConfirmEngineModal')) {
  document.getElementById('btnConfirmEngineModal').onclick = () => {
    const name = document.getElementById('newEngineName').value.trim();
    const url = document.getElementById('newEngineUrl').value.trim();
    if(!name || !url) return alert(t('alert_required_fields', "各项参数必填！"));
    if(!url.includes("%s")) return alert(t('alert_placeholder_s', "链接必须包含 %s 占位符！"));
    
    if(targetEngineObj) {
      if(defaultEngines.some(d => d.id === targetEngineObj.id)) {
        alert(t('alert_native_engine_edit', "内置系统原生引擎不允许修改映射链接，请单独建立自定义项。"));
      } else {
        customEngines.forEach(c => { 
          if(c.id === targetEngineObj.id) { 
            c.name = name; 
            if (c.url !== url) {
              c.url = url; 
              delete engineIconBase64Map[c.id]; 
              chrome.storage.local.set({ engineIconBase64: engineIconBase64Map });
            }
          } 
        });
      }
    } else {
      customEngines.push({ id: 'cust_' + Date.now(), name, url });
    }
    chrome.storage.local.set({ customEngines }, () => {
      document.getElementById('engineModal').style.display = "none";
      loadEngineSystem();
    });
  };
}

function getFaviconUrlBySource(url, sourceIdx) {
  if (sourceIdx === -1) return DEFAULT_EARTH_ICON; 
  let host = "bing.com";
  try { host = new URL(url).hostname; } catch(e){}
  
  const sources = [
    `https://${host}/favicon.ico`, 
    `https://api.iowen.cn/favicon/${host}.png`,                             
    `https://api.vvhan.com/api/ico?url=${host}`,                            
    `https://api.uomg.com/api/get.favicon?url=${encodeURIComponent(url)}`,  
    `https://icons.duckduckgo.com/ip3/${host}.ico`,                         
    `https://www.google.com/s2/favicons?sz=64&domain=${host}`, 
    `https://api.faviconkit.com/${host}/24`,
    `https://favicon.im/${host}`,
    `https://api.faviconkit.com/${host}/64`,
    `https://api.statvoo.com/favicon/?url=${host}`,
    `https://t0.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=https://${host}&size=64`,
    `https://favicon.yandex.net/favicon/${host}`,
    `https://logo.clearbit.com/${host}`,
    `https://getfavicon.appspot.com/${host}`,
    `https://api.byi.pw/favicon/?url=${host}`,
    `https://tool.oschina.net/action/favicon/get?domain=${host}`,
    `https://ui-avatars.com/api/?name=${host.charAt(0).toUpperCase()}&background=random&color=fff&size=64`,
    `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=128`
  ];
  return sources[sourceIdx % 18] || sources[0]; 
}

async function rotateNavIcon(realIdx) {
  const all = await getSites();
  if (all[realIdx]) {
    openIconSelectorModal('main', all[realIdx].url, { realIdx, currentIdx: all[realIdx].iconSourceIdx });
  }
}

// ⭐ 新增：动态维护文件夹卡片高亮状态的同步函数
function updateFolderHighlightStates() {
  const grid = document.getElementById('navGrid');
  if (!grid) return;
  grid.querySelectorAll('.site').forEach(el => {
    const folderId = el.getAttribute('data-id');
    if (folderId && (folderId === leftPanelFolderId || folderId === rightPanelFolderId)) {
      el.classList.add('is-active-folder');
    } else {
      el.classList.remove('is-active-folder');
    }
  });
}
let globalSortableNavInstance = null;
let flyoutHoverTimer = null;
let closeFlyoutTimer = null;
let activeFlyoutChain = [];

// ⭐ 重构主渲染机制：加载独立的 s_tab_icon_cache 哈希表，彻底解决 images 回写无限循环导致的 icons 频繁抖动
async function renderNavGridUI() {
  const grid = document.getElementById('navGrid');
  if(!grid) return;
  
  const renderId = ++currentRenderId; // 自增渲染 ID
  const all = await getSites();
  if (renderId !== currentRenderId) return; // 丢弃过期渲染
  
  chrome.storage.local.get(['s_tab_icon_cache'], (cacheRes) => {
    if (renderId !== currentRenderId) return; // 丢弃过期渲染
    grid.innerHTML = ""; // 原子清空
    
    const sTabIconCache = cacheRes.s_tab_icon_cache || {};
    let uncategorizedFolder = all.find(s => s.id === "folder_uncategorized") || { id: "folder_uncategorized", type: "folder", name: "未分类", children: [] };
    let coreList = all.filter(s => s.id !== "folder_uncategorized");

    const navFrag = document.createDocumentFragment();

    coreList.forEach((nav, idx) => {
      const el = document.createElement('div');
      el.className = "site";
      el.setAttribute('data-id', nav.id); 
      el.setAttribute('title', nav.name);
      
      const realIndexInAll = all.indexOf(nav);
      
      let bodyContentHTML = '';
      if (nav.type === 'folder') {
        el.classList.add('is-folder');
        let thumbImgs = '';
        
        const isHiddenThumbs = nav.isEncrypted && (nav.hideThumbnails !== false);
        if (isHiddenThumbs) {
          for (let i = 0; i < 4; i++) {
            thumbImgs += `<span></span>`;
          }
        } else {
          let childrenToDraw = (nav.children || []).slice(0, 4);
          for (let i = 0; i < 4; i++) {
            if (childrenToDraw[i]) {
              const cachedChildIcon = sTabIconCache[childrenToDraw[i].url];
              let cSrc = (cachedChildIcon && cachedChildIcon.icon) ? cachedChildIcon.icon : (childrenToDraw[i].localIconBase64 || getFaviconUrlBySource(childrenToDraw[i].url, childrenToDraw[i].iconSourceIdx || 0));
              thumbImgs += `<img src="${cSrc}">`;
            } else {
              thumbImgs += `<span></span>`;
            }
          }
        }
        // ⭐ 加密视觉提示：加密文件夹展现锁头 🔒，未加密文件夹展现文件夹 📁 徽章，完美取代 display:none 使其保持可见以便点击解密
        const badgeEmoji = nav.isEncrypted ? '🔒' : '📁';
        bodyContentHTML = `<div class="folder-thumb-grid">${thumbImgs}</div><div class="folder-corner-badge">${badgeEmoji}</div>`;
      } else {
        const cachedIconObj = sTabIconCache[nav.url];
        const src = (cachedIconObj && cachedIconObj.icon) ? cachedIconObj.icon : (nav.localIconBase64 || getFaviconUrlBySource(nav.url, nav.iconSourceIdx !== undefined ? nav.iconSourceIdx : 0));
        const b64Attr = (cachedIconObj || nav.localIconBase64) ? ' data-base64-processed="true"' : '';
        bodyContentHTML = `<img src="${src}" data-url="${nav.url}" data-startidx="${nav.iconSourceIdx !== undefined ? nav.iconSourceIdx : 0}" data-attempt="0" data-realindex="${realIndexInAll}"${b64Attr}>`;
      }
      
      el.innerHTML = `
        <div class="card-body" style="cursor:pointer;">
          <div class="drag-handle-4dots" title="${t('drag_handle_title', '按住拖拽排序')}">
            <span></span><span></span><span></span><span></span>
          </div>
          ${bodyContentHTML}
          <div class="more-actions-3dots" title="${t('more_actions_title', '更多操作')}">
            <span></span><span></span><span></span>
          </div>
        </div>
        <div class="site-title-text">${nav.name}</div>
      `;
      
      el.querySelector('.card-body').onclick = (e) => {
        if(e.target.closest('.drag-handle-4dots') || e.target.closest('.more-actions-3dots')) return;
        if (nav.type === 'folder') {
          tryOpenEncryptedFolder(nav.id, () => {
            el.removeAttribute('style');
            openFolderPanel(nav.id); 
          });
        } else {
          handleWebpageCardClick(e, nav.url);
        }
      };
      
      bind3DotsMenuEvent(el.querySelector('.more-actions-3dots'), nav, realIndexInAll);
      
      el.oncontextmenu = (e) => {
        e.preventDefault();
        let contextItems = [];
        if (nav.type === 'folder') {
          const isEncrypted = !!nav.isEncrypted;
          const lockLabel = isEncrypted ? t('menu_del_pwd', "🔒 删除密码") : t('menu_add_pwd', "🔓 进行加密");
          contextItems = [
            { text: t('menu_edit_folder_name', "修改文件夹名称"), action: () => tryOpenEncryptedFolder(nav.id, () => { el.removeAttribute('style'); triggerEditSiteModal('folder', nav, realIndexInAll); }) },
            { text: lockLabel, action: () => toggleFolderEncryptionState(nav.id) },
            { text: t('menu_del_folder', "删除文件夹"), action: () => tryOpenEncryptedFolder(nav.id, () => evDeleteNavDirectly(realIndexInAll)) }
          ];
        } else {
          contextItems = [
            { text: t('menu_change_icon', "🔄 换图标 (轮切)"), action: () => rotateNavIcon(realIndexInAll) },
            { text: t('menu_edit_nav', "修改导航"), action: () => triggerEditSiteModal('nav', nav, realIndexInAll) },
            { text: t('menu_del_nav', "删除导航"), action: () => evDeleteNavDirectly(realIndexInAll) }
          ];
        }
        openContextMenu(e, contextItems);
      };
      navFrag.appendChild(el);
    });

    const unCatEl = document.createElement('div');
        unCatEl.className = "site is-folder"; 
        unCatEl.setAttribute('data-id', "folder_uncategorized");
        unCatEl.setAttribute('title', t('uncategorized', uncategorizedFolder.name));
        
        // 🟢 重新补回先前被误删的缩略图生成核心循环，消除 Reference 错误
        let unCatThumbImgs = '';
        let unCatChildren = (uncategorizedFolder.children || []).slice(0, 4);
        for (let i = 0; i < 4; i++) {
          if (unCatChildren[i]) {
            const cachedUncatIcon = sTabIconCache[unCatChildren[i].url];
            let cSrc = (cachedUncatIcon && cachedUncatIcon.icon) ? cachedUncatIcon.icon : (unCatChildren[i].localIconBase64 || getFaviconUrlBySource(uncategorizedFolder.url, unCatChildren[i].iconSourceIdx || 0));
            unCatThumbImgs += `<img src="${cSrc}">`;
          } else {
            unCatThumbImgs += `<span></span>`;
          }
        }
        
        unCatEl.innerHTML = `
          <div class="card-body" style="cursor:pointer;">
            <div class="folder-thumb-grid">${unCatThumbImgs}</div>
            <div class="folder-corner-badge">📁</div>
          </div>
          <div class="site-title-text">${t('uncategorized', uncategorizedFolder.name)}</div>
        `;
    unCatEl.querySelector('.card-body').onclick = () => {
      tryOpenEncryptedFolder("folder_uncategorized", () => { openFolderPanel("folder_uncategorized"); });
    };
    unCatEl.oncontextmenu = (e) => { e.preventDefault(); return false; };
    navFrag.appendChild(unCatEl);

    const addFolderBtn = document.createElement('div');
    addFolderBtn.className = "site is-folder"; 
    addFolderBtn.id = "btnTemplateAddFolderCard";
    addFolderBtn.innerHTML = `
      <div class="card-body" style="border: 1.2px dashed #facc15 !important; background: #ffffff !important; box-shadow: none; cursor: pointer; position: relative;">
        <span style="font-size:22px; color:#94a3b8; font-weight:300;">＋</span>
        <div class="folder-corner-badge">📁</div>
      </div>
      <div class="site-title-text" style="color:#94a3b8;">${t('new_folder', '新建文件夹')}</div>
    `;
    
    addFolderBtn.onclick = async () => {
      const leftPanel = document.getElementById('folderPanelLeft');
      const rightPanel = document.getElementById('folderPanelRight');
      
      if (leftPanel && leftPanel.style.display === 'flex' && leftPanelFolderId && leftPanelFolderId.startsWith('folder_temp_')) {
        const input = leftPanel.querySelector('.folder-name-input');
        if (input && !input.value.trim()) {
          alert("⚠️ " + t('err_empty_name', '文件夹名称不能为空！'));
          setTimeout(() => input.focus(), 50);
          return;
        }
      }
      if (rightPanel && rightPanel.style.display === 'flex' && rightPanelFolderId && rightPanelFolderId.startsWith('folder_temp_')) {
        const input = rightPanel.querySelector('.folder-name-input');
        if (input && !input.value.trim()) {
          alert("⚠️ " + t('err_empty_name', '文件夹名称不能为空！'));
          setTimeout(() => input.focus(), 50);
          return;
        }
      }

      const freshAll = await getSites();
      const newFolderId = "folder_temp_" + Date.now();
      const newFolder = { id: newFolderId, type: "folder", name: "", children: [], u: Date.now() + localSkew };
      const unCatIndex = freshAll.findIndex(s => s.id === "folder_uncategorized");
      if (unCatIndex !== -1) freshAll.splice(unCatIndex, 0, newFolder);
      else freshAll.push(newFolder);
      await saveSites(freshAll);
      await renderNavGridUI();
      openFolderPanel(newFolderId, true); 
    };
    navFrag.appendChild(addFolderBtn);

    const addBtn = document.createElement('div');
    addBtn.className = "site";
    addBtn.id = "btnTemplateAddNavCard";
    addBtn.innerHTML = `
      <div class="card-body" style="border:2px dashed rgba(0,0,0,0.12); background:transparent; box-shadow:none; cursor:pointer;">
        <span style="font-size:22px; color:#94a3b8; font-weight:300;">＋</span>
      </div>
      <div class="site-title-text" style="color:#94a3b8;">${t('add_nav_btn', '添加网址')}</div>`;
    addBtn.onclick = () => triggerEditSiteModal('nav', null, -1);
    navFrag.appendChild(addBtn);
    
    grid.appendChild(navFrag);
    updateFolderHighlightStates(); // ⭐ 新增：网格动态渲染完成后立即维护高亮状态
  });
  
  if(!globalSortableNavInstance) {
    globalSortableNavInstance = Sortable.create(grid, {
      animation: 200,
      group: { name: "s-tabs-group" },
      handle: ".drag-handle-4dots",
      ghostClass: "sortable-chosen", 
      filter: function(e, t, n) { return t.id === "btnTemplateAddNavCard" || t.id === 'btnTemplateAddFolderCard' || t.getAttribute('data-id') === 'folder_uncategorized'; },
      preventOnFilter: false,
      onEnd: async function(evt) {
        await commitCrossDragDataToStorage();
        triggerSyncUploadDebounced(); 
      }
    });
  }
}

// ⭐ 重构：支持极速双向对齐的右上角三点菜单事件分流引擎，解决内层删除及重命名和换图标失效问题
function bind3DotsMenuEvent(dotBtn, nav, realIndexInAll, parentFolderId = null) {
  if (!dotBtn) return;
  
  const getActionLabel = (actionKey) => {
    if (actionKey === 'change_icon') {
      return t('menu_change_icon', '换图标');
    }
    if (actionKey === 'rename') {
      return t('btn_rename', '重命名');
    }
    if (actionKey === 'delete') {
      return t('btn_delete', '删除');
    }
    return '';
  };

  dotBtn.onmouseenter = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (isContextMenuActive) return; 
    clearTimeout(flyoutHoverTimer);
    flyoutHoverTimer = setTimeout(() => {
      closeRightSideFlyout();
      const flyout = document.createElement('div');
      flyout.className = "s-cascading-flyout";
      flyout.style.width = "140px";
      
      const rect = dotBtn.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
      flyout.style.top = `${rect.bottom + scrollTop + 4}px`;
      flyout.style.left = `${rect.left + scrollLeft - 110}px`; 

      let actions = [];
      if (nav.type === 'folder') {
        const isEncrypted = !!nav.isEncrypted;
        actions.push({
          text: t('menu_edit_folder_name', '重命名文件夹'),
          click: () => {
            tryOpenEncryptedFolder(nav.id, () => {
              triggerEditSiteModal('folder', nav, realIndexInAll);
            });
          }
        });
        actions.push({
          text: isEncrypted ? t('menu_del_pwd', '🔒 取消加密') : t('menu_add_pwd', '🔓 加密文件夹'),
          click: () => {
            toggleFolderEncryptionState(nav.id);
          }
        });
        actions.push({
          text: t('menu_del_folder', '删除文件夹'),
          click: () => {
            tryOpenEncryptedFolder(nav.id, () => {
              if (confirm(t('confirm_delete', '确定要删除吗？'))) {
                getSites().then(async (all) => {
                  const nowTime = Date.now() + localSkew;
                  const folderNode = all[realIndexInAll];
                  if (folderNode) {
                    chrome.storage.local.get(['deletedIds'], async (res) => {
                      const deleted = res.deletedIds || {};
                      deleted[folderNode.id] = nowTime;
                      if (folderNode.children) {
                        folderNode.children.forEach(c => { deleted[c.id] = nowTime; });
                      }
                      all.splice(realIndexInAll, 1);
                      chrome.storage.local.set({ deletedIds: deleted }, async () => {
                        await saveSites(all);
                        renderNavGridUI();
                        if (leftPanelFolderId === folderNode.id) {
                          document.getElementById('folderPanelLeft').style.display = 'none';
                          leftPanelFolderId = null;
                        }
                        if (rightPanelFolderId === folderNode.id) {
                          document.getElementById('folderPanelRight').style.display = 'none';
                          rightPanelFolderId = null;
                        }
                        triggerSyncUploadDebounced();
                      });
                    });
                  }
                });
              }
            });
          }
        });
      } else {
        if (parentFolderId) {
          actions.push({
            text: getActionLabel('change_icon'),
            click: () => rotateNestedChildIcon(parentFolderId, nav.id)
          });
          actions.push({
            text: getActionLabel('rename'),
            click: () => triggerEditNestedChildModal(parentFolderId, nav.id)
          });
          actions.push({
            text: getActionLabel('delete'),
            click: () => evDeleteNestedNavDirectly(parentFolderId, nav.id)
          });
        } else {
          actions.push({
            text: getActionLabel('change_icon'),
            click: () => rotateNavIcon(realIndexInAll)
          });
          actions.push({
            text: getActionLabel('rename'),
            click: () => triggerEditSiteModal('nav', nav, realIndexInAll)
          });
          actions.push({
            text: getActionLabel('delete'),
            click: () => evDeleteNavDirectly(realIndexInAll)
          });
        }
      }

      actions.forEach(item => {
        const btn = document.createElement('button');
        btn.innerText = item.text;
        btn.onclick = (e) => {
          e.stopPropagation();
          closeRightSideFlyout();
          item.click();
        };
        flyout.appendChild(btn);
      });

      flyout.onmouseenter = () => { clearTimeout(closeFlyoutTimer); };
      flyout.onmouseleave = () => {
        clearTimeout(closeFlyoutTimer);
        closeFlyoutTimer = setTimeout(closeRightSideFlyout, 400);
      };

      document.body.appendChild(flyout); 
      activeFlyoutChain.push(flyout);
    }, 150);
  };
  
  dotBtn.onmouseleave = () => {
    clearTimeout(flyoutHoverTimer);
    clearTimeout(closeFlyoutTimer);
    closeFlyoutTimer = setTimeout(closeRightSideFlyout, 400);
  };
}

async function evDeleteNavDirectly(realIndex) {
  if (confirm(t('confirm_delete', "确认删除该项目？"))) {
    const all = await getSites();
    const node = all[realIndex];
    if (node) {
      const nowTime = Date.now() + localSkew;
      chrome.storage.local.get(['deletedIds'], async (res) => {
        const deleted = res.deletedIds || {};
        deleted[node.id] = nowTime;
        
        if (node.type === 'folder' && node.children) {
          node.children.forEach(c => {
            deleted[c.id] = nowTime;
          });
        }
        
        all.splice(realIndex, 1);
        chrome.storage.local.set({ deletedIds: deleted }, async () => {
          await saveSites(all);
          renderNavGridUI();
          triggerSyncUploadDebounced();
        });
      });
    }
  }
}

async function evDeleteNestedNavDirectly(folderId, childId) {
  if (confirm(t('confirm_delete', "确认删除该项目？"))) {
    const all = await getSites();
    let folder = all.find(s => s.id === folderId) || (folderId === 'folder_uncategorized' ? all.find(s => s.id === "folder_uncategorized") : null);
    if (folder && folder.children) {
      const cIdx = folder.children.findIndex(c => c.id === childId);
      if (cIdx !== -1) {
        const nowTime = Date.now() + localSkew;
        chrome.storage.local.get(['deletedIds'], async (res) => {
          const deleted = res.deletedIds || {};
          deleted[childId] = nowTime;
          
          folder.children.splice(cIdx, 1);
          folder.u = nowTime;
          
          chrome.storage.local.set({ deletedIds: deleted }, async () => {
            await saveSites(all);
            renderNavGridUI();
            refreshOpenedFolderPanels();
            triggerSyncUploadDebounced();
          });
        });
      }
    }
  }
}

function closeRightSideFlyout() {
  activeFlyoutChain.forEach(f => f.remove());
  activeFlyoutChain = [];
}

function openContextMenu(e, items) {
  closeRightSideFlyout();
  isContextMenuActive = true; 
  const menu = document.getElementById('universalContextMenu');
  if (!menu) return;
  menu.innerHTML = '';
  items.forEach(item => {
    const btn = document.createElement('button');
    btn.textContent = item.text;
    btn.onclick = (event) => {
      event.stopPropagation();
      menu.style.display = 'none';
      isContextMenuActive = false; 
      item.action();
    };
    menu.appendChild(btn);
  });
  menu.style.left = `${e.clientX}px`;
  menu.style.top = `${e.clientY}px`;
  menu.style.display = 'block';
}

let globalCurrentEditIndex = -1;
let globalCurrentEditType = 'nav';

function triggerEditSiteModal(type, obj, realIdx) {
  globalCurrentEditType = type;
  globalCurrentEditIndex = realIdx;
  document.getElementById('modalTitle').innerText = (type === 'folder') ? t('modal_edit_title', "修改属性") : (obj ? t('modal_edit_title', "修改基础属性") : t('menu_import_data', "添加新导航"));
  document.getElementById('modalName').value = obj ? obj.name : "";
  document.getElementById('modalUrl').value = obj ? obj.url : "";
  if (type === 'bookmark' || type === 'folder') document.getElementById('modalUrlField').style.display = "none";
  else document.getElementById('modalUrlField').style.display = "block";
  document.getElementById('siteModal').style.display = "flex";
}

document.addEventListener('click', (e) => {
  const menu = document.getElementById('universalContextMenu');
  if (menu) {
    menu.style.display = 'none';
    isContextMenuActive = false; 
  }
  if (!e.target.closest('.more-actions-3dots') && !e.target.closest('.s-cascading-flyout')) {
    closeRightSideFlyout();
  }
});

const blockerModalEnter = (e) => { if (e.key === 'Enter') { const btn = document.getElementById('btnConfirmModal'); if (btn) btn.click(); } };
if (document.getElementById('modalName')) document.getElementById('modalName').onkeydown = blockerModalEnter;
if (document.getElementById('modalUrl')) document.getElementById('modalUrl').onkeydown = blockerModalEnter;
if (document.getElementById('btnCloseModal')) document.getElementById('btnCloseModal').onclick = () => { document.getElementById('siteModal').style.display = "none"; };

async function handleSiteModalConfirm() {
  const name = document.getElementById('modalName').value.trim();
  let url = document.getElementById('modalUrl').value.trim();
  
  if(!name) return alert("⚠️ " + t('alert_empty', "名称和网址不得为空！"));
if(globalCurrentEditType === 'nav' && !url) return alert("⚠️ " + t('alert_empty', "名称和网址不得为空！"));
  if(url && !url.startsWith('http') && !url.startsWith('chrome')) url = "https://" + url;

  const all = await getSites();
  const calibratedTimestamp = Date.now() + localSkew;

  if (globalCurrentEditType === 'folder') {
    let isNameExists = all.some((s, idx) => s.type === 'folder' && idx !== globalCurrentEditIndex && s.name.trim().toLowerCase() === name.toLowerCase());
    if (isNameExists) {
      alert(`⚠️ ` + t('err_dup_name', "发现已存在同名文件夹 [") + `${name}` + t('err_dup_suffix', "]，请换个名字！"));
      return;
    }
  }

  if (url && globalCurrentEditType === 'nav') {
    const minUrl = url.trim().toLowerCase().replace(/\/$/, "");
    let isDuplicate = all.some((s, idx) => {
      if (idx === globalCurrentEditIndex) return false;
      if (s.type === 'nav' && s.url && s.url.trim().toLowerCase().replace(/\/$/, "") === minUrl) return true;
      if (s.type === 'folder' && s.children) {
        return s.children.some(c => c.url && c.url.trim().toLowerCase().replace(/\/$/, "") === minUrl);
      }
      return false;
    });
    if (isDuplicate) {
      alert("💡 " + t('toast_dup', "提示：该网址已存在，请勿重复建立。"));
      return;
    }
  }

  if (globalCurrentEditIndex === -1) {
    const newSite = {
      id: "id_" + Math.random().toString(36).substring(2, 11),
      type: 'nav', name: name, url: url, iconSourceIdx: 0,
      u: calibratedTimestamp 
    };
    all.push(newSite);
  } 
  else if (all[globalCurrentEditIndex]) {
    all[globalCurrentEditIndex].name = name;
    all[globalCurrentEditIndex].u = calibratedTimestamp; 
    if (globalCurrentEditType === 'nav') {
      if (all[globalCurrentEditIndex].url !== url) {
        all[globalCurrentEditIndex].url = url;
        delete all[globalCurrentEditIndex].localIconBase64;
      }
    }
  }

  await saveSites(all);
  document.getElementById('siteModal').style.display = "none";
  renderNavGridUI();
  if (typeof refreshOpenedFolderPanels === 'function') refreshOpenedFolderPanels();
  triggerSyncUploadDebounced(); 
}

if (document.getElementById('btnConfirmModal')) {
  document.getElementById('btnConfirmModal').onclick = handleSiteModalConfirm;
}

function triggerDownloadJson(data, fileName) {
  const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
  const dl = document.createElement('a'); dl.setAttribute("href", str); dl.setAttribute("download", fileName);
  document.body.appendChild(dl); dl.click(); dl.remove();
}

function showDynamicBlurAlert(message, onConfirm, onCancel, titleText, confirmBtnText, cancelBtnText, showIcon = "⚠️", specifiedZIndex = 100010) {
  titleText = titleText || t('alert_sync_transfer_title', "同步传输提示");
  confirmBtnText = confirmBtnText || t('btn_confirm_close', "关闭");
  cancelBtnText = cancelBtnText || t('btn_cancel', "取消");
  
  const existingAlert = document.getElementById('s-dynamic-blur-alert');
  if (existingAlert) existingAlert.remove();

  const mask = document.createElement('div');
  mask.id = 's-dynamic-blur-alert';
  mask.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw!important; height: 100vh!important; background: rgba(15, 23, 42, 0.45); display: flex; align-items: center; justify-content: center; z-index: ${specifiedZIndex};`;

  const box = document.createElement('div');
  box.style.cssText = `background: rgba(255, 255, 255, 0.98); border-radius: 20px; width: 480px; height: 530px; padding: 24px 28px; box-shadow: 0 12px 36px rgba(15, 23, 42, 0.12); border: 1px solid rgba(0, 0, 0, 0.08) !important; position: relative; display: flex; flex-direction: column; overflow: hidden;`;

  const bodyWrap = document.createElement('div');
  bodyWrap.style.cssText = "flex: 1; overflow-y: auto; text-align: left;";
  
  const title = document.createElement('h3');
  title.style.cssText = "font-size: 16px; font-weight: 800; color: #1e293b; margin-top: 0; margin-bottom: 14px; display: flex; align-items: center; gap: 8px;";
  title.innerHTML = `<span style="font-size: 18px;">${showIcon}</span><span>${titleText}</span>`;
  
  const content = document.createElement('p');
  content.style.cssText = "font-size: 13.5px; color: #334155; line-height: 1.6; font-weight: 600; margin: 0;";
  content.innerHTML = message;

  bodyWrap.appendChild(title);
  bodyWrap.appendChild(content);

  const footer = document.createElement('div');
  footer.style.cssText = "display: flex; justify-content: flex-end; gap: 10px; margin-top: 14px; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.04); flex-shrink: 0;";
  
  const cancelBtn = document.createElement('button');
  cancelBtn.style.cssText = "padding: 9px 16px; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 12.5px; background: #f1f5f9; color: #475569;";
  cancelBtn.innerText = cancelBtnText;
  
  const confirmBtn = document.createElement('button');
  confirmBtn.style.cssText = "padding: 9px 16px; border: none; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 12.5px; background: #3b82f6; color: #fff;";
  confirmBtn.innerText = confirmBtnText;

  footer.appendChild(cancelBtn);
  footer.appendChild(confirmBtn);

  box.appendChild(bodyWrap);
  box.appendChild(footer);
  mask.appendChild(box);
  document.body.appendChild(mask);

  cancelBtn.onclick = () => { mask.remove(); if (typeof onCancel === 'function') onCancel(); };
  confirmBtn.onclick = () => { mask.remove(); if (typeof onConfirm === 'function') onConfirm(); };
}

if (document.getElementById('btnResetAllData')) {
  document.getElementById('btnResetAllData').onclick = () => {
    chrome.storage.local.get(['globalSuperPassword', 'globalGesturePassword'], (pwdCheck) => {
      const isPwdConfigured = !!pwdCheck.globalSuperPassword && !!pwdCheck.globalGesturePassword;
      const showResetWarningModal = () => {
        openResetWarningModal();
      };

      if (isPwdConfigured) {
        triggerUnifiedVerify(t('verify_subtitle', "输入已设置的手势密码或字符密码"), () => {
          showResetWarningModal();
        });
      } else {
        showResetWarningModal();
      }
    });
  };
}

if (document.getElementById('btnManageExt')) {
  document.getElementById('btnManageExt').onclick = () => {
    chrome.runtime.sendMessage({ action: "openExtensionsPage" });
  };
}

if (document.getElementById('btnCloseAboutModal')) {
  document.getElementById('btnCloseAboutModal').onclick = () => {
    document.getElementById('aboutModal').style.display = 'none';
  };
}
if (document.getElementById('btnCloseAboutModalOk')) {
  document.getElementById('btnCloseAboutModalOk').onclick = () => {
    document.getElementById('aboutModal').style.display = 'none';
  };
}
if (document.getElementById('btnOpenAboutModal')) {
  document.getElementById('btnOpenAboutModal').onclick = () => {
    document.getElementById('aboutModal').style.display = 'flex';
  };
}

if (document.getElementById('btnShowReward')) {
  document.getElementById('btnShowReward').onclick = () => {
    const container = document.getElementById('rewardContainer');
    if (container) {
      container.innerHTML = `
        <div style="background:#fff; padding:10px; border-radius:12px; border:1px solid rgba(0,0,0,0.06); box-shadow:0 4px 16px rgba(0,0,0,0.05);">
          <img src="reward.png" style="width:180px; height:180px; display:block;" alt="WeChat Pay">
        </div>
      `;
    }
  };
}

function switchMemFireView(view) {
  const syncModal = document.getElementById('syncModal');
  const regModal = document.getElementById('sbRegisterModal');
  
  if (view === 'register') {
    if (syncModal) syncModal.style.display = 'none';
    if (regModal) regModal.style.display = 'flex';
  } else {
    if (regModal) regModal.style.display = 'none';
    if (syncModal) {
      syncModal.style.display = 'flex';
      switchSyncTab('browser');
    }
  }
}

function switchSyncTab(tab) {
  activeSyncTab = tab;
  chrome.storage.local.set({ activeSyncTab: tab });
  
  const m = document.getElementById('syncModal');
  if (!m) return;
  
  const footLinks = document.getElementById('footerLinksContainer');
  const btnAction = document.getElementById('btnConfirmSyncModal');
  const exitBtn = document.getElementById('btnExitLoggedInModal');
  const saveCloseBtn = document.getElementById('btnSaveAndCloseModal');
  
  if (footLinks) footLinks.style.display = 'flex';
  if (btnAction) btnAction.style.display = 'block';
  if (exitBtn) exitBtn.style.display = 'none';
  if (saveCloseBtn) saveCloseBtn.style.display = 'none';
  
  const lnkReg = document.getElementById('lnkGoToRegister');
  if (lnkReg) lnkReg.style.display = 'none';
  
  if (tab === 'browser') {
    m.className = "active-tab-browser";
    if (lnkReg) lnkReg.style.display = 'inline';
    
    if (cachedSyncBrowserConfig && cachedSyncBrowserConfig.browserLoggedIn) {
      document.getElementById('browserLoggedInView').style.display = "block";
      document.getElementById('browserLoggedOutView').style.display = "none";
      document.getElementById('infoBrowserUser').innerText = cachedSyncBrowserConfig.email || "";
      document.getElementById('syncBrowserEnableLoggedIn').checked = cachedSyncBrowserConfig.autoEnable !== false;
      
      if (btnAction) btnAction.style.display = 'none';
      if (exitBtn) exitBtn.style.display = 'block';
      if (saveCloseBtn) saveCloseBtn.style.display = 'block';
      if (lnkReg) lnkReg.style.display = 'none';
    } else {
      document.getElementById('browserLoggedInView').style.display = "none";
      document.getElementById('browserLoggedOutView').style.display = "block";
    }
  } else if (tab === 'nas') {
    m.className = "active-tab-nas";
    if (cachedSyncNasConfig && cachedSyncNasConfig.nasLoggedIn) {
      document.getElementById('nasLoggedInView').style.display = "block";
      document.getElementById('nasLoggedOutView').style.display = "none";
      document.getElementById('infoNasUrl').innerText = cleanAndBuildWebdavUrl(cachedSyncNasConfig.nasAddress, cachedSyncNasConfig.nasPort, cachedSyncNasConfig.nasPath, 'nas');
      document.getElementById('infoNasUser').innerText = cachedSyncNasConfig.username || "";
      document.getElementById('syncNasEnableLoggedIn').checked = cachedSyncNasConfig.autoEnable !== false;
      
      if (btnAction) btnAction.style.display = 'none';
      if (exitBtn) exitBtn.style.display = 'block';
      if (saveCloseBtn) saveCloseBtn.style.display = 'block';
    } else {
      document.getElementById('nasLoggedInView').style.display = "none";
      document.getElementById('nasLoggedOutView').style.display = "block";
    }
  } else {
    m.className = "active-tab-webdav";
    if (cachedSyncWebdavConfig && cachedSyncWebdavConfig.webdavLoggedIn) {
      document.getElementById('webdavLoggedInView').style.display = "block";
      document.getElementById('webdavLoggedOutView').style.display = "none";
      document.getElementById('infoWebdavUrl').innerText = cleanAndBuildWebdavUrl(cachedSyncWebdavConfig.url, '', '', 'webdav');
      document.getElementById('infoWebdavUser').innerText = cachedSyncWebdavConfig.username || "";
      document.getElementById('syncWebdavEnableLoggedIn').checked = cachedSyncWebdavConfig.autoEnable !== false;
      
      if (btnAction) btnAction.style.display = 'none';
      if (exitBtn) exitBtn.style.display = 'block';
      if (saveCloseBtn) saveCloseBtn.style.display = 'block';
    } else {
      document.getElementById('webdavLoggedInView').style.display = "none";
      document.getElementById('webdavLoggedOutView').style.display = "block";
    }
  }
}

// ⭐ 精准修正：登录成功后 autoEnable 默认置为 true。
async function handleLegacyLoginAction() {
  const btnConfirm = document.getElementById('btnConfirmSyncModal');
  btnConfirm.disabled = true; btnConfirm.innerText = t('status_connecting_wait', '正在连接...');

  const status = document.getElementById('syncStatusMsg'); 
  if (status) status.innerText = '';

  if (activeSyncTab === 'browser') {
    const email = document.getElementById('syncSupabaseEmail').value.trim();
    const passMf = document.getElementById('syncSupabasePassword').value.trim();
    try {
      const loginRes = await supabaseBypassAuthStub(email, passMf);
      if (loginRes.success) {
        const nextBConfig = { autoEnable: true, browserLoggedIn: true, email: email, password: passMf, token: loginRes.token };
        cachedSyncBrowserConfig = nextBConfig;
        sessionStorage.setItem('justLoggedIn', 'true'); 
        chrome.storage.local.set({ syncBrowserConfig: nextBConfig }, () => {
          reloadPageWithModalRestored(); 
        });
      } else { alert(t('status_login_failed', '登录失败: ') + loginRes.message); btnConfirm.disabled = false; btnConfirm.innerText = t('btn_login_submit', '登 录'); }
    } catch(err) { alert(t('status_connect_error', '无法连接至云同步服务器。')); btnConfirm.disabled = false; btnConfirm.innerText = t('btn_login_submit', '登 录'); }
  } else if (activeSyncTab === 'nas') {
    const address = document.getElementById('syncNasAddress').value.trim();
    const port = document.getElementById('syncNasPort').value.trim();
    const path = document.getElementById('syncNasPath').value.trim();
    const username = document.getElementById('syncNasUsername').value.trim();
    const password = document.getElementById('syncNasPassword').value.trim();

    if (!address || !username || !password) {
      alert(t('alert_required_nas', "请完整填写必填参数（服务器地址、账户名、密码）"));
      btnConfirm.disabled = false; btnConfirm.innerText = t('btn_login_submit', '登 录');
      return;
    }

    const folderUrl = cleanAndBuildWebdavUrl(address, port, path, 'nas');
    try {
      const response = await webdavRequest(folderUrl, 'MKCOL', username, password);
      if (response.status === 201 || response.status === 405) {
        const nextNConfig = { nasAddress: address, nasPort: port, nasPath: path, username, password, autoEnable: true, nasLoggedIn: true };
        cachedSyncNasConfig = nextNConfig;
        sessionStorage.setItem('justLoggedIn', 'true');
        chrome.storage.local.set({ syncNasConfig: nextNConfig }, () => { 
          reloadPageWithModalRestored();
        });
      } else {
        if (status) { status.innerText = '❌ ' + t('err_nas_auth', 'NAS 认证失败，请核对用户名 and 密码。'); status.style.color = '#ef4444'; }
        btnConfirm.disabled = false; btnConfirm.innerText = t('btn_login_submit', '登 录');
      }
    } catch (err) {
      processWebdavConnectionError(err, folderUrl, status, btnConfirm);
    }
  } else {
    const provider = document.getElementById('webdavProviderSelect').value;
    const rawUrl = document.getElementById('syncWebdavUrl').value.trim();
    const username = document.getElementById('syncWebdavUsername').value.trim();
    const password = document.getElementById('syncWebdavPassword').value.trim();

    if (!username || !password) {
      alert(t('alert_required_webdav', "请输入网盘账户名以及应用授权密码"));
      btnConfirm.disabled = false; btnConfirm.innerText = t('btn_login_submit', '登 录');
      return;
    }

    const folderUrl = cleanAndBuildWebdavUrl(rawUrl, '', '', 'webdav');
    try {
      const response = await webdavRequest(folderUrl, 'MKCOL', username, password);
      if (response.status === 201 || response.status === 405) {
        const nextWConfig = { provider, url: rawUrl, username, password, autoEnable: true, webdavLoggedIn: true };
        cachedSyncWebdavConfig = nextWConfig;
        sessionStorage.setItem('justLoggedIn', 'true');
        chrome.storage.local.set({ syncWebdavConfig: nextWConfig }, () => {
          reloadPageWithModalRestored();
        });
      } else {
        if (status) { status.innerText = '❌ ' + t('err_webdav_auth', '网盘 WebDAV 认证失败，请核对用户名 and 应用独立密码。'); status.style.color = '#ef4444'; }
        btnConfirm.disabled = false; btnConfirm.innerText = t('btn_login_submit', '登 录');
      }
    } catch (err) {
      processWebdavConnectionError(err, folderUrl, status, btnConfirm);
    }
  }
}

function processWebdavConnectionError(err, folderUrl, status, btnConfirm) {
  if (err.message && err.message.includes('Failed to fetch')) {
    let bypassUrl = folderUrl;
    try {
      const urlObj = new URL(folderUrl);
      bypassUrl = `${urlObj.protocol}//${urlObj.host}/`;
    } catch(e){}
    if (status) {
          status.innerHTML = `
            <div style="background: rgba(239, 68, 68, 0.04); border: 1px solid rgba(239, 68, 68, 0.15); border-radius: 10px; padding: 10px 12px; margin-top: 6px; line-height: 1.6; font-size: 11.5px; text-align: left;">
              <span style="color:#ef4444; font-weight: 700; display: block; margin-bottom: 4px; font-size: 12px;">❌ ${t('status_untrusted_cert', '连接失败：未信任的自签名证书')}</span>
              <span style="color: #475569; font-weight: 600;">
                ${t('status_cert_guide_prefix', '请')}<a href="${bypassUrl}" target="_blank" style="color: #3b82f6; font-weight: 800; text-decoration: underline; margin: 0 4px; display: inline-block;" data-i18n="status_cert_guide_link">点击此处放行证书</a>。${t('status_cert_guide_suffix', '在弹出的“你的连接不是专用连接”页面点击“高级” ➔ “继续访问”，然后返回重新登录。')}
              </span>
            </div>
          `;
    }
  } else {
    if (status) { status.innerText = '❌ ' + t('status_conn_fail', '登录失败：无法连接至目标服务器，请检查网络 and 映射端口。'); status.style.color = '#ef4444'; }
  }
  btnConfirm.disabled = false;
  btnConfirm.innerText = t('btn_login_submit', '登 录');
}

async function runAutoSyncSequence() {
  if (sessionStorage.getItem('justLoggedIn') === 'true') {
    return; 
  }
  if (activeSyncTab === 'browser') {
    await autoSyncSupabaseOnLoad(); 
  } else if (activeSyncTab === 'nas') {
    await autoSyncNasOnLoad(); 
  } else if (activeSyncTab === 'webdav') {
    await autoSyncWebdavOnLoad(); 
  }
}

function initMarqueeCollapseSystem() {
  const container = document.getElementById('marqueeOuterShellContainer');
  const triggerBtn = document.getElementById('btnToggleCollapseMarquee');
  const track = document.querySelector('.marquee-intro-inner');
  if (!container || !triggerBtn || !track) return;

  const isCollapsedCached = localStorage.getItem('s_tab_marquee_collapsed') !== 'false';
  if (isCollapsedCached) {
    container.classList.add('is-collapsed-state');
    triggerBtn.innerText = t('marquee_expand_btn', "展开 ▴");
  } else {
    container.classList.remove('is-collapsed-state');
    triggerBtn.innerText = t('marquee_collapse', "收起 ▾");
  }

  const totalLinesCount = track.querySelectorAll('.marquee-intro-line').length;

  function startMarqueeRollingInterval() {
    if (marqueeGlobalTimerInstance) clearInterval(marqueeGlobalTimerInstance);
    
    marqueeGlobalTimerInstance = setInterval(() => {
      if (isMarqueePausedByHoverLock) return; 

      marqueeCurrentLineIndex = (marqueeCurrentLineIndex + 1) % totalLinesCount;
      const offset = -marqueeCurrentLineIndex * MARQUEE_SINGLE_LINE_HEIGHT;
      track.style.transform = `translateY(${offset}px)`;
    }, 4500);
  }

  startMarqueeRollingInterval();

  container.addEventListener('mouseenter', () => { isMarqueePausedByHoverLock = true; });
  container.addEventListener('mouseleave', () => { isMarqueePausedByHoverLock = false; });

  triggerBtn.onclick = (e) => {
    e.stopPropagation();
    const isNowColl = container.classList.toggle('is-collapsed-state');
    localStorage.setItem('s_tab_marquee_collapsed', isNowColl ? 'true' : 'false');
    triggerBtn.innerText = isNowColl ? t('marquee_expand_btn', "展开 ▴") : t('marquee_collapse', "收起 ▾");
  };
}

function initSearchHistoryToggleSystem() {
  const btnToggle = document.getElementById('btnToggleSearchHistoryState');
  if (!btnToggle) return;

  chrome.storage.local.get(['searchHistoryEnabled'], (res) => {
    const isEnabled = res.searchHistoryEnabled !== false; 
    updateSearchHistoryButtonUI(isEnabled);
  });

  btnToggle.onclick = (e) => {
    e.stopPropagation();
    chrome.storage.local.get(['searchHistoryEnabled'], (res) => {
      const currentStatus = res.searchHistoryEnabled !== false;
      const nextStatus = !currentStatus;
      chrome.storage.local.set({ searchHistoryEnabled: nextStatus }, () => {
        updateSearchHistoryButtonUI(nextStatus);
      });
    });
  };
}

function updateSearchHistoryButtonUI(isEnabled) {
  const btnToggle = document.getElementById('btnToggleSearchHistoryState');
  if (!btnToggle) return;
  if (isEnabled) {
    btnToggle.style.opacity = "1";
    btnToggle.style.filter = "none";
    btnToggle.setAttribute('title', t('search_history_on', '历史记录已开启，点击后关闭'));
  } else {
    btnToggle.style.opacity = "0.3";
    btnToggle.style.filter = "grayscale(100%)";
    btnToggle.setAttribute('title', t('search_history_off', '历史记录已关闭，点击后开启'));
  }
}

// ⭐ 静态检测：是否开启了任何系统设置窗口
function isAnySettingsModalOpen() {
  const modalIds = [
    'syncModal', 'sbRegisterModal', 'optionsModal', 'languageModal',
    'aboutModal', 'superPasswordModal', 'setupWizardModal',
    'unifiedVerifyModal', 'removeEncryptionConfirmModal'
  ];
  return modalIds.some(id => {
    const el = document.getElementById(id);
    return el && (el.style.display === 'flex' || el.style.display === 'block');
  });
}

function applyMarqueeVisibility(enabled) {
  const container = document.getElementById('marqueeOuterShellContainer');
  if (!container) return;
  if (enabled !== false) {
    container.style.display = 'flex';
  } else {
    container.style.display = 'none';
  }
}

function applyShortcutTipsVisibility(enabled) {
  const tipsEl = document.querySelector('.snav-shortcut-tips');
  if (tipsEl) {
    tipsEl.style.display = enabled ? 'block' : 'none';
  }
}

/* ========================================================================= */
/* 🔒 多标签协调、衰减探针、临终冲刷与离线队列（LRSE 核心融合） */
/* ========================================================================= */
function initLrseAdaptiveEngine() {
  // 1. 前后台活动监听 ➔ 动态衰减心跳
  const resetAdaptiveFrequency = () => {
    const wasDecayed = (adaptiveInterval > 3000);
    adaptiveInterval = 3000; 
    if (wasDecayed) {
      scheduleNextProbe(); 
    }
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      decayHeartbeatPeriod();
    }, 60000);
  };

  const decayHeartbeatPeriod = () => {
    if (adaptiveInterval === 3000) {
      adaptiveInterval = 10000;
    } else if (adaptiveInterval === 10000) {
      adaptiveInterval = 30000;
    } else if (adaptiveInterval === 30000) {
      adaptiveInterval = 60000;
    }
    scheduleNextProbe(); 
  };

  // 监听键鼠操作唤醒高频
  window.addEventListener('mousemove', resetAdaptiveFrequency, { passive: true });
  window.addEventListener('keydown', resetAdaptiveFrequency, { passive: true });
  window.addEventListener('click', resetAdaptiveFrequency, { passive: true });
  resetAdaptiveFrequency();

  // 2. 标签页竞选与 Watchdog 周期守护
  runLeaderElection();
  setInterval(runLeaderElection, 10000); 
  
  // Follower 看门狗
  setInterval(() => {
    if (isLeader) return;
    chrome.storage.local.get(['leaderHeartbeat'], (res) => {
      const now = Date.now();
      const lastHb = res.leaderHeartbeat || 0;
      if (now - lastHb > 10000) {
        claimLeadership(); 
      }
    });
  }, 5000);

  // 启动递归动态探针心跳循环调度器
  scheduleNextProbe();

  // 3. 临终同步冲刷，视口卸载感知
  const triggerLastGaspFlush = () => {
    if (currentSyncDebounceTimer) clearTimeout(currentSyncDebounceTimer);
    chrome.storage.local.get(['mySites'], async (res) => {
      await saveSites(res.mySites || []);
      if (activeSyncTab === 'browser') {
        triggerSupabaseAutoUpload();
      } else if (activeSyncTab === 'nas') {
        triggerNasAutoUpload();
      } else {
        triggerWebdavAutoUpload();
      }
    });
  };
  window.addEventListener('beforeunload', triggerLastGaspFlush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      triggerLastGaspFlush();
    }
  });

  // 4. 离线网络连通感知
  window.addEventListener('online', async () => {
    chrome.storage.local.get(['pendingSyncQueue'], async (res) => {
      const queue = res.pendingSyncQueue || [];
      if (queue.length > 0) {
        await runAutoSyncSequence();
        chrome.storage.local.set({ pendingSyncQueue: [] });
      }
    });
  });
}

function scheduleNextProbe() {
  if (probeTimer) clearTimeout(probeTimer);
  probeTimer = setTimeout(async () => {
    if (isLeader) {
      chrome.storage.local.set({ leaderHeartbeat: Date.now() });
      await triggerNetworkSyncProbe();
    }
    scheduleNextProbe();
  }, adaptiveInterval);
}

function runLeaderElection() {
  chrome.storage.local.get(['leaderTabId', 'leaderHeartbeat'], (res) => {
    const now = Date.now();
    const lastHb = res.leaderHeartbeat || 0;
    const currentLeader = res.leaderTabId;

    if (document.visibilityState === 'visible' && (document.hasFocus() || !currentLeader || (now - lastHb > 10000) || currentLeader === myTabId)) {
      claimLeadership();
    } else {
      isLeader = false;
    }
  });
}

function claimLeadership() {
  isLeader = true;
  chrome.storage.local.set({
    leaderTabId: myTabId,
    leaderHeartbeat: Date.now()
  });
}

function triggerSyncUploadDebounced() {
  if (currentSyncDebounceTimer) clearTimeout(currentSyncDebounceTimer);
  if (isAnySettingsModalOpen()) return; 
  currentSyncDebounceTimer = setTimeout(() => {
    if (activeSyncTab === 'browser') triggerSupabaseAutoUpload();
    else if (activeSyncTab === 'nas') triggerNasAutoUpload();
    else triggerWebdavAutoUpload();
  }, 2000); 
}

function markAsDeleted(id) {
  const timestamp = Date.now() + localSkew;
  return new Promise((resolve) => {
    chrome.storage.local.get(['deletedIds'], (res) => {
      const deletedIds = res.deletedIds || {};
      deletedIds[id] = timestamp;
      chrome.storage.local.set({ deletedIds }, () => resolve());
    });
  });
}

function applyLruEviction(cache) {
  let str = JSON.stringify(cache);
  const limit = 2 * 1024 * 1024; 
  if (str.length <= limit) return cache;
  
  const entries = Object.entries(cache).map(([key, val]) => ({
    key,
    lr: val.lr || 0
  }));
  entries.sort((a, b) => a.lr - b.lr); 
  
  for (let entry of entries) {
    delete cache[entry.key];
    if (JSON.stringify(cache).length < 1.5 * 1024 * 1024) { 
      break;
    }
  }
  return cache;
}

// 📦 自动探针定时同步核心
async function triggerNetworkSyncProbe() {
  if (!isLeader) return;
  if (isAnySettingsModalOpen()) return; 

  // 🛡️ 间歇按需同步模式下，跳过定时探测以彻底消除后台能耗与网络开销
  const syncModeRes = await new Promise(r => chrome.storage.local.get(['syncWorkMode'], r));
  const mode = syncModeRes.syncWorkMode || 'passive'; // 🟢 默认值变更为 passive
  if (mode === 'passive') return;
  
  if (activeSyncTab === 'browser') {
    if (!cachedSyncBrowserConfig || !cachedSyncBrowserConfig.browserLoggedIn || cachedSyncBrowserConfig.autoEnable === false) return;
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/s_tab_sync?select=updated_at&user_email=eq.${cachedSyncBrowserConfig.email}`, {
        method: 'GET', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${cachedSyncBrowserConfig.token}` }
      });
      if (response.ok) {
        calibrateTimeSkew(response.headers); 
        const rows = await response.json();
        if (rows && rows.length > 0) {
          const cloudTimeStr = rows[0].updated_at;
          chrome.storage.local.get(['lastSyncedUpdatedAt'], async (localRes) => {
            const lastSynced = localRes.lastSyncedUpdatedAt || "";
            if (cloudTimeStr && cloudTimeStr !== lastSynced) {
              await downloadFromSupabaseCloud(cloudTimeStr);
              renderNavGridUI();
            }
          });
        }
        networkBackoffCount = 0; 
      } else {
        handleExponentialBackoff();
      }
    } catch (e) {
      handleExponentialBackoff();
    }
  } else if (activeSyncTab === 'nas') {
    if (!cachedSyncNasConfig || !cachedSyncNasConfig.nasLoggedIn || cachedSyncNasConfig.autoEnable === false) return;
    const folderUrl = cleanAndBuildWebdavUrl(cachedSyncNasConfig.nasAddress, cachedSyncNasConfig.nasPort, cachedSyncNasConfig.nasPath, 'nas');
    const fileUrl = getSyncFileUrlForChannel(folderUrl, 'nas');
    try {
      const response = await webdavRequest(fileUrl, 'HEAD', cachedSyncNasConfig.username, cachedSyncNasConfig.password);
      if (response.ok) {
        calibrateTimeSkew(response.headers); 
        const remoteTimeStr = response.headers.get('Last-Modified');
        if (remoteTimeStr) {
          chrome.storage.local.get(['lastSyncedNasLastModified'], async (localRes) => {
            const lastSynced = localRes.lastSyncedNasLastModified || "";
            if (remoteTimeStr !== lastSynced) {
              await downloadFromNas(remoteTimeStr);
              renderNavGridUI();
            }
          });
        }
        networkBackoffCount = 0;
      } else {
        handleExponentialBackoff();
      }
    } catch(e) {
      handleExponentialBackoff();
    }
  } else {
    if (!cachedSyncWebdavConfig || !cachedSyncWebdavConfig.webdavLoggedIn || cachedSyncWebdavConfig.autoEnable === false) return;
    const folderUrl = cleanAndBuildWebdavUrl(cachedSyncWebdavConfig.url, '', '', 'webdav');
    const fileUrl = getSyncFileUrlForChannel(folderUrl, 'webdav');
    try {
      const response = await webdavRequest(fileUrl, 'HEAD', cachedSyncWebdavConfig.username, cachedSyncWebdavConfig.password);
      if (response.ok) {
        calibrateTimeSkew(response.headers); 
        const remoteTimeStr = response.headers.get('Last-Modified');
        if (remoteTimeStr) {
          chrome.storage.local.get(['lastSyncedWebdavLastModified'], async (localRes) => {
            const lastSynced = localRes.lastSyncedWebdavLastModified || "";
            if (remoteTimeStr !== lastSynced) {
              await downloadFromWebdavCloud(remoteTimeStr);
              renderNavGridUI();
            }
          });
        }
        networkBackoffCount = 0;
      } else {
        handleExponentialBackoff();
      }
    } catch(e) {
      handleExponentialBackoff();
    }
  }
}

function handleExponentialBackoff() {
  networkBackoffCount++;
  const seconds = Math.min(3 * Math.pow(2, networkBackoffCount), 60);
  adaptiveInterval = seconds * 1000;
}

function calibrateTimeSkew(headers) {
  try {
    const serverDateStr = headers.get('Date');
    if (serverDateStr) {
      const serverTime = new Date(serverDateStr).getTime();
      if (!isNaN(serverTime)) {
        localSkew = serverTime - Date.now();
        chrome.storage.local.set({ localSkew });
      }
    }
  } catch (e) {}
}

// 现代浏览器标准 CompressionStream Gzip 流压缩转换 base64
async function compressData(plainText) {
  const stream = new Blob([plainText]).stream();
  const compressedStream = stream.pipeThrough(new CompressionStream('gzip'));
  const chunks = [];
  const reader = compressedStream.getReader();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const blob = new Blob(chunks);
  const arrayBuffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return "gz:b64:" + btoa(binary);
}

// 原生流解压及向下旧版本兼容网
async function decompressData(payloadStr) {
  if (!payloadStr.startsWith("gz:b64:")) {
    return payloadStr; 
  }
  const base64 = payloadStr.substring(7);
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const stream = new Blob([bytes]).stream();
  const decompressedStream = stream.pipeThrough(new DecompressionStream('gzip'));
  const response = new Response(decompressedStream);
  return await response.text();
}

// ⭐ 重构双向 LWW-Merge 递归核心算法，由更新的时间戳那端无条件确定卡片位置与顺序，解决 Browser A 与 B 间移动卡片无法对齐的问题
// ⭐ 精准修正：修正 delTime >= nodeTime 导致 0 >= 0 成立、在未同步时本地数据被无故当作“已删除”丢弃的逻辑缺陷，并对齐递归合并时的 Winner 标识
function lwwMergeData(localSites, remoteSites, localDeleted, remoteDeleted, localTime, remoteTime) {
  const mergedDeleted = { ...localDeleted, ...remoteDeleted };
  const now = Date.now() + localSkew;
  
  for (let key in mergedDeleted) {
    if (now - mergedDeleted[key] > 30 * 24 * 3600 * 1000) {
      delete mergedDeleted[key];
    }
  }

  // 1. 在开始树状合并前，预先在两端数据集里扫描每一个 card (nav) 的最新修改时戳，确立其最新归宿 parentId 映射
  const latestCardMap = new Map(); // id -> { u, parentFolderId, node }
  const scanSitesForLatestParent = (sites, defaultParentId) => {
    (sites || []).forEach(s => {
      if (!s) return;
      if (s.type === 'folder') {
        if (s.children) {
          s.children.forEach(c => {
            if (!c) return;
            const existing = latestCardMap.get(c.id);
            if (!existing || (c.u || 0) > existing.u) {
              latestCardMap.set(c.id, { u: c.u || 0, parentFolderId: s.id, node: c });
            }
          });
        }
      } else if (s.type === 'nav') {
        const existing = latestCardMap.get(s.id);
        if (!existing || (s.u || 0) > existing.u) {
          latestCardMap.set(s.id, { u: s.u || 0, parentFolderId: defaultParentId, node: s });
        }
      }
    });
  };

  scanSitesForLatestParent(localSites, 'main_grid');
  scanSitesForLatestParent(remoteSites, 'main_grid');

  const rescuedOrphansList = [];

  const mergeTree = (localArr, remoteArr, lTimeVal, rTimeVal, currentParentId) => {
    const localMap = new Map((localArr || []).map(n => [n.id, n]));
    const remoteMap = new Map((remoteArr || []).map(n => [n.id, n]));
    
    // ⭐ LWW 列表顺序一致性解析：哪一端的时间戳更新，哪一端就作为 Winner 决定当前数组的绝对顺序
    const remoteWins = (rTimeVal > lTimeVal);
    const winnerArr = remoteWins ? (remoteArr || []) : (localArr || []);
    const loserMap = remoteWins ? localMap : remoteMap;
    
    const mergedList = [];
    const processedIds = new Set();

    // 1. 先按 Winner 端制定的精确顺序压入节点
    for (let winnerNode of winnerArr) {
      const id = winnerNode.id;
      processedIds.add(id);

      // 如果当前处理的项为网页卡片，则验证其全局最新归宿是否与当前容器匹配。若被移走，则在这里直接跳过，防止冲突和重入
      if (winnerNode.type === 'nav') {
        const latest = latestCardMap.get(winnerNode.id);
        if (latest && latest.parentFolderId !== currentParentId) {
          continue; 
        }
      }

      const delTime = mergedDeleted[id]; // 精准寻找墓碑，不进行未定义时的 0 值硬代入
      const loserNode = loserMap.get(id);
      const nodeTime = Math.max(winnerNode.u || 0, loserNode ? (loserNode.u || 0) : 0);

      // ⭐ 修复：只有当墓碑中明确存在记录，且确实新于或等于卡片时，才认定为“已删除”
      if (delTime !== undefined && delTime >= nodeTime) {
        const rescueOrphansFromFolder = (node) => {
          if (node && node.type === 'folder' && node.children) {
            node.children.forEach(child => {
              if ((child.u || 0) > delTime) {
                child.u = Date.now() + localSkew;
                rescuedOrphansList.push(child);
              }
            });
          }
        };
        rescueOrphansFromFolder(winnerNode);
        rescueOrphansFromFolder(loserNode);
        continue; 
      }

      if (!loserNode) {
        mergedList.push(winnerNode);
      } else {
        const mergedNode = { ...(winnerNode.u >= loserNode.u ? winnerNode : loserNode) };
        if (winnerNode.type === 'folder' && loserNode.type === 'folder') {
          // ⭐ 修复：对齐递归调用时的 winner/loser 与 local/remote 身份，防止深层状态反转
          const localChild = remoteWins ? loserNode : winnerNode;
          const remoteChild = remoteWins ? winnerNode : loserNode;
          mergedNode.children = mergeTree(
            localChild.children || [], 
            remoteChild.children || [], 
            localChild.u || 0, 
            remoteChild.u || 0, 
            winnerNode.id
          );
        }
        mergedNode.u = nodeTime;
        mergedList.push(mergedNode);
      }
    }

    // 2. 检查并合入胜出方缺失但未被墓碑标记的节点（如离线新增项）
    for (let [id, loserNode] of loserMap.entries()) {
      if (processedIds.has(id)) continue;
      const delTime = mergedDeleted[id]; // 精准寻找墓碑，不进行未定义时的 0 值硬代入
      const nodeTime = loserNode.u || 0;
      
      // ⭐ 修复：同上，若墓碑中未定义或小，绝不能抛弃未同步的本地卡片
      if (delTime !== undefined && delTime >= nodeTime) continue;

      // 验证未包含卡片节点的最新归宿，防止落后旧版数据将其强行插回，完美解决拖拽跳回/闪烁跳格
      if (loserNode.type === 'nav') {
        const latest = latestCardMap.get(loserNode.id);
        if (latest && latest.parentFolderId !== currentParentId) {
          continue; 
        }
      }

      mergedList.push(loserNode);
    }

    return mergedList;
  };

  let mergedSites = mergeTree(localSites, remoteSites, localTime, remoteTime, 'main_grid');

  if (rescuedOrphansList.length > 0) {
    let unCat = mergedSites.find(s => s.id === "folder_uncategorized");
    if (!unCat) {
      unCat = { id: "folder_uncategorized", type: "folder", name: t('uncategorized', "未分类"), children: [], u: Date.now() + localSkew };
      mergedSites.push(unCat);
    }
    unCat.children = [...(unCat.children || []), ...rescuedOrphansList];
    unCat.u = Date.now() + localSkew;
  }

  return { mergedSites, mergedDeleted };
}

/* ========================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['syncBrowserConfig', 'syncNasConfig', 'syncWebdavConfig', 'activeSyncTab', 'optEnableMarquee', 'optEnableShortcutTips', 'isFirstRunGuideDismissed', 'userLanguage'], (res) => {
    cachedSyncBrowserConfig = res.syncBrowserConfig || {};
    cachedSyncNasConfig = res.syncNasConfig || {};
    cachedSyncWebdavConfig = res.syncWebdavConfig || {};
    activeSyncTab = res.activeSyncTab || 'browser';
    
    const sel = document.getElementById('userLanguageSelect');
    if (sel) {
      sel.value = res.userLanguage || 'auto';
    }
    const confirmLangBtn = document.getElementById('btnConfirmLanguageModal');
    if (confirmLangBtn) {
      confirmLangBtn.onclick = async () => {
        const selNode = document.getElementById('userLanguageSelect');
        if (selNode) {
          let lang = selNode.value;
          if (!lang || lang === 'auto') {
            lang = chrome.i18n.getUILanguage();
          }
          
          // 🟢 规范化语言代码
          let activeLang = 'en';
          const SUPPORTED_LANGS = ['zh_CN', 'en', 'ja', 'ko', 'de', 'ru', 'fr', 'it'];
          lang = lang.replace('-', '_');
          if (lang.startsWith('zh')) {
            activeLang = 'zh_CN';
          } else {
            for (const supported of SUPPORTED_LANGS) {
              if (lang.toLowerCase().startsWith(supported.toLowerCase())) {
                activeLang = supported;
                break;
              }
            }
          }
          
          // 🟢 在 reload 前同步将最新语言包载入 localStorage 缓存，彻底解决异步刷新时差
          try {
            const url = chrome.runtime.getURL(`_locales/${activeLang}/messages.json`);
            const response = await fetch(url);
            if (response.ok) {
              const data = await response.json();
              const pack = {};
              for (const key in data) {
                if (data[key] && data[key].message) {
                  pack[key] = data[key].message;
                }
              }
              localStorage.setItem('s_tab_translations_cache', JSON.stringify(pack));
            }
          } catch (e) {
            console.error("Pre-caching translations failed:", e);
          }

          chrome.storage.local.set({ userLanguage: selNode.value }, () => {
            window.location.reload();
          });
        }
      };
    }
    const cancelLangBtn = document.getElementById('btnCancelLanguageModal');
    if (cancelLangBtn) {
      cancelLangBtn.onclick = () => {
        document.getElementById('languageModal').style.display = 'none';
      };
    }
    const closeLangBtn = document.getElementById('btnCloseLanguageModal');
    if (closeLangBtn) {
      closeLangBtn.onclick = () => {
        document.getElementById('languageModal').style.display = 'none';
      };
    }

    const banner = document.getElementById('firstRunGuideBanner');
    const dismissBtn = document.getElementById('btnDismissFirstRun');
    if (banner && dismissBtn) {
      if (res.isFirstRunGuideDismissed !== true) {
        banner.style.display = 'flex';
        dismissBtn.onclick = () => {
          banner.style.display = 'none';
          chrome.storage.local.set({ isFirstRunGuideDismissed: true });
        };
      } else {
        banner.style.display = 'none';
      }
    }

    initThemeSystem(); loadEngineSystem(); renderNavGridUI();
    initSearchSuggestions();
    
    initLrseAdaptiveEngine();
    runAutoSyncSequence();

    initUnifiedVerifyEngine(); 
    initSNavSearchSystem();
    initMarqueeCollapseSystem(); 
    initSearchHistoryToggleSystem();
    initIconSelectorSystem();	
    initWebdavProviderDropdownSystem();
    initNasUrlPreviewSystem();
    initSetupWizardEngine();
    initResetWarningSystem();
    initRemoveEncryptionSystem(); 

    applyMarqueeVisibility(res.optEnableMarquee !== false);
    applyShortcutTipsVisibility(!!res.optEnableShortcutTips);
// 初始化同步图标的显示状态
updateSyncIndicatorUI();

// 绑定 🔄 标志物理点击强制对齐事件
const indicator = document.getElementById('syncIndicator');
if (indicator) {
  indicator.onclick = async (e) => {
    e.stopPropagation();
    if (indicator.classList.contains('sync-spin-icon')) return; // 防连击保护
    
    // 一并读取模式、当前选中的同步通道以及各通道的登录状态
    chrome.storage.local.get(['syncWorkMode', 'activeSyncTab', 'syncBrowserConfig', 'syncNasConfig', 'syncWebdavConfig'], async (res) => {
      const mode = res.syncWorkMode || 'passive'; 
      if (mode === 'passive') {
        const activeTab = res.activeSyncTab || 'browser';
        const bConfig = res.syncBrowserConfig || {};
        const nConfig = res.syncNasConfig || {};
        const wConfig = res.syncWebdavConfig || {};
        
        // 🛡️ 核心检查：判断当前选中的同步通道是否已登录/配置成功
        let isChannelConnected = false;
        if (activeTab === 'browser') {
          isChannelConnected = !!bConfig.browserLoggedIn;
        } else if (activeTab === 'nas') {
          isChannelConnected = !!nConfig.nasLoggedIn;
        } else if (activeTab === 'webdav') {
          isChannelConnected = !!wConfig.webdavLoggedIn;
        }
        
        // 如果没有成功登录/关联通道，进行友好拦截并直接为您开启配置面板
if (!isChannelConnected) {
  showToast("💡 " + t('toast_no_sync_channel', '提示：当前未连接或登录云同步通道，请先登录配置！'), 4000);
  openSyncPanelDirectly(); // 自动为用户弹出云同步配置面板，引导登录
  return;
}

indicator.classList.add('sync-spin-icon');
showToast(t('toast_initiating_sync', '正在向云端发起双向对齐同步...'));
try {
  await runAutoSyncSequence();
  showToast(t('toast_sync_success', '🎉 数据同步对齐成功！'));
} catch (err) {
  showToast(t('toast_sync_failed', '❌ 同步失败，请检查配置或网络。'));
} finally {
  indicator.classList.remove('sync-spin-icon');
}
      }
    });
  };
}

// 监听可见性状态变更（在切换回该标签页时进行按需拉取）
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    chrome.storage.local.get(['syncWorkMode'], (res) => {
  const mode = res.syncWorkMode || 'passive'; // 🟢 确保在未定义时默认也作为 passive 执行
  if (mode === 'passive') {
    runAutoSyncSequence();
  }
});
  }
});
    if (sessionStorage.getItem('autoOpenSyncModal') === 'true') {
      sessionStorage.removeItem('autoOpenSyncModal');
      sessionStorage.removeItem('justLoggedIn'); 
      openSyncPanelDirectly();
    }
  });

  window.addEventListener('dragover', (e) => {
    if (document.body.getAttribute('data-dragging-folder') === 'true') {
      const closestPanel = e.target.closest('.floating-folder-panel');
      if (closestPanel) { e.preventDefault(); e.stopPropagation(); }
    }
  }, true); 

  window.addEventListener('drop', (e) => {
    if (document.body.getAttribute('data-dragging-folder') === 'true') {
      const closestPanel = e.target.closest('.floating-folder-panel');
      if (closestPanel) { e.preventDefault(); e.stopPropagation(); }
    }
    document.body.removeAttribute('data-dragging-folder');
  }, true);

  const syncInputs = ['syncSupabaseEmail', 'syncSupabasePassword', 'syncNasAddress', 'syncNasPort', 'syncNasPath', 'syncNasUsername', 'syncNasPassword', 'syncWebdavUrl', 'syncWebdavUsername', 'syncWebdavPassword', 'regSupabaseEmail', 'regSupabasePassword', 'regSupabaseConfirm', 'wizardCharPwd', 'wizardCharPwdConfirm', 'wizardCharPwdHint', 'wizardGestureHint', 'unifiedVerifyInput'];
  syncInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (id.startsWith('reg')) document.getElementById('btnExecuteRegister').click();
          else if (id === 'wizardCharPwd' || id === 'wizardCharPwdConfirm' || id === 'wizardCharPwdHint') document.getElementById('btnWizardStep1Next').click();
          else if (id === 'unifiedVerifyInput') document.getElementById('btnConfirmUnifiedVerify').click();
          else handleLegacyLoginAction(); 
        }
      });
    }
  });

  if (document.getElementById('lnkGoToRegister')) document.getElementById('lnkGoToRegister').onclick = (e) => { e.preventDefault(); switchMemFireView('register'); };
  if (document.getElementById('lnkBackToLogin')) document.getElementById('lnkBackToLogin').onclick = (e) => { e.preventDefault(); switchMemFireView('login'); };

  if (document.getElementById('btnExecuteRegister')) {
    document.getElementById('btnExecuteRegister').onclick = async () => {
      const email = document.getElementById('regSupabaseEmail').value.trim();
      const pwd = document.getElementById('regSupabasePassword').value.trim();
      const confirmPwd = document.getElementById('regSupabaseConfirm').value.trim();
      if (!email || !pwd || !confirmPwd) return alert(t('alert_required_fields', '各项参数必填！'));
      if (pwd.length < 6) return alert(t('alert_pwd_mismatch', "密码长度需至少 6 位！"));
      if (pwd !== confirmPwd) return alert(t('alert_pwd_mismatch', "两次输入的密码不一致，请重新输入"));

      const btnReg = document.getElementById('btnExecuteRegister');
      btnReg.disabled = true; btnReg.innerText = t('status_submitting', '正在提交...');
      
      try {
        const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
          method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: pwd })
        });
        const result = await response.json();
        btnReg.disabled = false; btnReg.innerText = t('btn_register_submit', '注 册');
        if (!response.ok) { alert(t('alert_reg_fail', '注册失败: ') + `${result.message || '未知错误'}`); return; }

        showDynamicBlurAlert(
          t('alert_verify_email_sent', '验证邮件已发送至您的注册邮箱！请立即前往您的常用邮箱查看邮件并完成确认。'),
          () => { switchMemFireView('login'); document.getElementById('syncSupabaseEmail').value = email; },
          () => { switchMemFireView('login'); document.getElementById('syncSupabaseEmail').value = email; },
          t('alert_email_sent_title', '📧 验证邮件已发送'), t('back_to_login_link', '返回登录'), t('alert_cancel_text', '暂不处理'), '📧'
        );
      } catch (err) {
        alert(t('alert_net_error', '网络通信异常，请检查网络连通状态。'));
        btnReg.disabled = false; btnReg.innerText = t('btn_register_submit', '注 册');
      }
    };
  }

  if (document.getElementById('btnConfirmEngineModal')) {
    document.getElementById('btnConfirmEngineModal').onclick = () => {
      const name = document.getElementById('newEngineName').value.trim();
      const url = document.getElementById('newEngineUrl').value.trim();
      if(!name || !url) return alert(t('alert_required_fields', "各项参数必填！"));
      if(!url.includes("%s")) return alert(t('alert_placeholder_s', "链接必须包含 %s 占位符！"));
      
      if(targetEngineObj) {
        if(defaultEngines.some(d => d.id === targetEngineObj.id)) {
          alert(t('alert_native_engine_edit', "内置系统原生引擎不允许修改映射链接，请单独建立自定义项。"));
        } else {
          customEngines.forEach(c => { 
            if(c.id === targetEngineObj.id) { 
              c.name = name; 
              if (c.url !== url) {
                c.url = url; 
                delete engineIconBase64Map[c.id]; 
                chrome.storage.local.set({ engineIconBase64: engineIconBase64Map });
              }
            } 
          });
        }
      } else {
        customEngines.push({ id: 'cust_' + Date.now(), name, url });
      }
      chrome.storage.local.set({ customEngines }, () => {
        document.getElementById('engineModal').style.display = "none";
        loadEngineSystem();
      });
    };
  }

  if (document.getElementById('btnExportAllData')) {
    document.getElementById('btnExportAllData').onclick = () => {
      chrome.storage.local.get(null, (allData) => {
        triggerDownloadJson({ source: "S-Tab-All-Config", version: "3.2.3-Full-Sync", timestamp: Date.now(), data: allData }, `s_tab_all_config_${getTodayDateStr()}.json`);
      });
    };
  }
  if (document.getElementById('btnImportAllData')) document.getElementById('btnImportAllData').onclick = () => document.getElementById('hiddenImportAllData').click();
  if (document.getElementById('hiddenImportAllData')) {
    document.getElementById('hiddenImportAllData').onchange = (e) => {
      const file = e.target.files[0]; if(!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const parsed = JSON.parse(evt.target.result);
          if(parsed.source !== "S-Tab-All-Config" || !parsed.data) return alert(t('alert_invalid_backup', "校验失败，非合规的备份数据包！"));
          
          if(confirm(t('confirm_merge_import', "💡 智能合并：\n系统将自动提取全新卡片，并安全合并同名文件夹与重复网址项目。确认合并？"))) {
            chrome.storage.local.get(null, (currentLocalData) => {
              const importedData = parsed.data || {};
              const finalGlobalSuperPassword = currentLocalData.globalSuperPassword || importedData.globalSuperPassword || '';
              const finalGlobalGesturePassword = currentLocalData.globalGesturePassword || importedData.globalGesturePassword || '';
              const finalSuperPasswordHint = currentLocalData.superPasswordHint || importedData.superPasswordHint || '';
              const finalGesturePasswordHint = currentLocalData.gesturePasswordHint || importedData.gesturePasswordHint || '';
              
              let localSites = currentLocalData.mySites || [];
              let importSites = importedData.mySites || [];
              let localSitesIdMap = new Map();
              localSites.forEach(s => { localSitesIdMap.set(s.id, s); });
              
              let localUncategorized = localSites.find(s => s.id === "folder_uncategorized");
              if (!localUncategorized) {
                localUncategorized = { id: "folder_uncategorized", type: "folder", name: t('uncategorized', "未分类"), children: [] };
                localSites.push(localUncategorized);
                localSitesIdMap.set("folder_uncategorized", localUncategorized);
              }
              if (!localUncategorized.children) localUncategorized.children = [];

              importSites.forEach(impNode => {
                if (!impNode) return;
                if (impNode.id === "folder_uncategorized") {
                  if (impNode.children && Array.isArray(impNode.children)) {
                    impNode.children.forEach(impChild => {
                      let hasDup = localSites.some(ls => (ls.type === 'nav' && ls.url === impChild.url) || (ls.type === 'folder' && ls.children && ls.children.some(lc => lc.url === impChild.url)));
                      if (!hasDup) localUncategorized.children.push(impChild);
                    });
                  }
                  return;
                }
                
                if (impNode.type === 'folder') {
                  if (localSitesIdMap.has(impNode.id)) {
                    let matchedLocalFolder = localSitesIdMap.get(impNode.id);
                    if (!matchedLocalFolder.children) matchedLocalFolder.children = [];
                    if (impNode.children && Array.isArray(impNode.children)) {
                      impNode.children.forEach(impChild => {
                        let hasDup = localSites.some(ls => (ls.type === 'nav' && ls.url === impChild.url) || (ls.type === 'folder' && ls.children && ls.children.some(lc => lc.url === impChild.url))); if (!hasDup) matchedLocalFolder.children.push(impChild);
                      });
                    }
                    if (impNode.isEncrypted) matchedLocalFolder.isEncrypted = true;
                  } else {
                    let cleanedChildren = [];
                    if (impNode.children && Array.isArray(impNode.children)) {
                      impNode.children.forEach(impChild => {
                        let hasDup = localSites.some(ls => (ls.type === 'nav' && ls.url === impChild.url) || (ls.type === 'folder' && ls.children && ls.children.some(lc => lc.url === impChild.url))); if (!hasDup) cleanedChildren.push(impChild);
                      });
                    }
                    impNode.children = cleanedChildren;
                    const unCatIdx = localSites.findIndex(s => s.id === "folder_uncategorized");
                    if (unCatIdx !== -1) localSites.splice(unCatIdx, 0, impNode);
                    else localSites.push(impNode);
                  }
                } else if (impNode.type === 'nav') {
                  let hasDup = localSites.some(ls => (ls.type === 'nav' && ls.url === impNode.url) || (ls.type === 'folder' && ls.children && ls.children.some(lc => lc.url === impNode.url)));
                  if (!hasDup) localSites.unshift(impNode);
                }
              });

              let localEngines = currentLocalData.customEngines || [];
              let importEngines = importedData.customEngines || [];
              importEngines.forEach(ie => { if (!localEngines.some(le => le.url === ie.url)) localEngines.push(ie); });

              const parsedFinalSites = strictFilterDuplicateUrlsAndMergeFolders(localSites);

              let finalUserTheme = importedData.userTheme || currentLocalData.userTheme || 'theme-time';
              if (finalUserTheme === 'theme-glacier') finalUserTheme = 'theme-time';

              const calibratedTimestamp = Date.now() + localSkew;
              
              // ⭐ 将导入合并后的所有卡片时间戳统一强刷成最新，在 LWW 同步合并中拥有最高控制权
              parsedFinalSites.forEach(s => {
                s.u = calibratedTimestamp;
                if (s.type === 'folder' && s.children) {
                  s.children.forEach(c => {
                    c.u = calibratedTimestamp;
                  });
                }
              });

              isSyncingInProgress = true; // 锁定轮询探针避免写入与探针冲突

              chrome.storage.local.set({
                ...currentLocalData, ...importedData, mySites: parsedFinalSites, customEngines: localEngines, globalSuperPassword: finalGlobalSuperPassword, globalGesturePassword: finalGlobalGesturePassword, superPasswordHint: finalSuperPasswordHint, gesturePasswordHint: finalGesturePasswordHint, lastLocalUpdated: calibratedTimestamp
              }, () => { 
                sessionStorage.setItem('justImported', 'true');
                
                // ⭐ 在页面重载前，显式强制触发一次数据上传，将 A 导入的最新数据包合流写入云端
                const performUploadAndReload = async () => {
                  try {
                    if (activeSyncTab === 'browser' && currentLocalData.syncBrowserConfig?.browserLoggedIn) {
                      await uploadToSupabaseCloud();
                    } else if (activeSyncTab === 'nas' && currentLocalData.syncNasConfig?.nasLoggedIn) {
                      await uploadToNas();
                    } else if (activeSyncTab === 'webdav' && currentLocalData.syncWebdavConfig?.webdavLoggedIn) {
                      await uploadToWebdavCloud();
                    }
                  } catch (err) {
                    console.error("Upload after import failed: ", err);
                  } finally {
                    isSyncingInProgress = false;
                    window.location.reload(); 
                  }
                };
                performUploadAndReload();
              });
            });
          }
        } catch (e) {
          alert(t('alert_parse_backup_error', "解析备份数据失败！"));
        }
      };
      reader.readAsText(file);
    };
  }

  if (document.getElementById('btnOpenSyncModal')) {
    document.getElementById('btnOpenSyncModal').onclick = () => {
      openSyncPanelDirectly();
    };
  }
  if (document.getElementById('btnCloseSyncModal')) {
    document.getElementById('btnCloseSyncModal').onclick = () => {
      document.getElementById('syncModal').style.display = 'none';
      hideFloatingAboutWindows();
    };
  }
  if (document.getElementById('btnTabSyncBrowser')) {
    document.getElementById('btnTabSyncBrowser').onclick = () => switchSyncTab('browser');
  }
  if (document.getElementById('btnTabSyncNas')) {
    document.getElementById('btnTabSyncNas').onclick = () => switchSyncTab('nas');
  }
  if (document.getElementById('btnTabSyncWebdav')) {
    document.getElementById('btnTabSyncWebdav').onclick = () => switchSyncTab('webdav');
  }

  if (document.getElementById('lnkGoToRegister')) {
    document.getElementById('lnkGoToRegister').onclick = (e) => {
      e.preventDefault();
      switchMemFireView('register');
    };
  }
  if (document.getElementById('lnkBackToLogin')) {
    document.getElementById('lnkBackToLogin').onclick = (e) => {
      e.preventDefault();
      switchMemFireView('login');
    };
  }
  if (document.getElementById('closeRegisterModalTrigger')) {
    document.getElementById('closeRegisterModalTrigger').onclick = () => {
      document.getElementById('sbRegisterModal').style.display = 'none';
    };
  }

  if (document.getElementById('btnConfirmSyncModal')) {
    document.getElementById('btnConfirmSyncModal').onclick = handleLegacyLoginAction;
  }

  const saveCloseBtn = document.getElementById('btnSaveAndCloseModal');
  if (saveCloseBtn) {
    saveCloseBtn.onclick = async () => {
      if (activeSyncTab === 'browser') {
        const isAutoEnable = document.getElementById('syncBrowserEnableLoggedIn').checked;
        chrome.storage.local.get(['syncBrowserConfig'], async (res) => {
          const bConfig = res.syncBrowserConfig || {}; bConfig.autoEnable = isAutoEnable; cachedSyncBrowserConfig = bConfig;
          chrome.storage.local.set({ syncBrowserConfig: bConfig }, async () => {
            if (isAutoEnable) { await autoSyncSupabaseOnLoad(); }
            document.getElementById('syncModal').style.display = 'none'; hideFloatingAboutWindows();
          });
        });
      } else if (activeSyncTab === 'nas') {
        const isAutoEnable = document.getElementById('syncNasEnableLoggedIn').checked;
        chrome.storage.local.get(['syncNasConfig'], async (res) => {
          const nConfig = res.syncNasConfig || {}; nConfig.autoEnable = isAutoEnable; cachedSyncNasConfig = nConfig;
          chrome.storage.local.set({ syncNasConfig: nConfig }, async () => {
            if (isAutoEnable) { await autoSyncNasOnLoad(); }
            document.getElementById('syncModal').style.display = 'none'; hideFloatingAboutWindows();
          });
        });
      } else {
        const isAutoEnable = document.getElementById('syncWebdavEnableLoggedIn').checked;
        chrome.storage.local.get(['syncWebdavConfig'], async (res) => {
          const wConfig = res.syncWebdavConfig || {}; wConfig.autoEnable = isAutoEnable; cachedSyncWebdavConfig = wConfig;
          chrome.storage.local.set({ syncWebdavConfig: wConfig }, async () => {
            if (isAutoEnable) { await autoSyncWebdavOnLoad(); }
            document.getElementById('syncModal').style.display = 'none'; hideFloatingAboutWindows();
          });
        });
      }
    };
  }

  const exitBtn = document.getElementById('btnExitLoggedInModal');
  if (exitBtn) {
    exitBtn.onclick = () => {
      if (activeSyncTab === 'browser') {
        if (confirm(t('confirm_logout', '确定要退出当前云账户吗？'))) {
          chrome.storage.local.get(['syncBrowserConfig'], (res) => {
            const bConfig = res.syncBrowserConfig || {}; bConfig.browserLoggedIn = false; bConfig.email = ''; bConfig.password = ''; bConfig.token = ''; bConfig.autoEnable = true;
            cachedSyncBrowserConfig = bConfig;
            chrome.storage.local.set({ syncBrowserConfig: bConfig }, () => { reloadPageWithModalRestored(); });
          });
        }
      } else if (activeSyncTab === 'nas') {
        if (confirm(t('confirm_disconnect_nas', '确定要断开当前 NAS 云私有连接吗？'))) {
          chrome.storage.local.get(['syncNasConfig'], (res) => {
            const nConfig = res.syncNasConfig || {}; nConfig.nasLoggedIn = false; nConfig.nasAddress = ''; nConfig.nasPort = ''; nConfig.nasPath = ''; nConfig.username = ''; nConfig.password = ''; nConfig.autoEnable = true;
            cachedSyncNasConfig = nConfig;
            chrome.storage.local.set({ syncNasConfig: nConfig }, () => { reloadPageWithModalRestored(); });
          });
        }
      } else if (activeSyncTab === 'webdav') {
  if (confirm(t('confirm_disconnect_webdav', '确定要退出当前托管网盘的云连接吗？'))) {
    chrome.storage.local.get(['syncWebdavConfig'], (res) => {
            const wConfig = res.syncWebdavConfig || {}; wConfig.webdavLoggedIn = false; wConfig.url = ''; wConfig.username = ''; wConfig.password = ''; wConfig.autoEnable = true;
            cachedSyncWebdavConfig = wConfig;
            chrome.storage.local.set({ syncWebdavConfig: wConfig }, () => { reloadPageWithModalRestored(); });
          });
        }
      }
    };
  }

  if (document.getElementById('btnManageSuperPassword')) {
    document.getElementById('btnManageSuperPassword').onclick = () => { openSuperPasswordModal(); };
  }
  if (document.getElementById('btnCloseSuperPasswordModal')) {
    document.getElementById('btnCloseSuperPasswordModal').onclick = () => { document.getElementById('superPasswordModal').style.display = 'none'; };
  }

  if (document.getElementById('btnOpenOptionsModal')) {
  document.getElementById('btnOpenOptionsModal').onclick = () => {
    chrome.storage.local.get(['optEnableMarquee', 'optEnableShortcutTips', 'syncWorkMode'], (res) => {
      const chk = document.getElementById('optEnableMarquee');
      if (chk) chk.checked = res.optEnableMarquee !== false;
      const chkTips = document.getElementById('optEnableShortcutTips');
if (chkTips) chkTips.checked = !!res.optEnableShortcutTips;
      
      // 读取单选框状态（默认选中间歇按需同步）
      const mode = res.syncWorkMode || 'passive'; // 🟢 默认值变更为 passive
      if (mode === 'passive') {
        document.getElementById('syncModePassive').checked = true;
      } else {
        document.getElementById('syncModeActive').checked = true;
      }
      
      document.getElementById('optionsModal').style.display = 'flex';
    });
  };
}
  if (document.getElementById('btnCloseOptionsModal')) {
    document.getElementById('btnCloseOptionsModal').onclick = () => {
      document.getElementById('optionsModal').style.display = 'none';
    };
  }
  if (document.getElementById('btnCancelOptionsModal')) {
    document.getElementById('btnCancelOptionsModal').onclick = () => {
      document.getElementById('optionsModal').style.display = 'none';
    };
  }
  if (document.getElementById('btnSaveOptions')) {
  document.getElementById('btnSaveOptions').onclick = () => {
    const isChecked = document.getElementById('optEnableMarquee').checked;
    const isTipsChecked = document.getElementById('optEnableShortcutTips').checked;
    
    // 获取当前选中的单选框值
    const modeVal = document.getElementById('syncModePassive').checked ? 'passive' : 'active';
    
    chrome.storage.local.set({ 
      optEnableMarquee: isChecked, 
      optEnableShortcutTips: isTipsChecked,
      syncWorkMode: modeVal
    }, () => {
      applyMarqueeVisibility(isChecked);
      applyShortcutTipsVisibility(isTipsChecked);
      updateSyncIndicatorUI(); // 保存后立即刷新 🔄 图标的常驻/显隐状态
      document.getElementById('optionsModal').style.display = 'none';
    });
  };
}

  if (document.getElementById('btnOpenLanguageModal')) {
    document.getElementById('btnOpenLanguageModal').onclick = () => {
      document.getElementById('languageModal').style.display = 'flex';
    };
  }

  document.querySelectorAll('.btn-close-folder-panel').forEach(btn => {
    btn.addEventListener('mousedown', () => {
      window.isCancellingFolder = true;
    });
  });

  document.querySelectorAll('.btn-close-folder-panel').forEach(btn => {
    btn.onclick = async (e) => {
      const panel = e.target.closest('.floating-folder-panel');
      if (panel) {
        const fId = (panel.id === 'folderPanelLeft') ? leftPanelFolderId : rightPanelFolderId;
        const nameInput = panel.querySelector('.folder-name-input');
        if (fId && nameInput) {
          const isTemp = fId.startsWith('folder_temp_');
          const trimmedValue = nameInput.value.trim();
          const isEmpty = !trimmedValue;

          if (isTemp) {
            if (isEmpty) {
              const freshAll = await getSites();
              const fIndex = freshAll.findIndex(s => s.id === fId);
              if (fIndex !== -1) {
                freshAll.splice(fIndex, 1);
                await saveSites(freshAll);
              }
              panel.style.display = 'none';
              if (panel.id === 'folderPanelLeft') leftPanelFolderId = null;
              if (panel.id === 'folderPanelRight') rightPanelFolderId = null;
			  updateFolderHighlightStates(); // ⭐ 新增：取消新建文件夹时，同步更新高亮状态
              await renderNavGridUI();
              showToast(t('toast_folder_cancelled', "由于未给文件夹命名，已自动取消创建该文件夹。"), 5000);
              window.isCancellingFolder = false;
              return;
            } else {
              const freshAll = await getSites();
              let isNameExists = freshAll.some(s => s.type === 'folder' && s.id !== fId && s.name.trim().toLowerCase() === trimmedValue.toLowerCase());
              if (isNameExists) {
                alert(`⚠️ ` + t('err_dup_name', "发现已存在同名文件夹 [") + `${trimmedValue}` + t('err_dup_suffix', "]，请重新换个名字！"));
                setTimeout(() => { nameInput.focus(); nameInput.select(); }, 50);
                window.isCancellingFolder = false;
                return;
              }
              const fNode = freshAll.find(s => s.id === fId);
              if (fNode) {
                fNode.name = trimmedValue;
                fNode.u = Date.now() + localSkew;
                await saveSites(freshAll);
                await renderNavGridUI();
                triggerSyncUploadDebounced();
              }
            }
          } else {
            if (isEmpty) {
              alert("⚠️ " + t('err_empty_name', "文件夹名称不能为空！"));
              setTimeout(() => nameInput.focus(), 50);
              window.isCancellingFolder = false;
              return;
            } else {
              const freshAll = await getSites();
              let isNameExists = freshAll.some(s => s.type === 'folder' && s.id !== fId && s.name.trim().toLowerCase() === trimmedValue.toLowerCase());
              if (isNameExists) {
                alert(`⚠️ ` + t('err_dup_name', "发现已存在同名文件夹 [") + `${trimmedValue}` + t('err_dup_suffix', "]，请重新换个名字！"));
                setTimeout(() => { nameInput.focus(); nameInput.select(); }, 50);
                window.isCancellingFolder = false;
                return;
              }
              const fNode = freshAll.find(s => s.id === fId);
              if (fNode && fNode.name !== trimmedValue) {
                fNode.name = trimmedValue;
                fNode.u = Date.now() + localSkew;
                await saveSites(freshAll);
                await renderNavGridUI();
                triggerSyncUploadDebounced();
              }
            }
          }
        }
        panel.style.display = 'none';
        if (panel.id === 'folderPanelLeft') leftPanelFolderId = null;
        if (panel.id === 'folderPanelRight') rightPanelFolderId = null;
		updateFolderHighlightStates(); // ⭐ 新增：正常关闭面板时，同步更新高亮状态
      }
      window.isCancellingFolder = false;
    };
  });

  if (document.getElementById('syncNasEnableLoggedIn')) {
    document.getElementById('syncNasEnableLoggedIn').onchange = (e) => {
      chrome.storage.local.get(['syncNasConfig'], (res) => { const config = res.syncNasConfig || {}; config.autoEnable = e.target.checked; cachedSyncNasConfig.autoEnable = e.target.checked; chrome.storage.local.set({ syncNasConfig: config }); });
    };
  }
  if (document.getElementById('syncWebdavEnableLoggedIn')) {
    document.getElementById('syncWebdavEnableLoggedIn').onchange = (e) => {
      chrome.storage.local.get(['syncWebdavConfig'], (res) => { const config = res.syncWebdavConfig || {}; config.autoEnable = e.target.checked; cachedSyncWebdavConfig.autoEnable = e.target.checked; chrome.storage.local.set({ syncWebdavConfig: config }); });
    };
  }
  if (document.getElementById('syncBrowserEnableLoggedIn')) {
    document.getElementById('syncBrowserEnableLoggedIn').onchange = (e) => {
      chrome.storage.local.get(['syncBrowserConfig'], (res) => { const bConfig = res.syncBrowserConfig || {}; bConfig.autoEnable = e.target.checked; cachedSyncBrowserConfig.autoEnable = e.target.checked; chrome.storage.local.set({ syncBrowserConfig: bConfig }); });
    };
  }

  if (document.getElementById('btnNasForceUpload')) {
    document.getElementById('btnNasForceUpload').onclick = async () => {
      try { await uploadToNas(); alert('🎉 ' + t('alert_upload_success_nas', '上传成功！本地配置已覆盖 NAS 云端。')); } catch (err) { alert(`❌ ` + t('btn_force_upload', '上传失败:') + ` ${err}`); }
    };
  }
  if (document.getElementById('btnWebdavForceUpload')) {
    document.getElementById('btnWebdavForceUpload').onclick = async () => {
      try { await uploadToWebdavCloud(); alert('🎉 ' + t('alert_upload_success_webdav', '上传成功！本地配置已覆盖托管网盘端。')); } catch (err) { alert(`❌ ` + t('btn_force_upload', '上传失败:') + ` ${err}`); }
    };
  }
  if (document.getElementById('btnBrowserForceUpload')) {
    document.getElementById('btnBrowserForceUpload').onclick = async () => {
      try { await uploadToSupabaseCloud(); alert('🎉 ' + t('alert_upload_success_browser', '上传成功！本地配置已覆盖云端。')); } catch (err) { alert(`❌ ` + t('btn_force_upload', '上传失败:') + ` ${err}`); }
    };
  }
  if (document.getElementById('btnNasForceDownload')) {
    document.getElementById('btnNasForceDownload').onclick = async () => {
      if (confirm(t('confirm_download_nas', '确定要从 NAS 云端拉取并覆盖本地所有数据吗？'))) {
        try { await downloadFromNas(); reloadPageWithModalRestored(); } catch (err) { alert(`❌ ` + t('btn_force_download', '下载失败:') + ` ${err}`); }
      }
    };
  }
  if (document.getElementById('btnWebdavForceDownload')) {
    document.getElementById('btnWebdavForceDownload').onclick = async () => {
      if (confirm(t('confirm_download_webdav', '确定要从托管网盘端拉取并覆盖本地所有数据吗？'))) {
        try { await downloadFromWebdavCloud(); reloadPageWithModalRestored(); } catch (err) { alert(`❌ ` + t('btn_force_download', '下载失败:') + ` ${err}`); }
      }
    };
  }
  if (document.getElementById('btnBrowserForceDownload')) {
    document.getElementById('btnBrowserForceDownload').onclick = async () => {
      if (confirm(t('confirm_download_browser', '确定要用云端快照拉取并覆盖本地所有数据吗？'))) {
        try { await downloadFromSupabaseCloud(); reloadPageWithModalRestored(); } catch (err) { alert(`❌ ` + t('btn_force_download', '下载失败:') + ` ${err}`); }
      }
    };
  }
  makeFolderPanelDraggable('folderPanelLeft');
  makeFolderPanelDraggable('folderPanelRight');
});

function openSyncPanelDirectly() {
  chrome.storage.local.get(['syncBrowserConfig', 'syncNasConfig', 'syncWebdavConfig', 'activeSyncTab'], (res) => {
    cachedSyncBrowserConfig = res.syncBrowserConfig || {};
    cachedSyncNasConfig = res.syncNasConfig || {};
    cachedSyncWebdavConfig = res.syncWebdavConfig || {};
    const activeTab = res.activeSyncTab || 'browser';
    
    const panel = document.getElementById('syncModal');
    if (panel) {
      panel.style.display = 'flex'; 
      switchSyncTab(activeTab);

      if (document.getElementById('syncSupabaseEmail')) document.getElementById('syncSupabaseEmail').value = cachedSyncBrowserConfig.email || '';
      if (document.getElementById('syncSupabasePassword')) document.getElementById('syncSupabasePassword').value = cachedSyncBrowserConfig.password || '';

      if (document.getElementById('syncNasAddress')) document.getElementById('syncNasAddress').value = cachedSyncNasConfig.nasAddress || '';
      if (document.getElementById('syncNasPort')) document.getElementById('syncNasPort').value = cachedSyncNasConfig.nasPort || '';
      if (document.getElementById('syncNasPath')) document.getElementById('syncNasPath').value = cachedSyncNasConfig.nasPath || '';
      if (document.getElementById('syncNasUsername')) document.getElementById('syncNasUsername').value = cachedSyncNasConfig.username || '';
      if (document.getElementById('syncNasPassword')) document.getElementById('syncNasPassword').value = cachedSyncNasConfig.password || '';

      if (document.getElementById('webdavProviderSelect')) document.getElementById('webdavProviderSelect').value = cachedSyncWebdavConfig.provider || '';
      if (document.getElementById('syncWebdavUrl')) document.getElementById('syncWebdavUrl').value = cachedSyncWebdavConfig.url || '';
      if (document.getElementById('syncWebdavUsername')) document.getElementById('syncWebdavUsername').value = cachedSyncWebdavConfig.username || '';
      if (document.getElementById('syncWebdavPassword')) document.getElementById('syncWebdavPassword').value = cachedSyncWebdavConfig.password || '';
      
      triggerWebdavProviderSelectUIRefresh();
      triggerNasUrlPreviewUIRefresh();
    }
  });
}

let suggestionsDebounceTimer = null;
let activeSuggestionIdx = -1;

function initSearchSuggestions() {
  const input = document.getElementById('searchInput'); 
  const sugBox = document.getElementById('searchSuggestions');
  if (!input || !sugBox) return;

  input.addEventListener('focus', () => {
    if (!input.value.trim()) {
      showLocalSearchHistory();
    }
  });

  input.addEventListener('input', () => { 
    clearTimeout(suggestionsDebounceTimer); 
    const query = input.value.trim(); 
    if (!query) { 
      showLocalSearchHistory(); 
      return; 
    } 
    suggestionsDebounceTimer = setTimeout(() => { fetchEngineSuggestions(query); }, 150); 
  });

  input.addEventListener('keydown', (e) => {
    const items = sugBox.querySelectorAll('.suggestion-item'); 
    if (!items.length || sugBox.style.display === 'none') return;
    if (e.key === 'ArrowDown') { e.preventDefault(); activeSuggestionIdx = (activeSuggestionIdx + 1) % items.length; updateActiveSuggestion(items, input); } 
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeSuggestionIdx = (activeSuggestionIdx - 1 + items.length) % items.length; updateActiveSuggestion(items, input); } 
    else if (e.key === 'Escape') { e.preventDefault(); closeSuggestions(); }
  });

  document.addEventListener('click', (e) => { 
    if (!e.target.closest('.unified-search')) closeSuggestions(); 
  });
}

function showLocalSearchHistory() {
  const sugBox = document.getElementById('searchSuggestions'); if (!sugBox) return; sugBox.innerHTML = ''; activeSuggestionIdx = -1;
  chrome.storage.local.get(['mySearchLogs'], (res) => {
    const logs = res.mySearchLogs || []; if (!logs.length) { sugBox.style.display = 'none'; return; }
    logs.slice(0, 8).forEach(logText => {
      const item = document.createElement('div'); item.className = 'suggestion-item'; item.textContent = logText; item.style.color = "rgba(71, 85, 105, 0.65)"; 
      item.onclick = (e) => { e.stopPropagation(); const input = document.getElementById('searchInput'); if (input) input.value = logText; closeSuggestions(); executeSearch(); }; sugBox.appendChild(item);
    });
    sugBox.style.display = 'flex';
  });
}

function updateActiveSuggestion(items, input) { items.forEach((item, idx) => { if (idx === activeSuggestionIdx) { item.classList.add('active'); input.value = item.textContent; } else { item.classList.remove('active'); } }); }
function closeSuggestions() { const sugBox = document.getElementById('searchSuggestions'); if (sugBox) { sugBox.innerHTML = ''; sugBox.style.display = 'none'; } activeSuggestionIdx = -1; }

async function fetchEngineSuggestions(query) {
  let url = '', apiType = 'google';
  if (currentEngineId === 'baidu') { apiType = 'baidu'; url = `https://sp0.baidu.com/5a1Fazu8AA54nxGko9WTAnF6hhy/su?wd=${encodeURIComponent(query)}&cb=baiduSug_cb&ie=utf-8`; } 
  else if (currentEngineId === 'bing') { apiType = 'bing'; url = `https://api.bing.com/osjson.aspx?query=${encodeURIComponent(query)}`; } 
  else { apiType = 'google'; url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`; }
  try {
    const response = await fetch(url); if (!response.ok) return; let suggestions = [];
    if (apiType === 'baidu') {
      const text = await response.text(), match = text.match(/baiduSug_cb\((.*)\)/);
      if (match) {
        const arrMatch = match[1].match(/s:\s*\[([\s\S]*?)\]/);
        if (arrMatch) { const itemsText = arrMatch[1], items = itemsText.match(/"([^"\\\\]|\\\\.)*"/g) || []; suggestions = items.map(item => { try { return JSON.parse(item); } catch(e) { return item.slice(1, -1); } }); }
      }
    } else { const data = await response.json(); suggestions = data[1] || []; } renderSuggestionsList(suggestions);
  } catch (err) {}
}

function renderSuggestionsList(suggestions) {
  const sugBox = document.getElementById('searchSuggestions'); if (!sugBox) return; sugBox.innerHTML = ''; activeSuggestionIdx = -1; if (!suggestions || !suggestions.length) { sugBox.style.display = 'none'; return; }
  suggestions.slice(0, 8).forEach(sug => {
    const item = document.createElement('div'); item.className = 'suggestion-item'; item.textContent = sug;
    item.onclick = (e) => { e.stopPropagation(); const input = document.getElementById('searchInput'); if (input) input.value = sug; closeSuggestions(); executeSearch(); }; sugBox.appendChild(item);
  });
  sugBox.style.display = 'flex';
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  
  // ⭐ 监听本地存储 mySites 变化，实时触发 follower 重绘，阻断 onChanged 环路导致的上传 loop
  if (changes.mySites && !isSyncingInProgress) {
    renderNavGridUI();
    refreshOpenedFolderPanels();
    
    // ⭐ 修改：如果当前标签页是 Leader 且处于非同步同步状态，说明是本地发起的变更（如 Popup 新增卡片），触发云端同步上传
    if (isLeader) {
      triggerSyncUploadDebounced();
    } else {
      // 如果不是 Leader 标签页，重置本地探针周期以对齐
      adaptiveInterval = 3000;
      scheduleNextProbe();
    }
  }
});

function cleanMySitesForSync(sites) { 
  return (sites || []).map(s => { 
    const copy = { ...s }; delete copy.localIconBase64; 
    if (copy.type === 'folder' && copy.children) { copy.children = copy.children.map(c => { const cCopy = { ...c }; delete cCopy.localIconBase64; return cCopy; }); } return copy; 
  }); 
}

function cleanAndBuildWebdavUrl(addressOrUrl, port = '', path = '', channel = 'nas') {
  if (channel === 'webdav') {
    let raw = addressOrUrl.trim(); if (!raw) return ''; if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
    if (!raw.endsWith('/')) raw += '/'; return raw + 'STabSync/';
  }
  let addr = addressOrUrl.trim(); if (!addr) return ''; let prt = port.trim(), pth = path.trim();

  let finalProtocol = 'https://'; 
  if (/^https?:\/\//i.test(addr)) {
    const match = addr.match(/^(https?:\/\/)/i); if (match) finalProtocol = match[1].toLowerCase(); addr = addr.replace(/^https?:\/\//i, '');
  } else {
    if (prt === '5005' || prt === '5080') finalProtocol = 'http://';
  }

  addr = addr.split('/')[0].split(':')[0]; 

  let finalPortString = '';
  if (prt) {
    finalPortString = ':' + prt;
  } else {
    if (finalProtocol === 'https://') finalPortString = ':5006';
  }

  let finalPathString = '';
  if (pth) {
    if (!pth.startsWith('/')) pth = '/' + pth; if (!pth.endsWith('/')) pth = pth + '/'; finalPathString = pth;
  } else {
    finalPathString = (finalPortString === ':5006' || prt === '5006' || finalPortString === ':5005' || prt === '5005') ? '/home/' : '/';
  }
  return `${finalProtocol}${addr}${finalPortString}${finalPathString}STabSync/`;
}

function getSyncFileUrlForChannel(baseUrl, channel = 'nas') { let cleanBase = baseUrl.trim(); if (!cleanBase.endsWith('/')) cleanBase += '/'; return cleanBase + 's_tab_sync.json'; }

async function webdavRequest(url, method, username, password, body = null, headers = {}) {
  const auth = 'Basic ' + btoa(unescape(encodeURIComponent(username + ':' + password)));
  const options = { method: method, headers: { 'Authorization': auth, ...headers }, credentials: 'omit' }; if (body) options.body = body; return fetch(url, options);
}

// 📦 包含乐观自增序列锁与 Gzip 压缩的上传过程
async function uploadToNas() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['syncNasConfig', 'mySites', 'customFolders', 'customEngines', 'lastEngine', 'userTheme', 'engineIconSources', 'lastLocalUpdated', 'globalSuperPassword', 'globalGesturePassword', 'superPasswordHint', 'gesturePasswordHint', 'deletedIds', 'version_seq'], async (res) => {
      const config = res.syncNasConfig; if (!config || !config.nasAddress) { return reject('未配置 NAS 私有云服务器'); }
      
      const newSeq = (res.version_seq || 0) + 1; 
      let finalTheme = res.userTheme || 'theme-time';
      if (finalTheme === 'theme-glacier') finalTheme = 'theme-time';

      const syncData = {
        version: "3.2.3-full-gzip",
        timestamp: res.lastLocalUpdated || Date.now(),
        version_seq: newSeq, 
        deletedIds: res.deletedIds || {}, 
        payload: { 
          mySites: cleanMySitesForSync(res.mySites), 
          customFolders: res.customFolders || [], 
          customEngines: res.customEngines || [], 
          lastEngine: res.lastEngine || 'bing', 
          userTheme: finalTheme, 
          engineIconSources: res.engineIconSources || {},
          globalSuperPassword: res.globalSuperPassword || '',
          globalGesturePassword: res.globalGesturePassword || '',
          superPasswordHint: res.superPasswordHint || '',
          gesturePasswordHint: res.gesturePasswordHint || ''
        }
      };

      const finalTargetFolder = cleanAndBuildWebdavUrl(config.nasAddress, config.nasPort, config.nasPath, 'nas');
      try {
        try { await webdavRequest(finalTargetFolder, 'MKCOL', config.username, config.password); } catch (mk) {}
        
        const compressedB64 = await compressData(JSON.stringify(syncData)); 
        const jsonWrapper = JSON.stringify({ raw: compressedB64 });
        const response = await webdavRequest(getSyncFileUrlForChannel(finalTargetFolder, 'nas'), 'PUT', config.username, config.password, jsonWrapper, { 'Content-Type': 'application/json' });
        
        if (response.ok) {
          chrome.storage.local.set({ version_seq: newSeq });
          // ⭐ 上传成功后，立刻通过 HEAD 获取 Last-Modified 时间戳写入本地
          try {
            const headRes = await webdavRequest(getSyncFileUrlForChannel(finalTargetFolder, 'nas'), 'HEAD', config.username, config.password);
            if (headRes.ok) {
              const lastMod = headRes.headers.get('Last-Modified');
              if (lastMod) {
                chrome.storage.local.set({ lastSyncedNasLastModified: lastMod });
              }
            }
          } catch(e) {}
          resolve(); 
        } else {
          reject(`异常状态: ${response.status}`);
        }
      } catch (e) { reject(`连接异常: ${e.message}`); }
    });
  });
}

// 📦 包含解压与 LWW 双向合并的下载逻辑
async function downloadFromNas(newLastModified = null) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['syncNasConfig', 'mySites', 'deletedIds', 'version_seq', 'lastLocalUpdated'], async (res) => {
      const config = res.syncNasConfig; if (!config || !config.nasAddress) { return reject('未配置 NAS 服务器'); }
      const finalTargetFolder = cleanAndBuildWebdavUrl(config.nasAddress, config.nasPort, config.nasPath, 'nas');
      try {
        const response = await webdavRequest(getSyncFileUrlForChannel(finalTargetFolder, 'nas'), 'GET', config.username, config.password);
        if (response.status === 404) { return reject('云端无此同步文件'); } 
        if (!response.ok) { return reject(`HTTP 状态异常: ${response.status}`); }
        
        const rawPayloadStr = await response.text();
        const dataObj = JSON.parse(rawPayloadStr);
        let data;
        
        // 嗅探并自适应流解压
        if (dataObj && dataObj.raw && dataObj.raw.startsWith("gz:b64:")) {
          const decryptedStr = await decompressData(dataObj.raw);
          data = JSON.parse(decryptedStr);
        } else {
          data = dataObj;
        }
        
        if (data) {
          const nowTime = Date.now() + localSkew;
          chrome.storage.local.get(['deletedIds'], async (localDelRes) => {
            const localDeleted = localDelRes.deletedIds || {};
            const remoteDeleted = data.deletedIds || {};
            const localSites = res.mySites || [];
            const remoteSites = data.payload ? (data.payload.mySites || []) : [];
            
            const { mergedSites, mergedDeleted } = lwwMergeData(localSites, remoteSites, localDeleted, remoteDeleted, res.lastLocalUpdated || 0, data.timestamp || 0);
            const cleanParsedSites = strictFilterDuplicateUrlsAndMergeFolders(mergedSites);
            
            let downloadedTheme = data.payload ? (data.payload.userTheme || 'theme-time') : 'theme-time';
            if (downloadedTheme === 'theme-glacier') downloadedTheme = 'theme-time';

            isSyncingInProgress = true;
            
            // ⭐ 图标轮切检测清除器：同步比对合并结果，若发现图标索引发生变化，即刻清除本地 Base64 图标缓存
            chrome.storage.local.get(['s_tab_icon_cache'], (cacheRes) => {
              let iconCache = cacheRes.s_tab_icon_cache || {};
              let cacheChanged = false;

              const oldIconMap = new Map();
              const collectIdx = (list) => {
                (list || []).forEach(s => {
                  if (s.type === 'nav' && s.url) oldIconMap.set(s.url, s.iconSourceIdx);
                  else if (s.type === 'folder' && s.children) {
                    s.children.forEach(c => {
                      if (c.url) oldIconMap.set(c.url, c.iconSourceIdx);
                    });
                  }
                });
              };
              collectIdx(res.mySites);

              const checkIdxAndInvalidate = (list) => {
                (list || []).forEach(s => {
                  if (s.type === 'nav' && s.url) {
                    const oldIdx = oldIconMap.get(s.url);
                    if (oldIdx !== undefined && oldIdx !== s.iconSourceIdx) {
                      if (iconCache[s.url]) { delete iconCache[s.url]; cacheChanged = true; }
                    }
                  } else if (s.type === 'folder' && s.children) {
                    s.children.forEach(c => {
                      if (c.url) {
                        const oldIdx = oldIconMap.get(c.url);
                        if (oldIdx !== undefined && oldIdx !== c.iconSourceIdx) {
                          if (iconCache[c.url]) { delete iconCache[c.url]; cacheChanged = true; }
                        }
                      }
                    });
                  }
                });
              };
              checkIdxAndInvalidate(cleanParsedSites);

              let updateObj = { 
                mySites: cleanParsedSites, 
                deletedIds: mergedDeleted,
                version_seq: Math.max(res.version_seq || 0, data.version_seq || 0),
                customFolders: data.payload ? (data.payload.customFolders || []) : [], 
                customEngines: data.payload ? (data.payload.customEngines || []) : [], 
                lastEngine: data.payload ? (data.payload.lastEngine || 'bing') : 'bing', 
                userTheme: downloadedTheme, 
                engineIconSources: data.payload ? (data.payload.engineIconSources || {}) : {}, 
                globalSuperPassword: data.payload ? (data.payload.globalSuperPassword || '') : '',
                globalGesturePassword: data.payload ? (data.payload.globalGesturePassword || '') : '',
                superPasswordHint: data.payload ? (data.payload.superPasswordHint || '') : '',
                gesturePasswordHint: data.payload ? (data.payload.gesturePasswordHint || '') : '',
                lastLocalUpdated: data.timestamp || Date.now() 
              };
              if (newLastModified) {
                updateObj.lastSyncedNasLastModified = newLastModified;
              }
              if (cacheChanged) {
                updateObj.s_tab_icon_cache = iconCache;
              }

              chrome.storage.local.set(updateObj, () => { 
                isSyncingInProgress = false; 
                resolve(); 
              });
            });
          });
        } else { reject('数据校验失败'); }
      } catch (e) { reject(`连接异常: ${e.message}`); }
    });
  });
}

// 守护自动同步上传
function triggerNasAutoUpload() {
  if (navigator.onLine === false) {
    chrome.storage.local.get(['pendingSyncQueue'], (res) => {
      const queue = res.pendingSyncQueue || [];
      queue.push({ type: 'upload_nas', time: Date.now() });
      chrome.storage.local.set({ pendingSyncQueue: queue });
    });
    return;
  }
  chrome.storage.local.get(['syncNasConfig', 'mySites'], async (res) => {
    const config = res.syncNasConfig; if (!config || !config.nasAddress || config.autoEnable === false || (res.mySites || []).length === 0) return; try { await uploadToNas(); } catch (e) {}
  });
}

async function uploadToWebdavCloud() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['syncWebdavConfig', 'mySites', 'customFolders', 'customEngines', 'lastEngine', 'userTheme', 'engineIconSources', 'lastLocalUpdated', 'globalSuperPassword', 'globalGesturePassword', 'superPasswordHint', 'gesturePasswordHint', 'deletedIds', 'version_seq'], async (res) => {
      const config = res.syncWebdavConfig; if (!config || !config.url) { return reject('未锁定第三方云盘路径'); }
      
      const newSeq = (res.version_seq || 0) + 1; 
      let finalTheme = res.userTheme || 'theme-time';
      if (finalTheme === 'theme-glacier') finalTheme = 'theme-time';

      const syncData = {
        version: "3.2.3-full-gzip", 
        timestamp: res.lastLocalUpdated || Date.now(),
        version_seq: newSeq,
        deletedIds: res.deletedIds || {},
        payload: { 
          mySites: cleanMySitesForSync(res.mySites), 
          customFolders: res.customFolders || [], 
          customEngines: res.customEngines || [], 
          lastEngine: res.lastEngine || 'bing', 
          userTheme: finalTheme, 
          engineIconSources: res.engineIconSources || {},
          globalSuperPassword: res.globalSuperPassword || '',
          globalGesturePassword: res.globalGesturePassword || '',
          superPasswordHint: res.superPasswordHint || '',
          gesturePasswordHint: res.gesturePasswordHint || ''
        }
      };

      const finalTargetFolder = cleanAndBuildWebdavUrl(config.url, '', '', 'webdav');
      try {
        try { await webdavRequest(finalTargetFolder, 'MKCOL', config.username, config.password); } catch (mk) {}
        
        const compressedB64 = await compressData(JSON.stringify(syncData)); 
        const jsonWrapper = JSON.stringify({ raw: compressedB64 });
        const response = await webdavRequest(getSyncFileUrlForChannel(finalTargetFolder, 'webdav'), 'PUT', config.username, config.password, jsonWrapper, { 'Content-Type': 'application/json' });
        
        if (response.ok) {
          chrome.storage.local.set({ version_seq: newSeq });
          // ⭐ 物理同步闭环：迅速捕获 WebDAV 最新 Last-Modified 令牌
          try {
            const headRes = await webdavRequest(getSyncFileUrlForChannel(finalTargetFolder, 'webdav'), 'HEAD', config.username, config.password);
            if (headRes.ok) {
              const lastMod = headRes.headers.get('Last-Modified');
              if (lastMod) {
                chrome.storage.local.set({ lastSyncedWebdavLastModified: lastMod });
              }
            }
          } catch(e) {}
          resolve(); 
        } else reject(`异常状态: ${response.status}`);
      } catch (e) { reject(`连接异常: ${e.message}`); }
    });
  });
}

async function downloadFromWebdavCloud(newLastModified = null) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['syncWebdavConfig', 'mySites', 'deletedIds', 'version_seq', 'lastLocalUpdated'], async (res) => {
      const config = res.syncWebdavConfig; if (!config || !config.url) { return reject('未锁定第三方云盘路径'); }
      const finalTargetFolder = cleanAndBuildWebdavUrl(config.url, '', '', 'webdav');
      try {
        const response = await webdavRequest(getSyncFileUrlForChannel(finalTargetFolder, 'webdav'), 'GET', config.username, config.password);
        if (response.status === 404) { return reject('云盘端无此同步文件'); } 
        if (!response.ok) { return reject(`HTTP 状态异常: ${response.status}`); }
        
        const rawPayloadStr = await response.text();
        const dataObj = JSON.parse(rawPayloadStr);
        let data;
        
        if (dataObj && dataObj.raw && dataObj.raw.startsWith("gz:b64:")) {
          const decryptedStr = await decompressData(dataObj.raw);
          data = JSON.parse(decryptedStr);
        } else {
          data = dataObj; 
        }

        if (data) {
          // ⭐ 检测云端是否被显式重置/删除。若是，则直接跟随清空本地并退出登录
          if (data.isWiped === true) {
            isSyncingInProgress = true;
            chrome.storage.local.clear(() => {
              chrome.storage.local.set({ 
                mySites: [], customFolders: [], customEngines: [], lastEngine: 'bing', engineIconSources: {}, engineIconBase64: {}, lastLocalUpdated: Date.now() + localSkew, activeSyncTab: 'browser', userTheme: 'theme-time',
                deletedIds: {}, version_seq: 0, 
                syncBrowserConfig: { email: '', password: '', token: '', browserLoggedIn: false, autoEnable: true },
                syncNasConfig: { nasAddress: '', nasPort: '', nasPath: '', username: '', password: '', nasLoggedIn: false, autoEnable: true },
                syncWebdavConfig: { provider: '', url: '', username: '', password: '', webdavLoggedIn: false, autoEnable: true }
              }, () => { 
                isSyncingInProgress = false;
                window.location.reload(); 
              });
            });
            return resolve();
          }

          if (data.payload) {
            const remoteSeq = data.version_seq || 0;
            const localSeqCounter = res.version_seq || 0;

            const localDeleted = res.deletedIds || {};
            const remoteDeleted = data.deletedIds || {};

            const { mergedSites, mergedDeleted } = lwwMergeData(res.mySites || [], data.payload.mySites || [], localDeleted, remoteDeleted, res.lastLocalUpdated || 0, data.timestamp || 0);
            const cleanParsedSites = strictFilterDuplicateUrlsAndMergeFolders(mergedSites);
            
            let downloadedTheme = data.payload.userTheme || 'theme-time';
            if (downloadedTheme === 'theme-glacier') downloadedTheme = 'theme-time';

            isSyncingInProgress = true;
            
            // ⭐ 图标轮切检测清除器：同步比对合并结果，若发现图标索引发生变化，即刻清除本地 Base64 图标缓存
            chrome.storage.local.get(['s_tab_icon_cache'], (cacheRes) => {
              let iconCache = cacheRes.s_tab_icon_cache || {};
              let cacheChanged = false;

              const oldIconMap = new Map();
              const collectIdx = (list) => {
                (list || []).forEach(s => {
                  if (s.type === 'nav' && s.url) oldIconMap.set(s.url, s.iconSourceIdx);
                  else if (s.type === 'folder' && s.children) {
                    s.children.forEach(c => {
                      if (c.url) oldIconMap.set(c.url, c.iconSourceIdx);
                    });
                  }
                });
              };
              collectIdx(res.mySites);

              const checkIdxAndInvalidate = (list) => {
                (list || []).forEach(s => {
                  if (s.type === 'nav' && s.url) {
                    const oldIdx = oldIconMap.get(s.url);
                    if (oldIdx !== undefined && oldIdx !== s.iconSourceIdx) {
                      if (iconCache[s.url]) { delete iconCache[s.url]; cacheChanged = true; }
                    }
                  } else if (s.type === 'folder' && s.children) {
                    s.children.forEach(c => {
                      if (c.url) {
                        const oldIdx = oldIconMap.get(c.url);
                        if (oldIdx !== undefined && oldIdx !== c.iconSourceIdx) {
                          if (iconCache[c.url]) { delete iconCache[c.url]; cacheChanged = true; }
                        }
                      }
                    });
                  }
                });
              };
              checkIdxAndInvalidate(cleanParsedSites);

              let updateObj = { 
                mySites: cleanParsedSites, 
                deletedIds: mergedDeleted,
                version_seq: Math.max(localSeqCounter, remoteSeq),
                customFolders: data.payload.customFolders || [], 
                customEngines: data.payload.customEngines || [], 
                lastEngine: data.payload.lastEngine || 'bing', 
                userTheme: downloadedTheme, 
                engineIconSources: data.payload.engineIconSources || {}, 
                globalSuperPassword: data.payload.globalSuperPassword || '',
                globalGesturePassword: data.payload.globalGesturePassword || '',
                superPasswordHint: data.payload.superPasswordHint || '',
                gesturePasswordHint: data.payload.gesturePasswordHint || '',
                lastLocalUpdated: data.timestamp || Date.now() 
              };
              if (newLastModified) {
                updateObj.lastSyncedWebdavLastModified = newLastModified;
              }
              if (cacheChanged) {
                updateObj.s_tab_icon_cache = iconCache;
              }

              chrome.storage.local.set(updateObj, () => { 
                isSyncingInProgress = false; 
                resolve(); 
              });
            });
          } else { reject('数据包错误'); }
        } else { reject('数据包错误'); }
      } catch (e) { reject(`连接异常: ${e.message}`); }
    });
  });
}

function triggerWebdavAutoUpload() {
  if (navigator.onLine === false) {
    chrome.storage.local.get(['pendingSyncQueue'], (res) => {
      const queue = res.pendingSyncQueue || [];
      queue.push({ type: 'upload_webdav', time: Date.now() });
      chrome.storage.local.set({ pendingSyncQueue: queue });
    });
    return;
  }
  chrome.storage.local.get(['syncWebdavConfig', 'mySites'], async (res) => {
    const config = res.syncWebdavConfig; if (!config || !config.url || config.autoEnable === false || (res.mySites || []).length === 0) return; try { await uploadToWebdavCloud(); } catch (e) {}
  });
}

async function supabaseBypassAuthStub(email, password) {
  try {
    const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const parsed = await loginResponse.json();
    if (loginResponse.ok && parsed.access_token) {
      return { success: true, token: parsed.access_token };
    } else {
      return { success: false, message: parsed.error_description || parsed.msg || '密码错或账户未验证' };
    }
  } catch(e) {
    return { success: false, message: '通信异常' };
  }
}

async function uploadToSupabaseCloud() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['mySites', 'customFolders', 'customEngines', 'lastEngine', 'userTheme', 'engineIconSources', 'lastLocalUpdated', 'globalSuperPassword', 'globalGesturePassword', 'superPasswordHint', 'gesturePasswordHint', 'deletedIds', 'version_seq', 'syncBrowserConfig'], async (res) => {
      const bConfig = res.syncBrowserConfig || {}; if (!bConfig.browserLoggedIn) return reject('No account connected');
      const newSeq = (res.version_seq || 0) + 1;
      let finalTheme = res.userTheme || 'theme-time';
      if (finalTheme === 'theme-glacier') finalTheme = 'theme-time';

      const syncPayload = {
        version: "3.2.3-supabase",
        timestamp: res.lastLocalUpdated || Date.now(),
        version_seq: newSeq,
        deletedIds: res.deletedIds || {},
        payload: { 
          mySites: cleanMySitesForSync(res.mySites), 
          customFolders: res.customFolders || [], 
          customEngines: res.customEngines || [], 
          lastEngine: res.lastEngine || 'bing', 
          userTheme: finalTheme, 
          engineIconSources: res.engineIconSources || {},
          globalSuperPassword: res.globalSuperPassword || '',
          globalGesturePassword: res.globalGesturePassword || '',
          superPasswordHint: res.superPasswordHint || '',
          gesturePasswordHint: res.gesturePasswordHint || ''
        }
      };

      const compressed = await compressData(JSON.stringify(syncPayload));
      const uploadTimeStr = new Date().toISOString();

      try {
        let response = await fetch(`${SUPABASE_URL}/rest/v1/s_tab_sync`, {
          method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${bConfig.token}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
          body: JSON.stringify({ user_email: bConfig.email, data_pack: { raw: compressed }, updated_at: uploadTimeStr })
        });
        
        if (response.status === 401 && bConfig.password) {
          const loginRes = await supabaseBypassAuthStub(bConfig.email, bConfig.password);
          if (loginRes.success) {
            bConfig.token = loginRes.token;
            cachedSyncBrowserConfig.token = loginRes.token;
            chrome.storage.local.set({ syncBrowserConfig: bConfig });
            response = await fetch(`${SUPABASE_URL}/rest/v1/s_tab_sync`, {
              method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${loginRes.token}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
              body: JSON.stringify({ user_email: bConfig.email, data_pack: { raw: compressed }, updated_at: uploadTimeStr })
            });
          }
        }

        if (response.ok) {
          chrome.storage.local.set({ 
            version_seq: newSeq,
            lastSyncedUpdatedAt: uploadTimeStr
          });
          resolve();
        } else {
          reject(`云端更新失败: ${response.status}`);
        }
      } catch (err) { reject(err.message); }
    });
  });
}

async function downloadFromSupabaseCloud(newUpdatedAt = null) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['syncBrowserConfig', 'mySites', 'deletedIds', 'version_seq', 'lastLocalUpdated'], async (res) => {
      const bConfig = res.syncBrowserConfig || {}; if (!bConfig.email || !bConfig.token) { return reject('无合规令牌'); }
      try {
        let response = await fetch(`${SUPABASE_URL}/rest/v1/s_tab_sync?select=data_pack`, { method: 'GET', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${bConfig.token}` } });
        
        if (response.status === 401 && bConfig.password) {
          const loginRes = await supabaseBypassAuthStub(bConfig.email, bConfig.password);
          if (loginRes.success) {
            bConfig.token = loginRes.token;
            cachedSyncBrowserConfig.token = loginRes.token; 
            chrome.storage.local.set({ syncBrowserConfig: bConfig });
            response = await fetch(`${SUPABASE_URL}/rest/v1/s_tab_sync?select=data_pack`, { method: 'GET', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${loginRes.token}` } });
          }
        }

        if (!response.ok) { return reject(`拉取异常: ${response.status}`); } 
        const rows = await response.json();
        if (rows && rows.length > 0 && rows[0].data_pack) {
          const packEnvelope = rows[0].data_pack;
          let pack;
          
          if (packEnvelope && packEnvelope.raw && packEnvelope.raw.startsWith("gz:b64:")) {
            const decompressed = await decompressData(packEnvelope.raw);
            pack = JSON.parse(decompressed);
          } else {
            pack = packEnvelope;
          }

          if (pack) {
            // ⭐ 检测云端是否被显式重置/删除。若是，则直接跟随清空本地并退出登录
            if (pack.isWiped === true) {
              isSyncingInProgress = true;
              chrome.storage.local.clear(() => {
                chrome.storage.local.set({ 
                  mySites: [], customFolders: [], customEngines: [], lastEngine: 'bing', engineIconSources: {}, engineIconBase64: {}, lastLocalUpdated: Date.now() + localSkew, activeSyncTab: 'browser', userTheme: 'theme-time',
                  deletedIds: {}, version_seq: 0, 
                  syncBrowserConfig: { email: '', password: '', token: '', browserLoggedIn: false, autoEnable: true },
                  syncNasConfig: { nasAddress: '', nasPort: '', nasPath: '', username: '', password: '', nasLoggedIn: false, autoEnable: true },
                  syncWebdavConfig: { provider: '', url: '', username: '', password: '', webdavLoggedIn: false, autoEnable: true }
                }, () => { 
                  isSyncingInProgress = false;
                  window.location.reload(); 
                });
              });
              return resolve();
            }

            if (pack.payload) {
              if (pack.payload.mySites.length === 0 && (res.mySites || []).length > 0) { return resolve(); }
              
              const remoteSeq = pack.version_seq || 0;
              const localSeqCounter = res.version_seq || 0;

              const localDeleted = res.deletedIds || {};
              const remoteDeleted = pack.deletedIds || {};

              const { mergedSites, mergedDeleted } = lwwMergeData(res.mySites || [], pack.payload.mySites || [], localDeleted, remoteDeleted, res.lastLocalUpdated || 0, pack.timestamp || 0);
              const cleanParsedSites = strictFilterDuplicateUrlsAndMergeFolders(mergedSites);
              
              let downloadedTheme = pack.payload.userTheme || 'theme-time';
              if (downloadedTheme === 'theme-glacier') downloadedTheme = 'theme-time';

              isSyncingInProgress = true;
              
              // ⭐ 图标轮切检测清除器：同步比对合并结果，若发现图标索引发生变化，即刻清除本地 Base64 图标缓存
              chrome.storage.local.get(['s_tab_icon_cache'], (cacheRes) => {
                let iconCache = cacheRes.s_tab_icon_cache || {};
                let cacheChanged = false;

                const oldIconMap = new Map();
                const collectIdx = (list) => {
                  (list || []).forEach(s => {
                    if (s.type === 'nav' && s.url) oldIconMap.set(s.url, s.iconSourceIdx);
                    else if (s.type === 'folder' && s.children) {
                      s.children.forEach(c => {
                        if (c.url) oldIconMap.set(c.url, c.iconSourceIdx);
                      });
                    }
                  });
                };
                collectIdx(res.mySites);

                const checkIdxAndInvalidate = (list) => {
                  (list || []).forEach(s => {
                    if (s.type === 'nav' && s.url) {
                      const oldIdx = oldIconMap.get(s.url);
                      if (oldIdx !== undefined && oldIdx !== s.iconSourceIdx) {
                        if (iconCache[s.url]) { delete iconCache[s.url]; cacheChanged = true; }
                      }
                    } else if (s.type === 'folder' && s.children) {
                      s.children.forEach(c => {
                        if (c.url) {
                          const oldIdx = oldIconMap.get(c.url);
                          if (oldIdx !== undefined && oldIdx !== c.iconSourceIdx) {
                            if (iconCache[c.url]) { delete iconCache[c.url]; cacheChanged = true; }
                          }
                        }
                      });
                    }
                  });
                };
                checkIdxAndInvalidate(cleanParsedSites);

                let updateObj = { 
                  mySites: cleanParsedSites, 
                  deletedIds: mergedDeleted,
                  version_seq: Math.max(localSeqCounter, remoteSeq),
                  customFolders: pack.payload.customFolders || [], 
                  customEngines: pack.payload.customEngines || [], 
                  lastEngine: pack.payload.lastEngine || 'bing', 
                  userTheme: downloadedTheme, 
                  engineIconSources: pack.payload.engineIconSources || {}, 
                  globalSuperPassword: pack.payload.globalSuperPassword || '',
                  globalGesturePassword: pack.payload.globalGesturePassword || '',
                  superPasswordHint: pack.payload.superPasswordHint || '',
                  gesturePasswordHint: pack.payload.gesturePasswordHint || '',
                  lastLocalUpdated: pack.timestamp || Date.now() 
                };
                if (newUpdatedAt) {
                  updateObj.lastSyncedUpdatedAt = newUpdatedAt;
                }
                if (cacheChanged) {
                  updateObj.s_tab_icon_cache = iconCache;
                }

                chrome.storage.local.set(updateObj, () => { 
                  isSyncingInProgress = false; 
                  resolve(); 
                });
              });
            } else { reject('数据包错误'); }
          } else { reject('数据包错误'); }
        } else { reject('云端无快照'); }
      } catch (e) { reject(e.message); }
    });
  });
}

function triggerSupabaseAutoUpload() {
  if (navigator.onLine === false) {
    chrome.storage.local.get(['pendingSyncQueue'], (res) => {
      const queue = res.pendingSyncQueue || [];
      queue.push({ type: 'upload_supabase', time: Date.now() });
      chrome.storage.local.set({ pendingSyncQueue: queue });
    });
    return;
  }
  chrome.storage.local.get(['syncBrowserConfig', 'mySites'], async (res) => {
    const bConfig = res.syncBrowserConfig || {}; if (bConfig.autoEnable === false || !bConfig.email || !bConfig.token || (res.mySites || []).length === 0) return;
    try { await uploadToSupabaseCloud(); } catch (e) {}
  });
}

function initWebdavProviderDropdownSystem() {
  const select = document.getElementById('webdavProviderSelect'), urlInput = document.getElementById('syncWebdavUrl'), guideText = document.getElementById('lblWebdavAppPasswordGuide'); if (!select || !urlInput || !guideText) return;
  const presets = {
    jianguoyun: { url: "dav.jianguoyun.com/dav/", guide: "🔑 " + t('jianguo_password_guide', '密码获取指引：请登录坚果云网页版 ➔ 账户信息 ➔ 安全设置 ➔ 第三方应用管理 ➔ 添加应用生成随机专用授权密码。') },
    koofr: { url: "app.koofr.net/dav/Koofr/", guide: "🔑 App Passwords..." },
    yandex: { url: "webdav.yandex.com/", guide: "🔑 App Passwords..." },
    custom: { url: "", guide: "🔑 HTTP/HTTPS..." }
  };
  select.addEventListener('change', () => {
    const chosen = presets[select.value] || presets.custom; urlInput.value = chosen.url; guideText.innerText = chosen.guide;
    if (select.value === 'custom') { urlInput.removeAttribute('readonly'); urlInput.style.background = '#ffffff'; urlInput.style.cursor = 'text'; } 
    else { urlInput.setAttribute('readonly', 'true'); urlInput.style.background = 'rgba(0, 0, 0, 0.04)'; urlInput.style.cursor = 'not-allowed'; }
  });
}

function triggerWebdavProviderSelectUIRefresh() {
  const select = document.getElementById('webdavProviderSelect'), urlInput = document.getElementById('syncWebdavUrl'); if (select && urlInput) {
    if (select.value !== 'custom' && select.value !== '') { urlInput.setAttribute('readonly', 'true'); urlInput.style.background = 'rgba(0, 0, 0, 0.04)'; urlInput.style.cursor = 'not-allowed'; } 
    else { urlInput.removeAttribute('readonly'); urlInput.style.background = '#ffffff'; urlInput.style.cursor = 'text'; }
  }
}

function initNasUrlPreviewSystem() {
  const addr = document.getElementById('syncNasAddress'), port = document.getElementById('syncNasPort'), path = document.getElementById('syncNasPath'); if (!addr || !port || !path) return;
  const updater = () => { triggerNasUrlPreviewUIRefresh(); }; addr.addEventListener('input', updater); port.addEventListener('input', updater); path.addEventListener('input', updater);
}

function triggerNasUrlPreviewUIRefresh() {
  const addr = document.getElementById('syncNasAddress') ? document.getElementById('syncNasAddress').value.trim() : '';
  const port = document.getElementById('syncNasPort') ? document.getElementById('syncNasPort').value.trim() : '';
  const path = document.getElementById('syncNasPath') ? document.getElementById('syncNasPath').value.trim() : '';
  const preview = document.getElementById('lblNasUrlPreview'); if (!preview) return;
  if (!addr) { preview.innerText = 'https://192.168.1.100:5006/home/STabSync/'; return; } preview.innerText = cleanAndBuildWebdavUrl(addr, port, path, 'nas');
}

function toggleFloatingAboutWindow(panelId) {
  const target = document.getElementById(panelId); if (!target) return;
  if (target.style.display === "flex") target.style.display = "none";
  else { hideFloatingAboutWindows(); target.style.left = `calc(50vw - 580px)`; target.style.top = `calc(50vh - 220px)`; target.style.display = "flex"; }
}

function hideFloatingAboutWindows() { 
  document.querySelectorAll(".floating-about-window").forEach(p => {
    p.style.display = "none"; const xTrigger = p.querySelector('.style-close-floating');
    if (xTrigger && !xTrigger.onclick) { xTrigger.onclick = (e) => { e.stopPropagation(); p.style.display = 'none'; }; }
  }); 
}

async function openFolderPanel(folderId, isFreshCreated = false) {
  const all = await getSites(); let folderObj = all.find(s => s.id === folderId);
  if (!folderObj && folderId === 'folder_uncategorized') folderObj = { id: "folder_uncategorized", type: "folder", name: "未分类", children: [] };
  if (!folderObj || leftPanelFolderId === folderId || rightPanelFolderId === folderId) return;
  const syncPanel = document.getElementById('syncModal'); if (syncPanel && syncPanel.style.display === 'flex') { syncPanel.style.display = 'none'; hideFloatingAboutWindows(); }
  let targetPanelId = '';
  if (!leftPanelFolderId) { leftPanelFolderId = folderId; targetPanelId = 'folderPanelLeft'; } 
  else if (!rightPanelFolderId) { rightPanelFolderId = folderId; targetPanelId = 'folderPanelRight'; } 
  else { document.getElementById('folderPanelLeft').style.display = 'none'; leftPanelFolderId = rightPanelFolderId; rightPanelFolderId = folderId; renderSingleFolderContent('folderPanelLeft', leftPanelFolderId, false); targetPanelId = 'folderPanelRight'; }
  
  // ⭐️ 新增：打开文件夹面板时，重置坐标回到预设的默认位置
  const panel = document.getElementById(targetPanelId);
  if (panel) {
    panel.style.top = `-376px`;
    panel.style.left = (targetPanelId === 'folderPanelRight') ? `410px` : `-12px`;
  }

  renderSingleFolderContent(targetPanelId, folderId, isFreshCreated);
  updateFolderHighlightStates(); // ⭐ 新增：打开文件夹面板后更新高亮状态
}

async function renderSingleFolderContent(panelId, folderId, shouldFocusAndSelect = false) {
  const panel = document.getElementById(panelId); if (!panel) return; 
  
  if (!folderRenderIds[panelId]) folderRenderIds[panelId] = 0;
  const renderId = ++folderRenderIds[panelId]; // 分派内层最新的渲染 ID
  
  const all = await getSites();
  if (renderId !== folderRenderIds[panelId]) return; // 丢弃过期渲染
  
  let folderObj = all.find(s => s.id === folderId) || (folderId === 'folder_uncategorized' ? { id: "folder_uncategorized", type: "folder", name: "未分类", children: [] } : null);
  if (!folderObj) { panel.style.display = 'none'; if (panelId === 'folderPanelLeft') leftPanelFolderId = null; if (panelId === 'folderPanelRight') rightPanelFolderId = null; return; }
  panel.style.display = 'flex'; panel.style.height = `356px`;
  
  const inputName = panel.querySelector('.folder-name-input'); inputName.value = (folderId === 'folder_uncategorized') ? t('uncategorized', folderObj.name) : folderObj.name; inputName.disabled = (folderId === 'folder_uncategorized'); inputName.style.opacity = (folderId === 'folder_uncategorized') ? '0.65' : '1';
  if (shouldFocusAndSelect && folderId !== 'folder_uncategorized') { setTimeout(() => { inputName.focus(); inputName.select(); }, 60); }
  
  inputName.onblur = async () => {
    if (window.isCancellingFolder) return; 
    if (folderId === 'folder_uncategorized') return; const v = inputName.value.trim(); if (!v) { alert("⚠️ " + t('err_empty_name', "文件夹名称不能为空！")); setTimeout(() => { inputName.focus(); inputName.select(); }, 50); return; }
    const freshAll = await getSites(), isNameExists = freshAll.some(s => s.type === 'folder' && s.id !== folderId && s.name.trim().toLowerCase() === v.toLowerCase());
    if (isNameExists) { alert(`⚠️ ` + t('err_dup_name', "发现已存在同名文件夹 [") + `${v}` + t('err_dup_suffix', "]，请重新换个名字！")); setTimeout(() => { inputName.focus(); inputName.select(); }, 50); return; }
    const fNode = freshAll.find(s => s.id === folderId); if (fNode && fNode.name !== v) { fNode.name = v; fNode.u = Date.now() + localSkew; await saveSites(freshAll); await renderNavGridUI(); triggerSyncUploadDebounced(); }
  };
  inputName.onkeydown = (e) => { if (e.key === 'Enter') inputName.blur(); };
  
  const isEncrypted = !!folderObj.isEncrypted;
  const padlockBtn = panel.querySelector('.folder-lock-trigger-btn');
  const incognitoBtn = panel.querySelector('.folder-incognito-trigger-btn');

  if (padlockBtn) {
    if (folderId === 'folder_uncategorized') {
      padlockBtn.style.display = 'none';
    } else {
      padlockBtn.style.display = 'inline-block';
      padlockBtn.innerText = isEncrypted ? '🔒' : '🔓';
      padlockBtn.setAttribute('title', isEncrypted ? t('folder_encrypted_title', '该文件夹已加密，点击以解密操作') : t('folder_unencrypted_title', '该文件夹未加密，点击以进行加密操作'));
      
      padlockBtn.onclick = (e) => {
        e.stopPropagation();
        toggleFolderEncryptionState(folderId);
      };
    }
  }

  if (incognitoBtn) {
    if (isEncrypted) {
      incognitoBtn.style.display = 'inline-flex';
      const isOpen = !folderObj.openInIncognito;
      if (isOpen) {
        incognitoBtn.innerHTML = SVG_EYE_OPEN;
        incognitoBtn.setAttribute('title', t('incognito_normal_title', '当前：普通模式。\n点击切换为：无痕模式（在此文件夹内点击网址将使用无痕/隐私窗口打开，不记录浏览器痕迹）'));
      } else {
        incognitoBtn.innerHTML = SVG_EYE_CLOSED;
        incognitoBtn.setAttribute('title', t('incognito_incognito_title', '当前：无痕模式。在此模式下，点击网页将不会留下历史记录 or Cookie，关闭后痕迹全无。\n点击此图标可切回普通模式'));
      }
      incognitoBtn.onclick = async (e) => {
        e.stopPropagation();
        const freshAll = await getSites();
        const fNode = freshAll.find(s => s.id === folderId);
        if (fNode) {
          fNode.openInIncognito = !fNode.openInIncognito;
          fNode.u = Date.now() + localSkew;
          await saveSites(freshAll);
          renderSingleFolderContent(panelId, folderId, false);
          triggerSyncUploadDebounced();
        }
      };
    } else {
      incognitoBtn.style.display = 'none';
      incognitoBtn.onclick = null;
    }
  }

  const line1 = panel.querySelector('.folder-encrypt-line-1'), line2Left = panel.querySelector('.folder-encrypt-line-2-left');
  if (isEncrypted) {
    if (line1) line1.style.display = 'flex'; if (line2Left) line2Left.style.display = 'flex'; const chkThumbs = panel.querySelector('.chk-hide-thumbnails');
    if (chkThumbs) {
      chkThumbs.checked = folderObj.hideThumbnails !== false;
      chkThumbs.onchange = async () => { const freshAll = await getSites(), fNode = freshAll.find(s => s.id === folderId); if (fNode) { fNode.hideThumbnails = chkThumbs.checked; fNode.u = Date.now() + localSkew; await saveSites(freshAll); renderNavGridUI(); triggerSyncUploadDebounced(); } };
    }
    const chkSearch = panel.querySelector('.chk-disable-search');
    if (chkSearch) {
      chkSearch.checked = folderObj.disableSNavSearch !== false;
      chkSearch.onchange = async () => { const freshAll = await getSites(), fNode = freshAll.find(s => s.id === folderId); if (fNode) { fNode.disableSNavSearch = chkSearch.checked; fNode.u = Date.now() + localSkew; await saveSites(freshAll); triggerSyncUploadDebounced(); } };
    }
  } else { if (line1) line1.style.display = 'none'; if (line2Left) line2Left.style.display = 'none'; }
  const currentView = folderObj.viewMode || 'grid';
folderViewStates[panelId] = currentView; // 同步维护局部视图缓存
const zone = panel.querySelector('.folder-panel-scrollzone');
  zone.className = `folder-panel-scrollzone view-${currentView}`; panel.querySelector('.folder-view-toggle-btn').innerText = currentView === 'grid' ? t('folder_view_toggle', '列表视图 ☰') : t('folder_view_toggle_grid', '网格视图 ☷');
  panel.querySelector('.folder-view-toggle-btn').onclick = async (e) => {
  e.stopPropagation();
  const targetView = (currentView === 'grid') ? 'list' : 'grid';
  const freshAll = await getSites();
  const fNode = freshAll.find(s => s.id === folderId);
  if (fNode) {
    fNode.viewMode = targetView;
    fNode.u = Date.now() + localSkew;
    await saveSites(freshAll);
    renderSingleFolderContent(panelId, folderId, false);
    triggerSyncUploadDebounced();
  } else if (folderId === 'folder_uncategorized') {
    let uncat = freshAll.find(s => s.id === 'folder_uncategorized');
    if (!uncat) {
      uncat = { id: "folder_uncategorized", type: "folder", name: "未分类", children: [], u: Date.now() + localSkew };
      freshAll.push(uncat);
    }
    uncat.viewMode = targetView;
    uncat.u = Date.now() + localSkew;
    await saveSites(freshAll);
    renderSingleFolderContent(panelId, folderId, false);
    triggerSyncUploadDebounced();
  }
};
  
  // ⭐ 原子渲染：完全对齐回调异步，杜绝渲染抖动
  chrome.storage.local.get(['s_tab_icon_cache'], (cacheRes) => {
    if (renderId !== folderRenderIds[panelId]) return; // 丢弃过期回调
    
    zone.innerHTML = ''; // 在存储拿到数据的一瞬间清空并填充
    const sTabIconCache = cacheRes.s_tab_icon_cache || {};
    
    (folderObj.children || []).forEach((child, cIdx) => {
      const el = document.createElement('div'); el.className = "site"; el.setAttribute('data-id', child.id); el.setAttribute('title', child.name);
      
      const cachedChildIcon = sTabIconCache[child.url];
      const src = (cachedChildIcon && cachedChildIcon.icon) ? cachedChildIcon.icon : (child.localIconBase64 || getFaviconUrlBySource(child.url, child.iconSourceIdx || 0));
      const b64Attr = (cachedChildIcon || child.localIconBase64) ? ' data-base64-processed="true"' : '';
      
      if (currentView === 'list') { 
        el.innerHTML = `<img src="${src}" data-url="${child.url}" data-startidx="${child.iconSourceIdx || 0}" data-attempt="0" data-realindex="${all.indexOf(child)}"${b64Attr}><div class="site-title-text" style="pointer-events:none!important;">${child.name}</div><div class="more-actions-3dots"><span></span><span></span><span></span></div>`; 
      } 
      else { 
        el.innerHTML = `<div class="card-body"><div class="drag-handle-4dots"><span></span><span></span><span></span><span></span></div><img src="${src}" data-url="${child.url}" data-startidx="${child.iconSourceIdx || 0}" data-attempt="0" data-realindex="${all.indexOf(child)}"${b64Attr}><div class="more-actions-3dots"><span></span><span></span><span></span></div></div><div class="site-title-text" style="pointer-events:none!important;">${child.name}</div>`; 
      }
      
      el.onclick = (e) => { 
        if(e.target.closest('.drag-handle-4dots') || e.target.closest('.more-actions-3dots')) return; 
        if (folderObj.openInIncognito) {
          e.preventDefault();
          chrome.windows.create({ url: child.url, incognito: true });
        } else {
          handleWebpageCardClick(e, child.url); 
        }
      };
      
      let parentFolderIndexInAll = all.indexOf(folderObj); if (parentFolderIndexInAll === -1 && folderId === 'folder_uncategorized') { parentFolderIndexInAll = all.findIndex(s => s.id === "folder_uncategorized"); }
      bind3DotsMenuEvent(el.querySelector('.more-actions-3dots'), child, parentFolderIndexInAll, folderId);
      el.oncontextmenu = (e) => {
  e.preventDefault(); openContextMenu(e, [
    { text: "🔄 " + t('menu_change_icon_nested', "换内层图标"), action: () => rotateNestedChildIcon(folderId, child.id) },
    { text: "✏️ " + t('menu_edit_nested_nav', "修改内层导航"), action: () => triggerEditNestedChildModal(folderId, child.id) }
  ]);
};
      zone.appendChild(el);
    });
  });

  Sortable.create(zone, {
    animation: 150, group: { name: "s-tabs-group", put: (to, from, dragEl) => !(dragEl.id === 'btnTemplateAddFolderCard' || dragEl.querySelector('.folder-thumb-grid')) },
    draggable: ".site", handle: currentView === 'grid' ? ".drag-handle-4dots" : null, onEnd: async () => {
      await commitCrossDragDataToStorage();
      triggerSyncUploadDebounced(); 
    }
  });
}

async function rotateNestedChildIcon(folderId, childId) {
  const all = await getSites();
  let folder = all.find(s => s.id === folderId) || (folderId === 'folder_uncategorized' ? all.find(s => s.id === "folder_uncategorized") : null);
  if (folder && folder.children) {
    let child = folder.children.find(c => c.id === childId);
    if (child) {
      openIconSelectorModal('nested', child.url, { folderId, childId, currentIdx: child.iconSourceIdx });
    }
  }
}

let globalNestedFolderId = null, globalNestedChildId = null;
async function triggerEditNestedChildModal(folderId, childId) {
  const all = await getSites(); let folder = all.find(s => s.id === folderId) || (folderId === 'folder_uncategorized' ? all.find(s => s.id === "folder_uncategorized") : null);
  if (folder && folder.children) {
    let child = folder.children.find(c => c.id === childId);
    if (child) {
      globalNestedFolderId = folderId; globalNestedChildId = childId; globalCurrentEditType = 'nav'; globalCurrentEditIndex = -99;
      document.getElementById('modalTitle').innerText = t('modal_edit_title', "修改内层属性"); document.getElementById('modalName').value = child.name; document.getElementById('modalUrl').value = child.url;
      document.getElementById('modalUrlField').style.display = "block"; document.getElementById('siteModal').style.display = "flex";
      const btn = document.getElementById('btnConfirmModal');
      btn.onclick = async () => {
        const name = document.getElementById('modalName').value.trim(); let url = document.getElementById('modalUrl').value.trim();
        if(!name || !url) return alert(t('alert_required_fields', "参数不允许留空！")); if(!url.startsWith('http')) url = "https://" + url;
        const freshAll = await getSites(), minUrl = url.trim().toLowerCase().replace(/\/$/, "");
        let isDuplicate = freshAll.some(s => {
          if (s.type === 'nav' && s.url && s.url.trim().toLowerCase().replace(/\/$/, "") === minUrl) return true;
          if (s.type === 'folder' && s.children) { return s.children.some(c => c.id !== globalNestedChildId && c.url && c.url.trim().toLowerCase().replace(/\/$/, "") === minUrl); } return false;
        });
        if (isDuplicate) { alert("💡 " + t('toast_dup', "提示：该网址已存在。")); return; }
        let fNode = freshAll.find(s => s.id === globalNestedFolderId) || (globalNestedFolderId === 'folder_uncategorized' ? freshAll.find(s => s.id === "folder_uncategorized") : null);
        if (fNode && fNode.children) {
          let freshChild = fNode.children.find(c => c.id === globalNestedChildId);
          if (freshChild) { 
            const nowTime = Date.now() + localSkew;
            freshChild.name = name; 
            freshChild.u = nowTime; 
            fNode.u = nowTime; 
            if (freshChild.url !== url) { freshChild.url = url; delete freshChild.localIconBase64; } 
          }
        }
        await saveSites(freshAll); document.getElementById('siteModal').style.display = "none"; renderNavGridUI(); refreshOpenedFolderPanels(); btn.onclick = handleSiteModalConfirm;
        triggerSyncUploadDebounced();
      };
    }
  }
}

async function moveChildOutToMainGrid(folderId, childId) {
  const all = await getSites(); let folder = all.find(s => s.id === folderId) || (folderId === 'folder_uncategorized' ? all.find(s => s.id === "folder_uncategorized") : null);
  if (folder && folder.children) {
    let cIdx = folder.children.findIndex(c => c.id === childId);
    if (cIdx !== -1) { 
      const nowTime = Date.now() + localSkew;
      const movedChild = folder.children.splice(cIdx, 1)[0];
      movedChild.u = nowTime; 
      folder.u = nowTime; 
      all.unshift(movedChild); 
      await saveSites(all); 
      renderNavGridUI(); 
      refreshOpenedFolderPanels(); 
      triggerSyncUploadDebounced();
    }
  }
}

async function commitCrossDragDataToStorage() {
  const oldAll = await getSites(), pool = {}; if (window.draggedItemForSync) pool[window.draggedItemForSync.id] = window.draggedItemForSync;
  oldAll.forEach(s => { pool[s.id] = s; if (s.type === 'folder' && s.children) s.children.forEach(c => { pool[c.id] = c; }); });
  if (!pool["folder_uncategorized"]) pool["folder_uncategorized"] = { id: "folder_uncategorized", type: "folder", name: t('uncategorized', "未分类"), children: [] };
  const finalAll = [], processed = new Set();
  const nowTime = Date.now() + localSkew;

  document.querySelectorAll('#navGrid .site[data-id]').forEach(el => {
    const id = el.getAttribute('data-id'); if (pool[id]) { 
      let node = pool[id]; 
      node.u = nowTime; // ⭐ 强行刷新卡片本体的时间戳，表示它是此刻被最新手动更改/移动的对象
      if (node.type === 'folder' && (node.id === leftPanelFolderId || node.id === rightPanelFolderId)) node.children = []; 
      finalAll.push(node); 
      processed.add(id); 
    }
  });
  const parsePanel = (panelId, folderId) => {
    if (!folderId) return; const pEl = document.getElementById(panelId); if (!pEl || pEl.style.display === 'none') return;
    let fNode = finalAll.find(s => s.id === folderId) || pool[folderId]; if (fNode && !finalAll.includes(fNode)) finalAll.push(fNode);
    if (!fNode) return; fNode.children = []; processed.add(folderId);
    pEl.querySelectorAll('.folder-panel-scrollzone .site[data-id]').forEach(card => { 
      const cId = card.getAttribute('data-id'); 
      if (pool[cId]) { 
        let childNode = pool[cId];
        childNode.u = nowTime; // ⭐ 强行刷新卡片本体的时间戳，表示它是此刻被最新手动更改/移动的对象
        fNode.children.push(childNode); 
        processed.add(cId); 
      } 
    });
    
    fNode.u = nowTime; 
  };
  parsePanel('folderPanelLeft', leftPanelFolderId); parsePanel('folderPanelRight', rightPanelFolderId);
  oldAll.forEach(s => { if (s.type === 'folder' && s.children) s.children.forEach(c => { if (!processed.has(c.id)) { finalAll.push(c); processed.add(c.id); } }); });
  oldAll.forEach(s => { if (s.type === 'nav' && !processed.has(s.id)) { finalAll.push(s); processed.add(s.id); } });
  if (!processed.has("folder_uncategorized")) finalAll.push(pool["folder_uncategorized"]);
  await saveSites(finalAll); await renderNavGridUI(); refreshOpenedFolderPanels();
}

function refreshOpenedFolderPanels() { if (leftPanelFolderId) renderSingleFolderContent('folderPanelLeft', leftPanelFolderId, false); if (rightPanelFolderId) renderSingleFolderContent('folderPanelRight', rightPanelFolderId, false); }

function initSNavSearchSystem() {
  const input = document.getElementById('snavSearchInput'), resultsBox = document.getElementById('snavSearchResults'); if (!input || !resultsBox) return;

  Sortable.create(resultsBox, {
    group: {
      name: "s-tabs-group",
      pull: true,
      put: false
    },
    animation: 150,
    onStart: function() {
      isDraggingFromSearch = true;
    },
    onEnd: async function(evt) {
      isDraggingFromSearch = false;
      
      const finishDragAndClear = () => {
        input.value = '';
        resultsBox.innerHTML = '';
        resultsBox.style.display = 'none';
      };

      if (evt.to && evt.to !== evt.from) {
        const dragId = evt.item.getAttribute('data-id');
        const destContainer = evt.to; 
        
        let destName = t('snav_header_text', "S导航主网格");
        let destFolderId = null;
        let destType = 'grid';
        
        if (destContainer.id === 'navGrid') {
          destType = 'grid';
          destName = t('snav_header_text', "S导航主网格");
        } else {
          destType = 'folder';
          const panel = destContainer.closest('.floating-folder-panel');
          if (panel) {
            destFolderId = (panel.id === 'folderPanelLeft') ? leftPanelFolderId : rightPanelFolderId;
            const allSites = await getSites();
            const fNode = allSites.find(s => s.id === destFolderId) || (destFolderId === 'folder_uncategorized' ? { name: t('uncategorized', "未分类") } : null);
            destName = fNode ? `"${fNode.name}"` : "Folder";
          }
        }
        
        const allSites = await getSites();
        let draggedItem = null;
        let sourceParent = null;
        
        const inGridIdx = allSites.findIndex(s => s.type === 'nav' && s.id === dragId);
        if (inGridIdx !== -1) {
          draggedItem = allSites[inGridIdx];
          sourceParent = 'grid';
        } else {
          for (let f of allSites) {
            if (f.type === 'folder' && f.children && f.children.some(c => c.id === dragId)) {
              const cIdx = f.children.findIndex(c => c.id === dragId);
              draggedItem = f.children[cIdx];
              sourceParent = f.id;
              break;
            }
          }
        }
        
        if (!draggedItem) {
  evt.item.remove();
  showToast("❌ " + t('toast_drag_failed', "移动失败"));
  finishDragAndClear();
  return;
}
        
        const isDuplicate = allSites.some(s => {
          if (s.id === destFolderId) return false;
          if (s.type === 'nav' && s.url === draggedItem.url) return true;
          if (s.type === 'folder' && s.children) {
            return s.children.some(c => c.url === draggedItem.url);
          }
          return false;
        });
        
        if (isDuplicate) {
          showToast(t('status_already_exists', '该网址已存在在目标文件夹中！'));
          evt.item.remove();
          await renderNavGridUI();
          refreshOpenedFolderPanels();
        } else {
          await commitCrossDragDataToStorage();
          triggerSyncUploadDebounced();
        }
      }
      finishDragAndClear();
    }
  });

  input.addEventListener('input', async () => {
    const q = input.value.trim().toLowerCase(); if (!q) { resultsBox.innerHTML = ''; resultsBox.style.display = 'none'; return; }
    const all = await getSites(), matches = [];
    all.forEach(node => {
      if (!node) return;
      if (node.type === 'nav' && node.name && node.url) { if (node.name.toLowerCase().includes(q) || node.url.toLowerCase().includes(q)) { matches.push(node); } } 
      else if (node.type === 'folder') {
        const isEncrypted = !!node.isEncrypted, disableSearch = node.disableSNavSearch !== false;
        if (!isEncrypted || !disableSearch) { if (node.children) { node.children.forEach(child => { if (child.name.toLowerCase().includes(q) || (child.url && child.url.toLowerCase().includes(q))) { matches.push(child); } }); } }
      }
    });
    renderSNavSearchResultsList(matches);
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('.snav-search-wrapper')) { resultsBox.innerHTML = ''; resultsBox.style.display = 'none'; } });

  const snavWrapper = document.querySelector('.snav-search-wrapper');
  let snavLeaveTimer = null;
  if (snavWrapper) {
    snavWrapper.addEventListener('mouseleave', () => {
      snavLeaveTimer = setTimeout(() => {
        if (isDraggingFromSearch) return;
        input.value = '';
        resultsBox.innerHTML = '';
        resultsBox.style.display = 'none';
      }, 500); 
    });
    snavWrapper.addEventListener('mouseenter', () => {
      if (snavLeaveTimer) {
        clearTimeout(snavLeaveTimer);
        snavLeaveTimer = null;
      }
    });
  }
}

function renderSNavSearchResultsList(results) {
  const snavResults = document.getElementById('snavSearchResults'); if (!snavResults) return; snavResults.innerHTML = ''; if (results.length === 0) { snavResults.style.display = 'none'; return; }
  results.forEach(child => {
    const el = document.createElement('div'); el.className = 'site'; el.setAttribute('data-id', child.id); el.setAttribute('title', child.name);
    el.innerHTML = `<img src="${child.localIconBase64 || getFaviconUrlBySource(child.url, child.iconSourceIdx || 0)}" style="width:18px; height:18px; object-fit:contain; border-radius:3px;"><div class="site-title-text" style="text-align:left; margin-top:0; flex:1; font-size:13px; font-weight:600; color:#334155; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; pointer-events:none!important;">${child.name}</div>`;
    
    el.onclick = async (e) => { 
      e.preventDefault();
      const allSites = await getSites();
      let parentFolder = null;
      for (let f of allSites) {
        if (f.type === 'folder' && f.children && f.children.some(c => c.id === child.id)) {
          parentFolder = f;
          break;
        }
      }
      if (parentFolder && parentFolder.openInIncognito) {
        chrome.windows.create({ url: child.url, incognito: true });
      } else {
        handleWebpageCardClick(e, child.url); 
      }
      if (!e.ctrlKey) { 
        document.getElementById('snavSearchInput').value = ''; 
        snavResults.style.display = 'none'; 
      } 
    }; 
    snavResults.appendChild(el);
  });
  snavResults.style.display = 'flex';
}

function showToast(msg, duration = 2000) {
  const existing = document.getElementById('s-custom-toast'); if (existing) existing.remove();
  const toast = document.createElement('div'); toast.id = 's-custom-toast';
  toast.style.cssText = `position: fixed; bottom: 40px; left: 50%; transform: translate(-50%, 0); background: rgba(255, 255, 255, 0.9); border: 1px solid rgba(0, 0, 0, 0.08); color: #1e293b; padding: 11px 24px; border-radius: 12px; font-size: 13.5px; font-weight: 700; box-shadow: 0 12px 35px rgba(15, 23, 42, 0.08); z-index: 10005;`;
  toast.innerText = msg; document.body.appendChild(toast);
  setTimeout(() => toast.remove(), duration);
}

setTimeout(() => { const sbAboutBtn = document.querySelector('.sb-about-anchor-trigger'); if (sbAboutBtn && !sbAboutBtn.onclick) { sbAboutBtn.onclick = (e) => { e.stopPropagation(); toggleFloatingAboutWindow('supabaseAboutPanel'); }; } }, 500);

/* ========================================================================= */
/* 🔒 全局单密码加密机制与全新密码管理/设置向导/统一安全验证组件核心代码 */
/* ========================================================================= */

function openSuperPasswordModal() {
  chrome.storage.local.get(['globalSuperPassword', 'globalGesturePassword', 'superPasswordHint', 'gesturePasswordHint'], (res) => {
    const isPwdSet = !!res.globalSuperPassword && !!res.globalGesturePassword;
    
    const noPwdWarning = document.getElementById('encNoPwdWarning');
    const hasPwdView = document.getElementById('encHasPwdView');
    const actionButtonsBlock = document.getElementById('encActionButtonsBlock');
    
    if (isPwdSet) {
      if (noPwdWarning) noPwdWarning.style.display = 'none';
      if (hasPwdView) hasPwdView.style.display = 'block';
      if (actionButtonsBlock) actionButtonsBlock.style.display = 'flex';
      
      const charHintSpan = document.getElementById('lnkShowCharPwdHint');
      if (charHintSpan) {
        charHintSpan.onclick = (e) => {
          e.stopPropagation();
          alert(res.superPasswordHint ? t('alert_char_pwd_hint', "字符密码线索提示：") + `\n"${res.superPasswordHint}"` : t('alert_no_hint', "您未设置过密码提示。"));
        };
      }
      
      const gestureHintSpan = document.getElementById('lnkShowGesturePwdHint');
      if (gestureHintSpan) {
        gestureHintSpan.onclick = (e) => {
          e.stopPropagation();
          alert(res.gesturePasswordHint ? t('alert_gesture_pwd_hint', "手势密码线索提示：") + `\n"${res.gesturePasswordHint}"` : t('alert_no_hint', "您未设置过密码提示。"));
        };
      }
    } else {
      if (noPwdWarning) noPwdWarning.style.display = 'block';
      if (hasPwdView) hasPwdView.style.display = 'none';
      if (actionButtonsBlock) actionButtonsBlock.style.display = 'none';
    }
    
    document.getElementById('superPasswordModal').style.display = 'flex';
  });
}

function generateGridPoints(canvasElement) {
  const points = [];
  const side = 240, padding = 30;
  const step = (side - padding * 2) / 2;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      points.push({
        id: (i * 3 + j).toString(),
        x: padding + j * step,
        y: padding + i * step
      });
    }
  }
  return points;
}

function repaintGestureOnCanvas(canvasId, selectedNodes, pointsArray) {
  const cvs = document.getElementById(canvasId);
  if (!cvs) return;
  const ctx = cvs.getContext('2d');
  ctx.clearRect(0, 0, 240, 240);
  
  if (selectedNodes.length > 0) {
    ctx.beginPath();
    const startPt = pointsArray.find(p => p.id === selectedNodes[0]);
    if (startPt) ctx.moveTo(startPt.x, startPt.y);
    for (let i = 1; i < selectedNodes.length; i++) {
      const pt = pointsArray.find(p => p.id === selectedNodes[i]);
      if (pt) ctx.lineTo(pt.x, pt.y);
    }
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
  
  pointsArray.forEach(p => {
    const sel = selectedNodes.includes(p.id);
    ctx.beginPath();
    ctx.arc(p.x, p.y, sel ? 12 : 8, 0, Math.PI * 2);
    ctx.fillStyle = sel ? '#3b82f6' : '#cbd5e1'; 
    ctx.fill();
  });
}

// ⭐ 新增：Supabase 自动双向同步对齐模块
async function autoSyncSupabaseOnLoad() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['syncBrowserConfig', 'lastLocalUpdated', 'mySites', 'lastSyncedUpdatedAt'], async (res) => {
      const bConfig = res.syncBrowserConfig; if (!bConfig || !bConfig.browserLoggedIn || bConfig.autoEnable === false) return resolve();
      try {
        let response = await fetch(`${SUPABASE_URL}/rest/v1/s_tab_sync?select=updated_at&user_email=eq.${bConfig.email}`, {
          method: 'GET', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${bConfig.token}` }
        });
        
        if (response.status === 401 && bConfig.password) {
          const loginRes = await supabaseBypassAuthStub(bConfig.email, bConfig.password);
          if (loginRes.success) {
            bConfig.token = loginRes.token;
            cachedSyncBrowserConfig.token = loginRes.token;
            chrome.storage.local.set({ syncBrowserConfig: bConfig });
            response = await fetch(`${SUPABASE_URL}/rest/v1/s_tab_sync?select=updated_at&user_email=eq.${bConfig.email}`, {
              method: 'GET', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${loginRes.token}` }
            });
          }
        }

        if (response.status === 404) { await uploadToSupabaseCloud(); return resolve(); }
        if (!response.ok) return resolve();

        const rows = await response.json();
        if (rows && rows.length > 0) {
          const cloudTimeStr = rows[0].updated_at;
          const lastSynced = res.lastSyncedUpdatedAt || "";
          
          if (cloudTimeStr && cloudTimeStr !== lastSynced) {
            await downloadFromSupabaseCloud(cloudTimeStr);
            initThemeSystem(); loadEngineSystem(); renderNavGridUI();
          } else {
            const lastSyncedMs = lastSynced ? new Date(lastSynced).getTime() : 0;
            const localUpdatedMs = res.lastLocalUpdated || 0;
            if (!isNaN(lastSyncedMs) && localUpdatedMs > lastSyncedMs + 3000) {
              await uploadToSupabaseCloud();
            }
          }
        } else {
          await uploadToSupabaseCloud();
        }
        resolve();
      } catch (e) { resolve(); }
    });
  });
}

async function autoSyncNasOnLoad() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['syncNasConfig', 'lastLocalUpdated', 'mySites', 'lastSyncedNasLastModified'], async (res) => {
      const config = res.syncNasConfig; if (!config || !config.nasAddress || config.autoEnable === false) return resolve();
      const finalTargetFolder = cleanAndBuildWebdavUrl(config.nasAddress, config.nasPort, config.nasPath, 'nas');
      try {
        const response = await webdavRequest(getSyncFileUrlForChannel(finalTargetFolder, 'nas'), 'HEAD', config.username, config.password);
        if (response.status === 404) { await uploadToNas(); return resolve(); } if (!response.ok) return resolve();
        
        const remoteTimeStr = response.headers.get('Last-Modified');
        const lastSynced = res.lastSyncedNasLastModified || "";
        
        if (remoteTimeStr && remoteTimeStr !== lastSynced) { 
          await downloadFromNas(remoteTimeStr); 
          initThemeSystem(); loadEngineSystem(); renderNavGridUI(); 
        } else {
          // ⭐ 修改：若云端 Last-Modified 与本地记录一致，但本地修改时间晚于上次同步时间，说明本地有 Popup/离线更新，需触发上传
          const lastSyncedMs = lastSynced ? new Date(lastSynced).getTime() : 0;
          const localUpdatedMs = res.lastLocalUpdated || 0;
          if (!isNaN(lastSyncedMs) && localUpdatedMs > lastSyncedMs + 3000) {
            await uploadToNas();
          }
        }
        resolve();
      } catch (e) { resolve(); }
    });
  });
}

async function autoSyncWebdavOnLoad() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['syncWebdavConfig', 'lastLocalUpdated', 'mySites', 'lastSyncedWebdavLastModified'], async (res) => {
      const config = res.syncWebdavConfig; if (!config || !config.url || config.autoEnable === false) return resolve();
      const finalTargetFolder = cleanAndBuildWebdavUrl(config.url, '', '', 'webdav');
      try {
        const response = await webdavRequest(getSyncFileUrlForChannel(finalTargetFolder, 'webdav'), 'HEAD', config.username, config.password);
        if (response.status === 404) { await uploadToWebdavCloud(); return resolve(); } if (!response.ok) return resolve();
        
        const remoteTimeStr = response.headers.get('Last-Modified');
        const lastSynced = res.lastSyncedWebdavLastModified || "";
        
        if (remoteTimeStr && remoteTimeStr !== lastSynced) { 
          await downloadFromWebdavCloud(remoteTimeStr); 
          initThemeSystem(); loadEngineSystem(); renderNavGridUI(); 
        } else {
          // ⭐ 修改：若云端 Last-Modified 与本地记录一致，但本地修改时间晚于上次同步时间，说明本地有 Popup/离线更新，需触发上传
          const lastSyncedMs = lastSynced ? new Date(lastSynced).getTime() : 0;
          const localUpdatedMs = res.lastLocalUpdated || 0;
          if (!isNaN(lastSyncedMs) && localUpdatedMs > lastSyncedMs + 3000) {
            await uploadToWebdavCloud();
          }
        }
        resolve();
      } catch (e) { resolve(); }
    });
  });
}

function initSetupWizardEngine() {
  chrome.storage.local.get(['globalSuperPassword'], (res) => {
    const noPwdWarn = document.getElementById('encNoPwdWarning');
    const hasPwdView = document.getElementById('encHasPwdView');
    const actionBlock = document.getElementById('encActionButtonsBlock');
    
    if (res.globalSuperPassword) {
      if (noPwdWarn) noPwdWarn.style.display = 'none';
      if (hasPwdView) hasPwdView.style.display = 'block';
      if (actionBlock) actionBlock.style.display = 'flex';
    } else {
      if (noPwdWarn) noPwdWarn.style.display = 'block';
      if (hasPwdView) hasPwdView.style.display = 'none';
      if (actionBlock) actionBlock.style.display = 'none';
    }
  });

  const lnkSetup = document.getElementById('lnkStartSetupWizard');
  if (lnkSetup) {
    lnkSetup.onclick = (e) => {
      e.preventDefault();
      document.getElementById('superPasswordModal').style.display = 'none';
      startSetupWizard();
    };
  }

  const closeWizardBtn = document.getElementById('btnCloseSetupWizard');
  if (closeWizardBtn) {
    closeWizardBtn.onclick = () => {
      document.getElementById('setupWizardModal').style.display = 'none';
      pendingEncryptionFolderId = null; // 🟢 修正 5：手动取消关闭时清空状态
    };
  }

  const btnStep1Next = document.getElementById('btnWizardStep1Next');
  if (btnStep1Next) {
    btnStep1Next.onclick = () => {
      const p1 = document.getElementById('wizardCharPwd').value;
      const p2 = document.getElementById('wizardCharPwdConfirm').value;
      const hint = document.getElementById('wizardCharPwdHint').value.trim();

      if (!p1) return alert("⚠️ " + t('alert_required_fields', "密码不能为空！"));
      if (p1 !== p2) return alert("⚠️ " + t('alert_pwd_confirm_fail', "核对失败，两次输入密码不一致。"));

      wizardTempCharPwd = p1;
      wizardTempCharPwdHint = hint;

      document.getElementById('wizardStep1').style.display = 'none';
      document.getElementById('wizardStep2').style.display = 'flex';
      initWizardGestureCanvas();
    };
  }

  const btnStep2Next = document.getElementById('btnWizardStep2Next');
  if (btnStep2Next) {
    btnStep2Next.onclick = () => {
      if (!wizardFirstGesture) {
        return alert("⚠️ " + t('alert_required_fields', "请绘制手势密码！"));
      }
      
      const gestureHint = document.getElementById('wizardGestureHint').value.trim();
      const calibratedTimestamp = Date.now() + localSkew;

      chrome.storage.local.set({
        globalSuperPassword: wizardTempCharPwd,
        superPasswordHint: wizardTempCharPwdHint,
        globalGesturePassword: wizardFirstGesture,
        gesturePasswordHint: gestureHint,
        lastLocalUpdated: calibratedTimestamp
      }, () => {
        document.getElementById('setupWizardModal').style.display = 'none';
        alert("🎉 " + t('alert_pwd_system_configured', "加密系统设置成功！"));
        
        // 🟢 修正 6：如果存在挂起的文件夹加密请求，则清除状态，并自动回路发起对该文件夹的加密校验
        if (pendingEncryptionFolderId) {
          const folderIdToEncrypt = pendingEncryptionFolderId;
          pendingEncryptionFolderId = null; // 清除状态
          toggleFolderEncryptionState(folderIdToEncrypt); // 自动进入下一步验证与加密
        } else {
          // 如果是从[设置]面板正常进来的，保持原生逻辑刷新页面
            window.location.reload();
          }
        });
      };
    }
  }

function startSetupWizard() {
  document.getElementById('wizardCharPwd').value = "";
  document.getElementById('wizardCharPwdConfirm').value = "";
  document.getElementById('wizardCharPwdHint').value = "";
  document.getElementById('wizardGestureHint').value = "";
  wizardFirstGesture = "";
  wizardSecondGesture = "";

  document.getElementById('wizardStep1').style.display = 'flex';
  document.getElementById('wizardStep2').style.display = 'none';
  document.getElementById('setupWizardModal').style.display = 'flex';
}

function initWizardGestureCanvas() {
  const canvas = document.getElementById('wizardGestureCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const points = generateGridPoints(canvas);
  let isDrawing = false;
  let activePoints = [];

  const drawGrid = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    repaintGestureOnCanvas('wizardGestureCanvas', activePoints.map(p => p.id), points);
  };

  drawGrid();

  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left,
      y: (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top
    };
  };

  const handleMove = (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    points.forEach(p => {
      if (!activePoints.some(ap => ap.id === p.id) && Math.hypot(pos.x - p.x, pos.y - p.y) < 18) {
        activePoints.push(p);
      }
    });
    drawGrid();
  };

  const handleEnd = () => {
    if (!isDrawing) return;
    isDrawing = false;
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', handleEnd);

    if (activePoints.length > 0) {
      const drawnTrack = activePoints.map(p => p.id).join('');
      if (drawnTrack.length < 3) {
        document.getElementById('wizardGestureTips').innerText = t('err_track_short', "⚠️ 轨迹过短，请连接更多点！");
        activePoints = [];
        drawGrid();
        return;
      }

      if (!wizardFirstGesture) {
        wizardFirstGesture = drawnTrack;
        document.getElementById('wizardGestureTips').innerText = t('wizard_gesture_confirm', "请再次绘制手势以核对");
        activePoints = [];
        drawGrid();
      } else {
        wizardSecondGesture = drawnTrack;
        document.getElementById('btnWizardStep2Next').disabled = false;
      }
    }
  };

  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDrawing = true;
    activePoints = [];
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
  });

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDrawing = true;
    activePoints = [];
  }, { passive: false });

  canvas.addEventListener('touchmove', handleMove, { passive: false });
  canvas.addEventListener('touchend', handleEnd);
}

function initUnifiedVerifyEngine() {
  const modal = document.getElementById('unifiedVerifyModal');
  const closeBtn = document.getElementById('btnCloseUnifiedVerify');
  const confirmBtn = document.getElementById('btnConfirmUnifiedVerify');
  const charInput = document.getElementById('unifiedVerifyInput');
  const cvs = document.getElementById('unifiedVerifyCanvas');
  if (!cvs) return;
  
  const points = generateGridPoints(cvs);
  let selected = [];
  let isDrawing = false;
  
  const getPos = (e) => {
    const rect = cvs.getBoundingClientRect();
    return {
      x: (e.clientX || (e.touches && e.touches[0].clientX)) - rect.left,
      y: (e.clientY || (e.touches && e.touches[0].clientY)) - rect.top
    };
  };
  
  const handleMove = (e) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    points.forEach(p => {
      if (!selected.includes(p.id) && Math.hypot(pos.x - p.x, pos.y - p.y) < 18) {
        selected.push(p.id);
      }
    });
    repaintGestureOnCanvas('unifiedVerifyCanvas', selected, points);
  };
  
  const handleEnd = () => {
    if (!isDrawing) return;
    isDrawing = false;
    repaintGestureOnCanvas('unifiedVerifyCanvas', selected, points);
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', handleEnd);
    
    if (selected.length > 0) {
      const drawnTrack = selected.join('');
      chrome.storage.local.get(['globalGesturePassword'], (res) => {
        if (drawnTrack === res.globalGesturePassword) {
          modal.style.display = 'none';
          if (activeVerifySuccessCallback) activeVerifySuccessCallback();
        } else {
          document.getElementById('unifiedVerifySubTips').innerText = "❌ " + t('alert_gesture_incorrect', "手势不正确，请重新绘制！");
          selected = [];
          repaintGestureOnCanvas('unifiedVerifyCanvas', [], points);
        }
      });
    }
  };
  
  cvs.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isDrawing = true;
    selected = [];
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
  });
  
  cvs.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDrawing = true;
    selected = [];
  }, { passive: false });
  
  cvs.addEventListener('touchmove', handleMove, { passive: false });
  cvs.addEventListener('touchend', handleEnd);
  
  const triggerVerifyCheck = () => {
    const enteredChar = charInput.value.trim();
    chrome.storage.local.get(['globalSuperPassword'], (res) => {
      if (enteredChar === res.globalSuperPassword) {
        modal.style.display = 'none';
        if (activeVerifySuccessCallback) activeVerifySuccessCallback();
      } else {
        alert("❌ " + t('alert_char_pwd_fail', "字符/数字密码核对失败。"));
      }
    });
  };
  
  if (confirmBtn) confirmBtn.onclick = triggerVerifyCheck;
  
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
      if (activeVerifyCancelCallback) activeVerifyCancelCallback();
    };
  }
  
  const btnUnifiedGestureHint = document.getElementById('btnUnifiedGestureHint');
  if (btnUnifiedGestureHint) {
    btnUnifiedGestureHint.onclick = (e) => {
      e.stopPropagation();
      chrome.storage.local.get(['gesturePasswordHint'], (res) => {
        alert(res.gesturePasswordHint ? t('alert_gesture_pwd_hint', "手势密码线索提示：") + `\n"${res.gesturePasswordHint}"` : t('alert_no_hint', "您未设置过密码提示。"));
      });
    };
  }
  const btnUnifiedCharHint = document.getElementById('btnUnifiedCharHint');
  if (btnUnifiedCharHint) {
    btnUnifiedCharHint.onclick = (e) => {
      e.stopPropagation();
      chrome.storage.local.get(['superPasswordHint'], (res) => {
        alert(res.superPasswordHint ? t('alert_char_pwd_hint', "字符密码线索提示：") + `\n"${res.superPasswordHint}"` : t('alert_no_hint', "您未设置过密码提示。"));
      });
    };
  }

  const btnChangeChar = document.getElementById('btnActionChangeCharPwd');
  if (btnChangeChar) {
    btnChangeChar.onclick = () => {
      triggerUnifiedVerify(t('verify_subtitle', "输入已设置的手势密码或字符密码"), () => {
        const newChar = prompt(t('prompt_new_char_pwd', "请输入全新字符/数字密码："));
        if (newChar !== null) {
          const trimmed = newChar.trim();
          if (!trimmed) return alert(t('alert_required_fields', "密码不可为空！"));
          const verifyChar = prompt(t('prompt_confirm_char_pwd', "请再次输入以核对："));
          if (verifyChar !== trimmed) return alert(t('alert_pwd_mismatch', "核对失败，两次输入密码不一致。"));
          const hint = prompt(t('prompt_hint_char_pwd', "请输入此密码的线索提示（选填）：")) || "";
          
          chrome.storage.local.set({
            globalSuperPassword: trimmed,
            superPasswordHint: hint,
            lastLocalUpdated: Date.now() + localSkew
          }, () => {
            alert(t('alert_char_pwd_changed', "字符密码修改成功。"));
            openSuperPasswordModal();
          });
        }
      });
    };
  }
  
  const btnChangeGesture = document.getElementById('btnActionChangeGesturePwd');
  if (btnChangeGesture) {
    btnChangeGesture.onclick = () => {
      triggerUnifiedVerify(t('verify_subtitle', "输入已设置的手势密码或字符密码"), () => {
        document.getElementById('superPasswordModal').style.display = 'none';
        wizardIsOnlyChangingGesture = true;
        
        document.getElementById('wizardStep1').style.display = 'none';
        document.getElementById('wizardStep2').style.display = 'flex';
        
        wizardFirstGesture = "";
        wizardSecondGesture = "";
        document.getElementById('btnWizardStep2Next').disabled = true;
        document.getElementById('wizardGestureTips').innerText = t('wizard_gesture_tips', "请绘制全新手势密码");
        document.getElementById('wizardGestureHint').value = "";
        
        repaintGestureOnCanvas('wizardGestureCanvas', [], points);
        document.getElementById('setupWizardModal').style.display = 'flex';
      });
    };
  }
}

function triggerUnifiedVerify(tipsText, onSuccessCallback, onCancelCallback = null) {
  activeVerifySuccessCallback = onSuccessCallback;
  activeVerifyCancelCallback = onCancelCallback;
  
  const modal = document.getElementById('unifiedVerifyModal');
  if (!modal) return;
  
  const descEl = document.getElementById('unifiedVerifySubTips');
  if (descEl) {
    descEl.innerText = tipsText || t('verify_subtitle', "输入已设置的手势密码或字符密码");
  }
  document.getElementById('unifiedVerifyInput').value = "";
  
  const cvs = document.getElementById('unifiedVerifyCanvas');
  if (cvs) {
    const points = generateGridPoints(cvs);
    repaintGestureOnCanvas('unifiedVerifyCanvas', [], points);
  }
  
  modal.style.display = 'flex';
}

function tryOpenEncryptedFolder(folderId, successCallback) {
  chrome.storage.local.get(['mySites'], (res) => {
    const node = (res.mySites || []).find(s => s.id === folderId);
    if (node && node.isEncrypted) {
      triggerUnifiedVerify(t('verify_subtitle', "输入已设置的手势密码或字符密码"), successCallback);
    } else {
      successCallback();
    }
  });
}

function toggleFolderEncryptionState(folderId) {
  chrome.storage.local.get(['globalSuperPassword', 'globalGesturePassword', 'mySites'], async (res) => {
    const isPwdSet = !!res.globalSuperPassword && !!res.globalGesturePassword;
    if (!isPwdSet) { // 🟢 修正 1：此处改为判断全局密码是否已设置
      pendingEncryptionFolderId = folderId; // 🟢 修正 2：暂存当前待加密文件夹ID，用于设置完密码后的自动回调
      showDynamicBlurAlert(
        t('alert_no_pwd_configured', "你当前未设置过密码，请移步到[设置]-[加密管理]进行设置，或者点击确定直接进行设置密码"),
        () => {
          startSetupWizard();
        },
        () => {
          pendingEncryptionFolderId = null; // 🟢 修正 3：取消时清除暂存
        }, 
        t('menu_enc_mgr', "开启密码保护"),
        t('btn_confirm', "确定"),
        t('btn_cancel', "取消"),
        "🔒"
      );
      return;
    }

    const all = res.mySites || [];
    const node = all.find(s => s.id === folderId);
    if (!node) return;

    const isCurrentlyEncrypted = !!node.isEncrypted;
    const nowTime = Date.now() + localSkew;

    if (isCurrentlyEncrypted) {
      if (confirm(t('confirm_remove_enc', "是否取消对文件夹的加密防护？") + ` [${node.name}]`)) {
        triggerUnifiedVerify(t('verify_subtitle', "输入已设置的手势密码或字符密码"), async () => {
          node.isEncrypted = false;
          node.u = nowTime; 
          delete node.hideThumbnails;
          delete node.disableSNavSearch;
          delete node.openInIncognito; 

          await saveSites(all);
          alert(t('alert_enc_removed', "该文件夹加密防护已成功取消。"));
          await renderNavGridUI();
          refreshOpenedFolderPanels();
          triggerSyncUploadDebounced();
        });
      }
    } else {
      if (confirm(t('confirm_add_enc', "是否将给文件夹加密？") + ` [${node.name}]`)) {
        triggerUnifiedVerify(t('verify_subtitle', "输入已设置的手势密码或字符密码"), async () => {
          node.isEncrypted = true;
          node.u = nowTime; 
          node.hideThumbnails = true;
          node.disableSNavSearch = true;

          await saveSites(all);
          alert(t('alert_enc_enabled', "文件夹加密防护已成功启用！"));
          await renderNavGridUI();
          refreshOpenedFolderPanels(); // 🟢 修正 4：新增刷新当前打开的文件夹面板状态，使锁头即时改变
          triggerSyncUploadDebounced();
        });
      }
    }
  });
}

function initResetWarningSystem() {
  const btnClose = document.getElementById('btnCloseResetWarningModal');
  if (btnClose) {
    btnClose.onclick = () => {
      document.getElementById('resetWarningModal').style.display = 'none';
    };
  }

  const btnCancel = document.getElementById('btnCancelResetWarningModal');
  if (btnCancel) {
    btnCancel.onclick = () => {
      document.getElementById('resetWarningModal').style.display = 'none';
    };
  }

  const btnConfirm = document.getElementById('btnConfirmResetWarningModal');
  if (btnConfirm) {
    btnConfirm.onclick = async () => {
      btnConfirm.disabled = true;
      btnConfirm.innerText = t('status_wiping', "正在清除...");

      const wipeLocalDataAndReload = () => {
        chrome.storage.local.clear(() => {
          chrome.storage.local.set({ 
            mySites: [], customFolders: [], customEngines: [], lastEngine: 'bing', engineIconSources: {}, engineIconBase64: {}, lastLocalUpdated: Date.now() + localSkew, activeSyncTab: 'browser', userTheme: 'theme-time',
            deletedIds: {}, version_seq: 0, 
            syncBrowserConfig: { email: '', password: '', token: '', browserLoggedIn: false, autoEnable: true },
            syncNasConfig: { nasAddress: '', nasPort: '', nasPath: '', username: '', password: '', nasLoggedIn: false, autoEnable: true },
            syncWebdavConfig: { provider: '', url: '', username: '', password: '', webdavLoggedIn: false, autoEnable: true }
          }, () => { window.location.reload(); });
        });
      };

      const clearSupabase = document.getElementById('chkResetCloudSupabase').checked;
      const clearNas = document.getElementById('chkResetCloudNas').checked;
      const clearWebdav = document.getElementById('chkResetCloudWebdav').checked;

      try {
        if (clearSupabase && cachedSyncBrowserConfig && cachedSyncBrowserConfig.browserLoggedIn) {
          const emptyPayload = {
            version: "3.2-supabase-gzip", timestamp: Date.now() + localSkew,
            isWiped: true, 
            deletedIds: {}, version_seq: 1,
            payload: { mySites: [], customFolders: [], customEngines: [], lastEngine: 'bing', userTheme: 'theme-time', engineIconSources: {} }
          };
          const compressed = await compressData(JSON.stringify(emptyPayload));
          await fetch(`${SUPABASE_URL}/rest/v1/s_tab_sync`, {
            method: 'POST', headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${cachedSyncBrowserConfig.token}`, 'Content-Type': 'application/json', 'Prefer': 'resolution=merge-duplicates' },
            body: JSON.stringify({ user_email: cachedSyncBrowserConfig.email, data_pack: { raw: compressed }, updated_at: new Date().toISOString() })
          });
        }

        if (clearNas && cachedSyncNasConfig && cachedSyncNasConfig.nasLoggedIn) {
          const emptyPayload = {
            version: "3.2-full-gzip", timestamp: Date.now() + localSkew,
            isWiped: true, 
            deletedIds: {}, version_seq: 1,
            payload: { mySites: [], customFolders: [], customEngines: [], lastEngine: 'bing', userTheme: 'theme-time', engineIconSources: {} }
          };
          const compressed = await compressData(JSON.stringify(emptyPayload));
          const jsonWrapper = JSON.stringify({ raw: compressed }); 
          const finalTargetFolder = cleanAndBuildWebdavUrl(cachedSyncNasConfig.nasAddress, cachedSyncNasConfig.nasPort, cachedSyncNasConfig.nasPath, 'nas');
          await webdavRequest(getSyncFileUrlForChannel(finalTargetFolder, 'nas'), 'PUT', cachedSyncNasConfig.username, cachedSyncNasConfig.password, jsonWrapper, { 'Content-Type': 'application/json' });
        }

        if (clearWebdav && cachedSyncWebdavConfig && cachedSyncWebdavConfig.webdavLoggedIn) {
          const emptyPayload = {
            version: "3.2-full-gzip", timestamp: Date.now() + localSkew,
            isWiped: true, // 开启强清标志
            deletedIds: {}, version_seq: 1,
            payload: { mySites: [], customFolders: [], customEngines: [], lastEngine: 'bing', userTheme: 'theme-time', engineIconSources: {} }
          };
          const compressed = await compressData(JSON.stringify(emptyPayload));
          const jsonWrapper = JSON.stringify({ raw: compressed }); // 修正包裹格式
          const finalTargetFolder = cleanAndBuildWebdavUrl(cachedSyncWebdavConfig.url, '', '', 'webdav');
          await webdavRequest(getSyncFileUrlForChannel(finalTargetFolder, 'webdav'), 'PUT', cachedSyncWebdavConfig.username, cachedSyncWebdavConfig.password, jsonWrapper, { 'Content-Type': 'application/json' });
        }
      } catch (e) {
        console.error("Cloud wipe error during reset: ", e);
      }

      wipeLocalDataAndReload();
    };
  }
}

function openResetWarningModal() {
  const modal = document.getElementById('resetWarningModal');
  if (!modal) return;

  const statusSupabase = document.getElementById('lblResetStatusSupabase');
  const chkSupabase = document.getElementById('chkResetCloudSupabase');
  const isSupabaseLoggedIn = !!(cachedSyncBrowserConfig && cachedSyncBrowserConfig.browserLoggedIn);
  statusSupabase.innerText = isSupabaseLoggedIn ? t('status_logged_in', '[已登录]') : t('status_logged_out', '[未登录]');
  statusSupabase.style.color = isSupabaseLoggedIn ? '#10b981' : '#475569';
  chkSupabase.disabled = !isSupabaseLoggedIn;
  chkSupabase.checked = false;

  const statusNas = document.getElementById('lblResetStatusNas');
  const chkNas = document.getElementById('chkResetCloudNas');
  const isNasLoggedIn = !!(cachedSyncNasConfig && cachedSyncNasConfig.nasLoggedIn);
  statusNas.innerText = isNasLoggedIn ? t('status_logged_in', '[已登录]') : t('status_logged_out', '[未登录]');
  statusNas.style.color = isNasLoggedIn ? '#10b981' : '#475569';
  chkNas.disabled = !isNasLoggedIn;
  chkNas.checked = false;

  const statusWebdav = document.getElementById('lblResetStatusWebdav');
  const chkWebdav = document.getElementById('chkResetCloudWebdav');
  const isWebdavLoggedIn = !!(cachedSyncWebdavConfig && cachedSyncWebdavConfig.webdavLoggedIn);
  statusWebdav.innerText = isWebdavLoggedIn ? t('status_logged_in', '[已登录]') : t('status_logged_out', '[未登录]');
  statusWebdav.style.color = isWebdavLoggedIn ? '#10b981' : '#475569';
  chkWebdav.disabled = !isWebdavLoggedIn;
  chkWebdav.checked = false;

  modal.style.display = 'flex';
}

// 📦 新增：统一网页图标选择弹窗控制引擎 (包含骨架加载、超时降级、时间戳强制重载、网络请求切断阻断)
function openIconSelectorModal(type, url, extraData) {
  activeIconSelectorTarget = { type, url, ...extraData };
  selectedIconSourceIdx = extraData.currentIdx !== undefined ? extraData.currentIdx : 0;
  if (selectedIconSourceIdx === -1) selectedIconSourceIdx = 0;

  const modal = document.getElementById('iconSelectorModal');
  const grid = document.getElementById('iconSelectorGrid');
  if (!modal || !grid) return;

  grid.innerHTML = '';
  
  for (let i = 0; i < 18; i++) {
    const item = document.createElement('div');
    item.className = "icon-select-card-choice";
    item.style.cssText = `
      display: flex; align-items: center; justify-content: center;
      width: 50px; height: 50px; background: #ffffff; border-radius: 12px;
      border: 1.5px solid #e2e8f0; cursor: pointer; transition: all 0.2s;
      position: relative; box-shadow: 0 2px 6px rgba(0,0,0,0.02);
    `;
    
    // 骨架屏态：未加载完前添加柔和脉冲光晕
    item.style.animation = "pulseIconLoad 1.5s infinite ease-in-out";
    
    if (i === selectedIconSourceIdx) {
      item.style.borderColor = '#3b82f6';
      item.style.background = 'rgba(59, 130, 246, 0.12)';
      item.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
    }

    const img = document.createElement('img');
    img.style.cssText = "width: 24px; height: 24px; object-fit: contain; opacity: 0; transition: opacity 0.25s;";
    img.src = getFaviconUrlBySource(url, i);
    
    img.onload = () => {
      item.style.animation = "none";
      img.style.opacity = "1";
    };
    img.onerror = () => {
      item.style.animation = "none";
      img.src = DEFAULT_EARTH_ICON;
      img.style.opacity = "1";
    };

    item.appendChild(img);

    item.onclick = () => {
      selectedIconSourceIdx = i;
      const choices = grid.querySelectorAll('.icon-select-card-choice');
      choices.forEach((choice, idx) => {
        if (idx === i) {
          choice.style.borderColor = '#3b82f6';
          choice.style.background = 'rgba(59, 130, 246, 0.12)';
          choice.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.15)';
        } else {
          choice.style.borderColor = '#e2e8f0';
          choice.style.background = '#ffffff';
          choice.style.boxShadow = '0 2px 6px rgba(0,0,0,0.02)';
        }
      });
    };

    grid.appendChild(item);
  }

  modal.style.display = 'flex';
}

function closeAndDestroyIconSelector() {
  const grid = document.getElementById('iconSelectorGrid');
  if (grid) {
    // 物理硬切断：阻断所有未完成的网络加载请求，省带宽并保护连接数
    const imgs = grid.querySelectorAll('img');
    imgs.forEach(img => {
      img.src = ""; 
    });
    grid.innerHTML = '';
  }
  activeIconSelectorTarget = null;
  const modal = document.getElementById('iconSelectorModal');
  if (modal) modal.style.display = 'none';
}

function initIconSelectorSystem() {
  const closeX = document.getElementById('btnCloseIconSelectorModal');
  if (closeX) closeX.onclick = closeAndDestroyIconSelector;

  const btnCancel = document.getElementById('btnCancelIconSelector');
  if (btnCancel) btnCancel.onclick = closeAndDestroyIconSelector;

  const btnReload = document.getElementById('btnReloadIconSelector');
  if (btnReload) {
    btnReload.onclick = () => {
      if (!activeIconSelectorTarget) return;
      const grid = document.getElementById('iconSelectorGrid');
      if (!grid) return;

      const choices = grid.querySelectorAll('.icon-select-card-choice');
      choices.forEach((choice, i) => {
        choice.style.animation = "pulseIconLoad 1.5s infinite ease-in-out";
        const img = choice.querySelector('img');
        if (img) {
          img.style.opacity = "0";
          // 强制时间戳缓存绕过参数
          const cleanUrl = activeIconSelectorTarget.url;
          const newSrc = getFaviconUrlBySource(cleanUrl, i);
          img.src = newSrc.includes('?') ? (newSrc + "&_t=" + Date.now()) : (newSrc + "?_t=" + Date.now());
        }
      });
    };
  }

  const btnConfirm = document.getElementById('btnConfirmIconSelector');
  if (btnConfirm) {
    btnConfirm.onclick = async () => {
      if (!activeIconSelectorTarget) return;
      const { type, url, realIdx, folderId, childId, engId } = activeIconSelectorTarget;
      const nowTime = Date.now() + localSkew;

      const all = await getSites();
      if (type === 'main') {
        if (all[realIdx]) {
          all[realIdx].iconSourceIdx = selectedIconSourceIdx;
          all[realIdx].u = nowTime;
          delete all[realIdx].localIconBase64;

          chrome.storage.local.get(['s_tab_icon_cache'], async (cacheRes) => {
            let iconCache = cacheRes.s_tab_icon_cache || {};
            if (url && iconCache[url]) {
              delete iconCache[url];
            }
            chrome.storage.local.set({ s_tab_icon_cache: iconCache }, async () => {
              await saveSites(all);
              renderNavGridUI();
              refreshOpenedFolderPanels();
              triggerSyncUploadDebounced();
            });
          });
        }
      } else if (type === 'nested') {
        let folder = all.find(s => s.id === folderId) || (folderId === 'folder_uncategorized' ? all.find(s => s.id === "folder_uncategorized") : null);
        if (folder && folder.children) {
          let child = folder.children.find(c => c.id === childId);
          if (child) {
            child.iconSourceIdx = selectedIconSourceIdx;
            child.u = nowTime;
            folder.u = nowTime;
            delete child.localIconBase64;

            chrome.storage.local.get(['s_tab_icon_cache'], async (cacheRes) => {
              let iconCache = cacheRes.s_tab_icon_cache || {};
              if (url && iconCache[url]) {
                delete iconCache[url];
              }
              chrome.storage.local.set({ s_tab_icon_cache: iconCache }, async () => {
                await saveSites(all);
                renderNavGridUI();
                refreshOpenedFolderPanels();
                triggerSyncUploadDebounced();
              });
            });
          }
        }
      } else if (type === 'engine') {
        engineIconSources[engId] = selectedIconSourceIdx;
        delete engineIconBase64Map[engId]; // 清空缓存促使下一次加载重新抓取最新源
        chrome.storage.local.set({ engineIconSources, engineIconBase64: engineIconBase64Map }, () => { 
          renderEngineUI(); 
        });
      }
      closeAndDestroyIconSelector();
    };
  }
}
// 🔒 新增：删除已设置加密的独立逻辑模块（包含安全提示弹窗的交互绑定、一键全局静默解密、清理存储以及触发后台自动同步）
function initRemoveEncryptionSystem() {
  const btnOpenConfirm = document.getElementById('btnActionRemoveGlobalEncryption');
  const confirmModal = document.getElementById('removeEncryptionConfirmModal');
  const btnCloseX = document.getElementById('btnCloseRemoveEncryptionModal');
  const btnCancel = document.getElementById('btnCancelRemoveEncryption');
  const btnConfirm = document.getElementById('btnConfirmRemoveEncryption');

  if (btnOpenConfirm) {
    btnOpenConfirm.onclick = () => {
      if (confirmModal) confirmModal.style.display = 'flex';
    };
  }

  if (btnCloseX) {
    btnCloseX.onclick = () => {
      if (confirmModal) confirmModal.style.display = 'none';
    };
  }

  if (btnCancel) {
    btnCancel.onclick = () => {
      if (confirmModal) confirmModal.style.display = 'none';
    };
  }

  if (btnConfirm) {
    btnConfirm.onclick = () => {
      // 1. 先关闭当前的“安全提示”弹窗，避免其残留在屏幕上遮挡视线
      if (confirmModal) confirmModal.style.display = 'none';

      // 2. 接着唤起统一校验：校验成功后才会执行数据清理
      triggerUnifiedVerify(t('verify_subtitle', "输入已设置的手势密码或字符密码"), () => {
        chrome.storage.local.get(['mySites'], async (res) => {
          const all = res.mySites || [];
          const nowTime = Date.now() + localSkew;

          // 1. 递归式重置/解密所有被密码锁定的文件夹节点，安全清退所有关联隐藏属性
          all.forEach(node => {
            if (node.type === 'folder' && node.isEncrypted) {
              node.isEncrypted = false;
              node.u = nowTime;
              delete node.hideThumbnails;
              delete node.disableSNavSearch;
              delete node.openInIncognito;
            }
          });
          // 2. 清空底层核心主字符密码、手势安全散列轨迹及密码线索
          chrome.storage.local.set({
            globalSuperPassword: "",
            globalGesturePassword: "",
            superPasswordHint: "",
            gesturePasswordHint: "",
            mySites: all,
            lastLocalUpdated: nowTime
          }, () => {
            if (confirmModal) confirmModal.style.display = 'none';
            const superPwdModal = document.getElementById('superPasswordModal');
            if (superPwdModal) superPwdModal.style.display = 'none';

            // 提示完成解密
            alert(t('alert_enc_removed', "该文件夹加密防护已成功取消。") || "已成功删除所有密码及安全加密配置！");

            // 3. 立即重绘主网格及已开启的浮动窗口，并触发云同步队列静默上传进行多端对齐
            renderNavGridUI();
            refreshOpenedFolderPanels();
            triggerSyncUploadDebounced();
          });
        });
      });
    };
  }
}
// 🔒 新增：文件夹面板拖拽机制（不持久化，避开按钮与滚动条交互）
function makeFolderPanelDraggable(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;

  let isDragging = false;
  let startX, startY;
  let startLeft, startTop;

  panel.addEventListener('mousedown', (e) => {
    // 1. 过滤掉所有带有交互和点击性质的子元素，防止拖动动作与页面原有交互产生冲突
    const interactiveSelector = 'input, button, select, textarea, a, .site, .drag-handle-4dots, .more-actions-3dots, .folder-incognito-trigger-btn, .folder-lock-trigger-btn, .modal-close-trigger, .folder-view-toggle-btn, .chk-hide-thumbnails, .chk-disable-search, input[type="checkbox"]';
    if (e.target.closest(interactiveSelector)) return;

    // 2. 排除滚动条所在的点击区域，避免用户拉动滚动条时误触发窗口位移
    const scrollzone = e.target.closest('.folder-panel-scrollzone');
    if (scrollzone) {
      if (e.clientX > scrollzone.getBoundingClientRect().left + scrollzone.clientWidth) {
        return; 
      }
    }

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(panel.style.left) || 0;
    startTop = parseInt(panel.style.top) || 0;

    const handleMouseMove = (moveEvent) => {
      if (!isDragging) return;
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      panel.style.left = (startLeft + deltaX) + 'px';
      panel.style.top = (startTop + deltaY) + 'px';
    };

    const handleMouseUp = () => {
      isDragging = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  });
}
// 🔄 动态维护同步图标样式与悬停提示
function updateSyncIndicatorUI() {
  chrome.storage.local.get(['syncWorkMode'], (res) => {
    const mode = res.syncWorkMode || 'passive'; // 🟢 默认值变更为 passive
    const indicator = document.getElementById('syncIndicator');
    if (indicator) {
      if (mode === 'passive') {
  indicator.style.display = 'inline-block';
  indicator.style.cursor = 'pointer';
  indicator.setAttribute('title', t('sync_indicator_passive_tooltip', '间歇同步模式（点击手动强制拉取云端同步对齐！如果需要更为极致的同步模式，请移步到[设置]-[其他管理]，选择[实时自动同步]）'));
} else {
  indicator.style.display = 'none';
  indicator.style.cursor = 'default';
  indicator.setAttribute('title', t('sync_indicator_active_tooltip', '自动云同步正在进行实时双向守护'));
}
    }
  });
}
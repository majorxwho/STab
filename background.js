// 📂 background.js

// 插件管理页面跳转链路中心
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openExtensionsPage") {
    // 动态检测是否为 Edge 浏览器
    const isEdge = /Edg\//i.test(navigator.userAgent);
    const targetUrl = isEdge ? 'edge://extensions/' : 'chrome://extensions/';
    chrome.tabs.create({ url: targetUrl });
  }
});

// 在扩展安装或更新时注册全局右键菜单
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "add_to_snav",
    title: chrome.i18n.getMessage("context_menu_add") || "添加至S导航",
    contexts: ["all"]
  });
});

// 监听右键菜单项点击事件，唤起收藏位置选择面板
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "add_to_snav") {
    const isEdge = /Edg\//i.test(navigator.userAgent);
    // 适配 Edge/Chrome 原生行为分发
    if (chrome.action && typeof chrome.action.openPopup === 'function') {
      const windowId = tab ? tab.windowId : undefined;
      chrome.action.openPopup({ windowId: windowId }).catch((err) => {
        console.warn("Unable to open popup via action API, trying fallback window:", err);
        openPopupAsWindow(tab);
      });
    } else {
      openPopupAsWindow(tab);
    }
  }
});

// 降级回退：当浏览器无法直接打开 popup 时，通过 windows.create 创建与 popup 尺寸相同的独立无工具栏弹窗
function openPopupAsWindow(tab) {
  try {
    const url = new URL(chrome.runtime.getURL("popup.html"));
    if (tab) {
      if (tab.title) url.searchParams.set("title", tab.title);
      if (tab.url) url.searchParams.set("url", tab.url);
      if (tab.favIconUrl) url.searchParams.set("favIconUrl", tab.favIconUrl);
    }

    const windowId = tab ? tab.windowId : undefined;
    const popupWidth = 480;
    const popupHeight = 520; // 适配不同操作系统窗口边框的差异

    // 核心定位创建函数
    const createPopup = (win) => {
      let left = undefined;
      let top = undefined;
      // 只有在确保 win、win.left、win.width 为有效数字时才进行高精偏置计算
      if (win && typeof win.left === 'number' && typeof win.width === 'number') {
        left = Math.round(win.left + win.width - popupWidth - 160); // 留出 40px 右边距，对齐工具栏图标
        top = Math.round(win.top + 80);  // 偏置 80px，正好在浏览器工具栏正下方落下
      }
      
      chrome.windows.create({
        url: url.toString(),
        type: "popup",
        width: popupWidth,
        height: popupHeight,
        left: left,
        top: top,
        focused: true
      });
    };

    // 执行双重通道获取主窗口坐标
    if (windowId) {
      // 传递 {} 空对象作为第二个参数，防止某些浏览器内核对 MV3 可选配置参数产生解析错乱
      chrome.windows.get(windowId, {}, (win) => {
        if (chrome.runtime.lastError || !win) {
          // 降级通道：如果通过 ID 获取失败，直接抓取活动窗口
          chrome.windows.getLastFocused({}, (lastWin) => {
            createPopup(lastWin);
          });
        } else {
          createPopup(win);
        }
      });
    } else {
      chrome.windows.getLastFocused({}, (lastWin) => {
        createPopup(lastWin);
      });
    }
  } catch (err) {
    console.error("Failed to create popup fallback window:", err);
  }
}
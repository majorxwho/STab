// 📂 i18n.js [STab Decoupled Language Loader - Synchronous Cache Version]

(function () {
  // 支持的 8 国语言列表 (zh_CN, en, ja, ko, de, ru, fr, it)
  const SUPPORTED_LANGS = ['zh_CN', 'en', 'ja', 'ko', 'de', 'ru', 'fr', 'it'];
  let localTranslations = {};

  // 规范化语言代码
  function normalizeLanguage(lang) {
    if (!lang) return 'en';
    lang = lang.replace('-', '_');
    if (lang.startsWith('zh')) return 'zh_CN';
    for (const supported of SUPPORTED_LANGS) {
      if (lang.toLowerCase().startsWith(supported.toLowerCase())) {
        return supported;
      }
    }
    return 'en';
  }

  // --- 核心同步缓存区：立即加载并声明全局取词器，完全消除与 newtab.js 的异步渲染时间差 ---
  try {
    const cachedStr = localStorage.getItem('s_tab_translations_cache');
    if (cachedStr) {
      localTranslations = JSON.parse(cachedStr);
    }
  } catch (e) {
    console.error("Failed to parse cached translations:", e);
  }

  // 声明同步/首屏备用的全局快速取词代理
  window.getI18nMsg = function (key, defaultValue = '') {
    return localTranslations[key] || defaultValue || key;
  };

  // 扫描 DOM 并动态替换带有 data-i18n-* 标记的元素文本
  function translateDOM(translations) {
    if (!translations || Object.keys(translations).length === 0) return;

    // 1. 翻译文本内容 (textContent)
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (translations[key]) {
        el.textContent = translations[key];
      }
    });

    // 2. 翻译占位符 (placeholder)
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[key]) {
        el.placeholder = translations[key];
      }
    });

    // 3. 翻译提示属性 (title)
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (translations[key]) {
        el.title = translations[key];
      }
    });
  }

  // 异步获取扩展包内标准的 messages.json 语言包
  async function loadLanguagePack(lang) {
    try {
      const url = chrome.runtime.getURL(`_locales/${lang}/messages.json`);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        // 将标准的 Chrome i18n 嵌套格式扁平化为普通键值对，提升查询性能
        const pack = {};
        for (const key in data) {
          if (data[key] && data[key].message) {
            pack[key] = data[key].message;
          }
        }
        return pack;
      }
    } catch (e) {
      console.error("Failed to load language pack:", e);
    }
    return {};
  }

  // 获取当前需要激活的语言
  function getActiveLanguage() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['userLanguage'], (res) => {
        let lang = res.userLanguage;
        // 如果用户设置为 'auto' 或未设置，则检测浏览器系统语言
        if (!lang || lang === 'auto') {
          lang = chrome.i18n.getUILanguage();
        }
        resolve(normalizeLanguage(lang));
      });
    });
  }

  // 初始化与异步对齐流程
  async function initTranslations() {
    const activeLang = await getActiveLanguage();
    const freshTranslations = await loadLanguagePack(activeLang);
    
    if (freshTranslations && Object.keys(freshTranslations).length > 0) {
      localTranslations = freshTranslations;
      // 重新声明获取最新的取词函数
      window.getI18nMsg = function (key, defaultValue = '') {
        return localTranslations[key] || defaultValue || key;
      };
      // 更新缓存以供下一次加载时快速同步调取
      try {
        localStorage.setItem('s_tab_translations_cache', JSON.stringify(freshTranslations));
      } catch (e) {}
    }

    // 执行页面静态元素的翻译
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => translateDOM(localTranslations));
    } else {
      translateDOM(localTranslations);
    }
  }

  initTranslations();
})();
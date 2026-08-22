const form = document.getElementById('dictionary-form');
const themeColorMeta = document.querySelector('meta[name="theme-color"]');
const queryInput = document.getElementById('query-input');
const searchButton = document.querySelector('.btn-search');
const categoryButtons = document.querySelectorAll('.category-tab');
const dictionaryPanel = document.querySelector('.dictionary-panel');
const dictionarySelectRow = document.getElementById('dictionary-select-row');
const historyContainer = document.getElementById('search-history');
const offlineOverlay = document.getElementById('offline-overlay');
const mainView = document.getElementById('main-view');
const settingsButton = document.getElementById('settings-button');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsClose = document.getElementById('settings-close');
const settingsNavItems = document.querySelectorAll('.settings-nav__item');
const settingsSections = document.querySelectorAll('.settings-section');
const defaultDictionarySelect = document.getElementById('default-dictionary');
const openModeInputs = document.querySelectorAll('input[name="open-mode"]');
const themeModeInputs = document.querySelectorAll('input[name="theme-mode"]');
const clearHistoryButton = document.getElementById('clear-history');
const clearHistoryStatus = document.getElementById('clear-history-status');
const resetCacheButton = document.getElementById('reset-cache');
const networkStatus = document.getElementById('network-status');
const checkUpdateButton = document.getElementById('check-update');
const pwaInstallButton = document.getElementById('pwa-install-button');
const pwaInstallStatus = document.getElementById('pwa-install-status');
const pwaUpdateStatus = document.getElementById('pwa-update-status');
const pwaCheckUpdateButton = document.getElementById('pwa-check-update');
const pwaResetCacheButton = document.getElementById('pwa-reset-cache');
const aboutUpdateStatus = document.getElementById('about-update-status');
const appVersion = document.getElementById('app-version');
const installBanner = document.getElementById('install-banner');
const installButton = document.getElementById('install-button');
const installDismiss = document.getElementById('install-dismiss');
const currentTime = document.getElementById('current-time');
const CACHE_NAME = 'dictionary-v2';
const APP_VERSION = '1.0.0';
const DEFAULT_SETTINGS = { defaultDictionary: 'weblio', openMode: 'new', theme: 'auto' };
const DARK_THEME_COLOR = '#0b1120';
const DICTIONARY_THEME_COLORS = {
  weblio: '#1b4b8d',
  goo: '#2563a9',
  kotobank: '#334d8f',
  daijirin: '#123a6d',
  oxford: '#1a73e8',
  cambridge: '#2563eb',
  longman: '#0f5fc9',
  macmillan: '#0b4da2',
  naver_kr: '#d93025',
  daum_kr: '#c5221f',
  papago_ko: '#e5483f',
  google_ko: '#b91c1c',
  naver_zh: '#ff6f00',
  baidu_zh: '#f4511e',
  google_zh: '#e85d04',
  papago_zh: '#c2410c',
  jisho: '#0f9d58',
  alc: '#16a34a',
  weblio_ej: '#15803d',
  deepl_ej: '#047857',
  naver_ja_ko: '#fbbc05',
  daum_ja_ko: '#eab308',
  papago_jk: '#d97706',
  google_jk: '#ca8a04'
};
let selectedCategory = 'kokugo';
let selectedDictionary = 'weblio';
let searchHistory = loadSearchHistory();
let settings = loadSettings();
let isOffline = false;
let deferredInstallPrompt = null;
let serviceWorkerRegistration = null;

function loadSearchHistory() {
  try {
    const stored = localStorage.getItem('searchHistory');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
}

function saveSearchHistory() {
  localStorage.setItem('searchHistory', JSON.stringify(searchHistory));
}

function loadSettings() {
  try {
    const stored = localStorage.getItem('dictionarySettings');
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : { ...DEFAULT_SETTINGS };
  } catch (error) {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem('dictionarySettings', JSON.stringify(settings));
}

function isStandaloneApp() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function getResolvedTheme() {
  if (settings.theme === 'dark') return 'dark';
  if (settings.theme === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme() {
  const resolvedTheme = getResolvedTheme();
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
  updateThemeColor();
}

function findCategoryForDictionary(dictionaryKey) {
  return Object.entries(categories).find(([, category]) =>
    category.dictionaries.some((dict) => dict.key === dictionaryKey)
  )?.[0];
}

function applySettings() {
  const category = findCategoryForDictionary(settings.defaultDictionary);
  if (category) {
    selectedCategory = category;
    selectedDictionary = settings.defaultDictionary;
  } else {
    selectedCategory = 'kokugo';
    selectedDictionary = DEFAULT_SETTINGS.defaultDictionary;
    settings.defaultDictionary = DEFAULT_SETTINGS.defaultDictionary;
    saveSettings();
  }
}

function populateDefaultDictionarySelect() {
  if (!defaultDictionarySelect) return;
  defaultDictionarySelect.innerHTML = '';

  Object.entries(categories).forEach(([categoryKey, category]) => {
    const optgroup = document.createElement('optgroup');
    optgroup.label = category.label;

    category.dictionaries.forEach((dictionary) => {
      const option = document.createElement('option');
      option.value = dictionary.key;
      option.textContent = dictionary.label;
      optgroup.appendChild(option);
    });

    defaultDictionarySelect.appendChild(optgroup);
  });

  defaultDictionarySelect.value = settings.defaultDictionary || DEFAULT_SETTINGS.defaultDictionary;
}

function updateOpenModeInputs() {
  if (!openModeInputs) return;
  openModeInputs.forEach((input) => {
    input.checked = input.value === settings.openMode;
  });
}

function updateThemeModeInputs() {
  if (!themeModeInputs) return;
  themeModeInputs.forEach((input) => {
    input.checked = input.value === settings.theme;
  });
}

function updatePwaInstallState() {
  if (!pwaInstallButton && !pwaInstallStatus) return;

  const installed = isStandaloneApp();
  if (pwaInstallStatus) {
    if (installed) {
      pwaInstallStatus.textContent = 'このアプリはインストール済みです。';
    } else if (deferredInstallPrompt) {
      pwaInstallStatus.textContent = 'この端末にアプリとしてインストールできます。';
    } else {
      pwaInstallStatus.textContent = 'ブラウザの条件がそろうとインストールできます。';
    }
  }

  if (pwaInstallButton) {
    pwaInstallButton.disabled = installed || !deferredInstallPrompt;
    pwaInstallButton.textContent = installed ? 'インストール済み' : 'インストール';
  }
}

async function handleInstallPrompt() {
  if (!deferredInstallPrompt) {
    updatePwaInstallState();
    return;
  }
  deferredInstallPrompt.prompt();
  const choiceResult = await deferredInstallPrompt.userChoice;
  if (choiceResult.outcome === 'accepted') {
    console.log('PWA install accepted');
  } else {
    console.log('PWA install dismissed');
  }
  deferredInstallPrompt = null;
  hideInstallBanner();
  updatePwaInstallState();
}

function bindSettingsEvents() {
  if (defaultDictionarySelect) {
    defaultDictionarySelect.addEventListener('change', (event) => {
      settings.defaultDictionary = event.target.value;
      saveSettings();
      applySettings();
      updateCategorySelection();
    });
  }

  if (openModeInputs) {
    openModeInputs.forEach((input) => {
      input.addEventListener('change', (event) => {
        settings.openMode = event.target.value;
        saveSettings();
      });
    });
  }

  if (themeModeInputs) {
    themeModeInputs.forEach((input) => {
      input.addEventListener('change', (event) => {
        settings.theme = event.target.value;
        saveSettings();
        applyTheme();
      });
    });
  }
}

function getResultTarget() {
  return settings.openMode === 'same' ? '_self' : '_blank';
}

function getDictionaryLabel(dictionaryKey) {
  for (const category of Object.values(categories)) {
    const dictionary = category.dictionaries.find((item) => item.key === dictionaryKey);
    if (dictionary) {
      return dictionary.label;
    }
  }
  return dictionaryKey;
}

function addSearchHistory(term, dictionaryKey) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const existingIndex = searchHistory.findIndex(
    (item) => item.term === trimmed && item.dictionaryKey === dictionaryKey
  );
  if (existingIndex !== -1) {
    searchHistory.splice(existingIndex, 1);
  }
  searchHistory.push({ term: trimmed, dictionaryKey, timestamp: Date.now() });
  if (searchHistory.length > 60) {
    searchHistory.splice(0, searchHistory.length - 60);
  }
  saveSearchHistory();
  updateClearHistoryState();
}

function renderSearchHistory() {
  if (!historyContainer) return;
  historyContainer.innerHTML = '';

  const category = categories[selectedCategory];
  const categoryKeys = category.dictionaries.map((dict) => dict.key);
  const categoryHistory = searchHistory.filter((item) => categoryKeys.includes(item.dictionaryKey));

  const title = document.createElement('p');
  title.className = 'search-history-title';
  title.textContent = '検索履歴';
  historyContainer.appendChild(title);

  if (!categoryHistory.length) {
    const empty = document.createElement('p');
    empty.className = 'history-empty';
    empty.textContent = 'このカテゴリの検索履歴はまだありません。';
    historyContainer.appendChild(empty);
    return;
  }

  const historyByDictionary = categoryHistory.reduce((acc, item) => {
    const label = getDictionaryLabel(item.dictionaryKey);
    if (!acc[label]) acc[label] = [];
    acc[label].push(item);
    return acc;
  }, {});

  Object.entries(historyByDictionary).forEach(([label, items]) => {
    const group = document.createElement('div');
    group.className = 'history-group';

    const groupLabel = document.createElement('div');
    groupLabel.className = 'history-group-label';
    groupLabel.textContent = label;
    group.appendChild(groupLabel);

    const list = document.createElement('div');
    list.className = 'history-list';

    items
      .slice()
      .reverse()
      .slice(0, 6)
      .forEach((item) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'history-item';
        button.dataset.term = item.term;
        button.dataset.dictionary = item.dictionaryKey;
        button.addEventListener('click', () => {
          queryInput.value = item.term;
          selectedDictionary = item.dictionaryKey;
          setAccent(getSelectedAccentColor());
          renderDictionaryButtons();
          queryInput.focus();
        });

        const termSpan = document.createElement('span');
        termSpan.className = 'history-item-term';
        termSpan.textContent = item.term;
        button.appendChild(termSpan);

        const dictSpan = document.createElement('span');
        dictSpan.className = 'history-item-dict';
        dictSpan.textContent = label;
        button.appendChild(dictSpan);

        list.appendChild(button);
      });

    group.appendChild(list);
    historyContainer.appendChild(group);
  });
}

const categories = {
  kokugo: {
    label: '国語辞典',
    color: '#1b4b8d',
    dictionaries: [
      { key: 'weblio', label: 'Weblio' },
      { key: 'goo', label: 'goo 辞書' },
      { key: 'kotobank', label: 'コトバンク' },
      { key: 'daijirin', label: '大辞林' }
    ]
  },
  eigo: {
    label: '英語辞書',
    color: '#1a73e8',
    dictionaries: [
      { key: 'oxford', label: 'Oxford' },
      { key: 'cambridge', label: 'Cambridge' },
      { key: 'longman', label: 'Longman' },
      { key: 'macmillan', label: 'Macmillan' }
    ]
  },
  kankoku: {
    label: '韓国語辞書',
    color: '#d93025',
    dictionaries: [
      { key: 'naver_kr', label: 'NAVER 韓国語' },
      { key: 'daum_kr', label: 'Daum 韓国語' },
      { key: 'papago_ko', label: 'Papago 翻訳' },
      { key: 'google_ko', label: 'Google 翻訳' }
    ]
  },
  chinese: {
    label: '中国語辞典',
    color: '#ff6f00',
    dictionaries: [
      { key: 'naver_zh', label: 'NAVER 中国語' },
      { key: 'baidu_zh', label: 'Baidu 中国語' },
      { key: 'google_zh', label: 'Google 翻訳' },
      { key: 'papago_zh', label: 'Papago 翻訳' }
    ]
  },
  eij: {
    label: '英和・和英辞典',
    color: '#0f9d58',
    dictionaries: [
      { key: 'jisho', label: 'Jisho' },
      { key: 'alc', label: '英辞郎' },
      { key: 'weblio_ej', label: 'Weblio 英和' },
      { key: 'deepl_ej', label: 'DeepL' }
    ]
  },
  nikankoku: {
    label: '日韓・韓日辞典',
    color: '#fbbc05',
    dictionaries: [
      { key: 'naver_ja_ko', label: 'NAVER 日韓' },
      { key: 'daum_ja_ko', label: 'Daum 日韓' },
      { key: 'papago_jk', label: 'Papago 翻訳' },
      { key: 'google_jk', label: 'Google 翻訳' }
    ]
  }
};

const dictionaryUrls = {
  weblio: (term) => `https://www.weblio.jp/content/${encodeURIComponent(term)}`,
  goo: (term) => `https://dictionary.goo.ne.jp/srch/jn/${encodeURIComponent(term)}/m0u/`,
  kotobank: (term) => `https://kotobank.jp/word/${encodeURIComponent(term)}`,
  daijirin: (term) => `https://www.weblio.jp/content/${encodeURIComponent(term)}`,
  oxford: (term) => `https://www.oxfordlearnersdictionaries.com/definition/english/${encodeURIComponent(term)}`,
  cambridge: (term) => `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(term)}`,
  longman: (term) => `https://www.ldoceonline.com/dictionary/${encodeURIComponent(term)}`,
  macmillan: (term) => `https://www.macmillandictionary.com/dictionary/british/${encodeURIComponent(term)}`,
  google_trans: (term, from, to) => `https://translate.google.com/?sl=${from}&tl=${to}&text=${encodeURIComponent(term)}&op=translate`,
  deepl_trans: (term, from, to) => `https://www.deepl.com/translator#${from}/${to}/${encodeURIComponent(term)}`,
  papago_trans: (term, from, to) => `https://papago.naver.com/?sk=${from}&tk=${to}&st=${encodeURIComponent(term)}`,
  naver_kr: (term) => `https://ko.dict.naver.com/search.nhn?query=${encodeURIComponent(term)}`,
  daum_kr: (term) => `https://dic.daum.net/search.do?q=${encodeURIComponent(term)}`,
  papago_ko: (term) => `https://papago.naver.com/?sk=ja&tk=ko&st=${encodeURIComponent(term)}`,
  google_ko: (term) => `https://translate.google.com/?sl=ja&tl=ko&text=${encodeURIComponent(term)}&op=translate`,
  jisho: (term) => `https://jisho.org/search/${encodeURIComponent(term)}`,
  alc: (term) => `https://eow.alc.co.jp/search?q=${encodeURIComponent(term)}`,
  weblio_ej: (term) => `https://ejje.weblio.jp/content/${encodeURIComponent(term)}`,
  deepl_ej: (term) => `https://www.deepl.com/translator#ja/en/${encodeURIComponent(term)}`,
  naver_ja_ko: (term) => `https://ja.dict.naver.com/search.nhn?query=${encodeURIComponent(term)}`,
  daum_ja_ko: (term) => `https://dic.daum.net/search.do?q=${encodeURIComponent(term)}&dic=jp`,
  papago_jk: (term) => `https://papago.naver.com/?sk=ja&tk=ko&st=${encodeURIComponent(term)}`,
  google_jk: (term) => `https://translate.google.com/?sl=ja&tl=ko&text=${encodeURIComponent(term)}&op=translate`,
  naver_zh: (term) => `https://zh.dict.naver.com/search.nhn?query=${encodeURIComponent(term)}`,
  baidu_zh: (term) => `https://dict.baidu.com/s?wd=${encodeURIComponent(term)}`,
  google_zh: (term) => `https://translate.google.com/?sl=ja&tl=zh-CN&text=${encodeURIComponent(term)}&op=translate`,
  papago_zh: (term) => `https://papago.naver.com/?sk=ja&tk=zh-CN&st=${encodeURIComponent(term)}`
};

function getSelectedAccentColor() {
  return DICTIONARY_THEME_COLORS[selectedDictionary] || categories[selectedCategory].color;
}

function setAccent(color) {
  document.documentElement.style.setProperty('--accent-color', color);
  updateThemeColor(color);
}

function updateThemeColor(accentColor = getSelectedAccentColor()) {
  if (themeColorMeta) {
    const resolvedTheme = getResolvedTheme();
    themeColorMeta.setAttribute('content', resolvedTheme === 'dark' ? DARK_THEME_COLOR : accentColor);
  }
}

function animateElement(element, className, duration = 320) {
  if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  element.classList.remove(className);
  void element.offsetWidth;
  element.classList.add(className);
  window.setTimeout(() => {
    element.classList.remove(className);
  }, duration);
}

function updateDictionaryButtonSelection() {
  const buttons = dictionarySelectRow.querySelectorAll('.dict-pill');
  buttons.forEach((button) => {
    const isActive = button.dataset.dictionary === selectedDictionary;
    const wasActive = button.classList.contains('active');
    button.classList.toggle('active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
    if (isActive && !wasActive) {
      animateElement(button, 'dict-pill--selected');
    }
  });
}

function renderDictionaryButtons() {
  const category = categories[selectedCategory];
  dictionarySelectRow.innerHTML = '';
  dictionaryPanel.classList.remove('hide');
  dictionarySelectRow.setAttribute('aria-label', '辞書選択');

  category.dictionaries.forEach((dictionary) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `dict-pill ${dictionary.key}${dictionary.key === selectedDictionary ? ' active' : ''}`;
    button.setAttribute('aria-pressed', String(dictionary.key === selectedDictionary));
    if (isOffline) {
      button.classList.add('disabled');
      button.disabled = true;
    }
    button.dataset.dictionary = dictionary.key;

    const iconSpan = document.createElement('span');
    iconSpan.className = 'dict-pill-icon';
    iconSpan.setAttribute('aria-hidden', 'true');
    iconSpan.textContent = dictionary.icon || '';
    button.appendChild(iconSpan);

    const labelSpan = document.createElement('span');
    labelSpan.textContent = dictionary.label;
    button.appendChild(labelSpan);

    button.addEventListener('click', () => {
      if (isOffline) return;
      handleDictionarySelection(dictionary.key);
      queryInput.focus();
    });
    dictionarySelectRow.appendChild(button);
  });
  animateElement(dictionarySelectRow, 'dictionary-select--enter', 360);
}

function showInstallBanner() {
  if (installBanner) {
    installBanner.classList.remove('hide');
  }
}

function hideInstallBanner() {
  if (installBanner) {
    installBanner.classList.add('hide');
  }
}

function openSettings() {
  updateClearHistoryState();
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (mainView) mainView.classList.add('hide');
    if (settingsOverlay) settingsOverlay.classList.remove('hide');
    if (settingsClose) settingsClose.focus();
    return;
  }

  if (mainView) {
    mainView.classList.add('view-exit');
  }
  window.setTimeout(() => {
    if (mainView) {
      mainView.classList.add('hide');
      mainView.classList.remove('view-exit');
    }
    if (settingsOverlay) {
      settingsOverlay.classList.remove('hide');
      animateElement(settingsOverlay, 'settings-view--enter', 360);
    }
    if (settingsClose) {
      settingsClose.focus();
    }
  }, 180);
}

function closeSettings() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    if (settingsOverlay) settingsOverlay.classList.add('hide');
    if (mainView) mainView.classList.remove('hide');
    if (settingsButton) settingsButton.focus();
    return;
  }

  if (settingsOverlay) {
    settingsOverlay.classList.add('settings-view--leave');
  }
  window.setTimeout(() => {
    if (settingsOverlay) {
      settingsOverlay.classList.add('hide');
      settingsOverlay.classList.remove('settings-view--leave');
    }
    if (mainView) {
      mainView.classList.remove('hide');
      animateElement(mainView, 'view-enter', 320);
    }
    if (settingsButton) {
      settingsButton.focus();
    }
  }, 220);
}

function showSettingsSection(sectionId) {
  settingsSections.forEach((section) => {
    section.classList.toggle('settings-section--active', section.id === sectionId);
  });

  settingsNavItems.forEach((navItem) => {
    navItem.classList.toggle('active', navItem.dataset.settingsTarget === sectionId);
  });
}

function clearSearchHistory() {
  if (!searchHistory.length) {
    alert('削除できる検索履歴がありません。');
    updateClearHistoryState();
    return;
  }
  const shouldClear = window.confirm('検索履歴をすべて削除します。よろしいですか？');
  if (!shouldClear) return;
  searchHistory = [];
  saveSearchHistory();
  renderSearchHistory();
  updateClearHistoryState();
  alert('検索履歴を削除しました。');
}

function updateClearHistoryState() {
  const historyCount = searchHistory.length;
  if (clearHistoryStatus) {
    clearHistoryStatus.textContent = `保存件数: ${historyCount}件`;
  }
  if (clearHistoryButton) {
    clearHistoryButton.disabled = historyCount === 0;
  }
}

function resetCacheAndReload() {
  if ('caches' in window) {
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('dictionary-'))
          .map((cacheName) => caches.delete(cacheName))
      ))
      .finally(() => {
        window.location.reload();
      });
  } else {
    window.location.reload();
  }
}

function updateNetworkStatusLabel() {
  if (networkStatus) {
    networkStatus.textContent = `現在: ${navigator.onLine ? 'オンライン' : 'オフライン'}`;
  }
}

function checkForUpdates() {
  if (aboutUpdateStatus) {
    aboutUpdateStatus.textContent = '更新を確認しています...';
  }
  if (pwaUpdateStatus) {
    pwaUpdateStatus.textContent = '更新を確認しています...';
  }

  window.setTimeout(() => {
    if (aboutUpdateStatus) {
      aboutUpdateStatus.textContent = 'MALU は最新です';
    }
    if (pwaUpdateStatus) {
      pwaUpdateStatus.textContent = 'MALU は最新です。';
    }
  }, 600);
}

async function checkForServiceWorkerUpdates() {
  if (aboutUpdateStatus) {
    aboutUpdateStatus.textContent = '更新を確認しています...';
  }
  if (pwaUpdateStatus) {
    pwaUpdateStatus.textContent = '更新を確認しています...';
  }

  if (!('serviceWorker' in navigator)) {
    if (aboutUpdateStatus) {
      aboutUpdateStatus.textContent = 'Service Worker は使用できません。';
    }
    if (pwaUpdateStatus) {
      pwaUpdateStatus.textContent = 'Service Worker は使用できません。';
    }
    return;
  }

  try {
    const registration = serviceWorkerRegistration || await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error('Service Worker registration not found');
    }

    serviceWorkerRegistration = registration;
    await registration.update();

    const hasUpdate = Boolean(registration.waiting || registration.installing);
    const message = hasUpdate
      ? '更新を見つけました。再読み込みで反映します。'
      : 'MALU は最新です。';

    if (aboutUpdateStatus) {
      aboutUpdateStatus.textContent = message;
    }
    if (pwaUpdateStatus) {
      pwaUpdateStatus.textContent = message;
    }
  } catch (error) {
    if (aboutUpdateStatus) {
      aboutUpdateStatus.textContent = '更新の確認に失敗しました。';
    }
    if (pwaUpdateStatus) {
      pwaUpdateStatus.textContent = '更新の確認に失敗しました。';
    }
    console.log('Service Worker update check failed:', error);
  }
}

function updateCategorySelection() {
  categoryButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.category === selectedCategory);
  });
  const category = categories[selectedCategory];
  if (!category.dictionaries.some((dict) => dict.key === selectedDictionary)) {
    selectedDictionary = category.dictionaries[0].key;
  }
  setAccent(getSelectedAccentColor());
  renderDictionaryButtons();
  renderSearchHistory();
}

function handleDictionarySelection(dictionaryKey) {
  if (selectedDictionary === dictionaryKey) return;
  selectedDictionary = dictionaryKey;
  setAccent(getSelectedAccentColor());
  updateDictionaryButtonSelection();
}

function setOfflineMode(value) {
  isOffline = value;
  if (offlineOverlay) {
    offlineOverlay.classList.toggle('hide', !value);
  }
  if (queryInput) {
    queryInput.disabled = value;
  }
  if (searchButton) {
    searchButton.disabled = value;
  }
  categoryButtons.forEach((button) => {
    button.disabled = value;
  });
  renderDictionaryButtons();
}

function updateOnlineStatus() {
  setOfflineMode(!navigator.onLine);
  updateNetworkStatusLabel();
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
const colorSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
const handleColorSchemeChange = () => {
  if (settings.theme === 'auto') {
    applyTheme();
  }
};
if (colorSchemeQuery.addEventListener) {
  colorSchemeQuery.addEventListener('change', handleColorSchemeChange);
} else if (colorSchemeQuery.addListener) {
  colorSchemeQuery.addListener(handleColorSchemeChange);
}


function updateTime() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const weekdayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];
  const weekday = weekdayNames[now.getDay()];
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const currentDate = document.getElementById('current-date');
  if (currentDate) {
    currentDate.textContent = `${year}年${month}月${day}日 ${weekday}`;
  }
  currentTime.textContent = `${hours}:${minutes}`;
}

categoryButtons.forEach((button) => {
  button.addEventListener('click', () => {
    selectedCategory = button.dataset.category;
    updateCategorySelection();
    queryInput.focus();
  });
});

if (settingsButton) {
  settingsButton.addEventListener('click', openSettings);
}

if (settingsClose) {
  settingsClose.addEventListener('click', closeSettings);
}

settingsNavItems.forEach((item) => {
  item.addEventListener('click', (event) => {
    event.preventDefault();
    showSettingsSection(item.dataset.settingsTarget);
  });
});

if (clearHistoryButton) {
  clearHistoryButton.addEventListener('click', clearSearchHistory);
}

if (resetCacheButton) {
  resetCacheButton.addEventListener('click', resetCacheAndReload);
}

if (checkUpdateButton) {
  checkUpdateButton.addEventListener('click', checkForServiceWorkerUpdates);
}

if (pwaInstallButton) {
  pwaInstallButton.addEventListener('click', handleInstallPrompt);
}

if (pwaCheckUpdateButton) {
  pwaCheckUpdateButton.addEventListener('click', checkForServiceWorkerUpdates);
}

if (pwaResetCacheButton) {
  pwaResetCacheButton.addEventListener('click', resetCacheAndReload);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && settingsOverlay && !settingsOverlay.classList.contains('hide')) {
    closeSettings();
  }
});

if (installButton) {
  installButton.addEventListener('click', handleInstallPrompt);
}

if (installDismiss) {
  installDismiss.addEventListener('click', hideInstallBanner);
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallBanner();
  updatePwaInstallState();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  hideInstallBanner();
  updatePwaInstallState();
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (isOffline) {
    return;
  }
  const text = queryInput.value.trim();
  if (!text) {
    queryInput.focus();
    return;
  }
  addSearchHistory(text, selectedDictionary);
  renderSearchHistory();
  const urlBuilder = dictionaryUrls[selectedDictionary];
  if (!urlBuilder) {
    alert('辞書を選択してください。');
    return;
  }
  const url = urlBuilder(text);
  window.open(url, getResultTarget());
});

window.addEventListener('DOMContentLoaded', () => {
  applySettings();
  applyTheme();
  populateDefaultDictionarySelect();
  updateOpenModeInputs();
  updateThemeModeInputs();
  bindSettingsEvents();
  updateClearHistoryState();
  if (appVersion) {
    appVersion.textContent = APP_VERSION;
  }
  updateCategorySelection();
  updatePwaInstallState();
  updateTime();
  setInterval(updateTime, 60_000);
  updateOnlineStatus();
  queryInput.focus();
  
  // Service Worker の登録
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then((registration) => {
      serviceWorkerRegistration = registration;
      console.log('Service Worker registered:', registration);
    }).catch((error) => {
      console.log('Service Worker registration failed:', error);
    });
  }
});

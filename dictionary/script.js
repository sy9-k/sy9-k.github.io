const form = document.getElementById('dictionary-form');
const queryInput = document.getElementById('query-input');
const searchButton = document.querySelector('.btn-search');
const categoryButtons = document.querySelectorAll('.category-tab');
const dictionaryPanel = document.querySelector('.dictionary-panel');
const dictionarySelectRow = document.getElementById('dictionary-select-row');
const historyContainer = document.getElementById('search-history');
const offlineOverlay = document.getElementById('offline-overlay');
const settingsButton = document.getElementById('settings-button');
const settingsOverlay = document.getElementById('settings-overlay');
const settingsClose = document.getElementById('settings-close');
const defaultDictionarySelect = document.getElementById('default-dictionary');
const openModeInputs = document.querySelectorAll('input[name="open-mode"]');
const clearHistoryButton = document.getElementById('clear-history');
const resetCacheButton = document.getElementById('reset-cache');
const networkStatus = document.getElementById('network-status');
const installBanner = document.getElementById('install-banner');
const installButton = document.getElementById('install-button');
const installDismiss = document.getElementById('install-dismiss');
const currentTime = document.getElementById('current-time');
const CACHE_NAME = 'dictionary-v1';
const DEFAULT_SETTINGS = { defaultDictionary: 'weblio', openMode: 'new' };
let selectedCategory = 'kokugo';
let selectedDictionary = 'weblio';
let searchHistory = loadSearchHistory();
let settings = loadSettings();
let isOffline = false;
let deferredInstallPrompt = null;

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
      { key: 'goo', label: 'goo辞書' },
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
      { key: 'naver_kr', label: 'NAVER韓国語' },
      { key: 'daum_kr', label: 'Daum韓国語' },
      { key: 'papago_ko', label: 'Papago翻訳' },
      { key: 'google_ko', label: 'Google翻訳' }
    ]
  },
  chinese: {
    label: '中国語辞典',
    color: '#ff6f00',
    dictionaries: [
      { key: 'naver_zh', label: 'NAVER中国語' },
      { key: 'baidu_zh', label: 'Baidu中国語' },
      { key: 'google_zh', label: 'Google翻訳' },
      { key: 'papago_zh', label: 'Papago翻訳' }
    ]
  },
  eij: {
    label: '英和・和英辞典',
    color: '#0f9d58',
    dictionaries: [
      { key: 'jisho', label: 'Jisho' },
      { key: 'alc', label: '英辞郎' },
      { key: 'weblio_ej', label: 'Weblio英和' },
      { key: 'deepl_ej', label: 'DeepL' }
    ]
  },
  nikankoku: {
    label: '日韓・韓日辞典',
    color: '#fbbc05',
    dictionaries: [
      { key: 'naver_ja_ko', label: 'NAVER日韓' },
      { key: 'daum_ja_ko', label: 'Daum日韓' },
      { key: 'papago_jk', label: 'Papago翻訳' },
      { key: 'google_jk', label: 'Google翻訳' }
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

function setAccent(color) {
  document.documentElement.style.setProperty('--accent-color', color);
}

function renderDictionaryButtons() {
  const category = categories[selectedCategory];
  dictionarySelectRow.innerHTML = '';
  dictionaryPanel.classList.remove('hide');
  dictionarySelectRow.setAttribute('aria-label', '辞書選択');

  category.dictionaries.forEach((dictionary) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `dict-pill${dictionary.key === selectedDictionary ? ' active' : ''}`;
    if (isOffline) {
      button.classList.add('disabled');
      button.disabled = true;
    }
    button.dataset.dictionary = dictionary.key;

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
  if (settingsOverlay) {
    settingsOverlay.classList.remove('hide');
  }
}

function closeSettings() {
  if (settingsOverlay) {
    settingsOverlay.classList.add('hide');
  }
}

function clearSearchHistory() {
  searchHistory = [];
  saveSearchHistory();
  renderSearchHistory();
  alert('検索履歴を削除しました。');
}

function resetCacheAndReload() {
  if ('caches' in window) {
    caches.delete(CACHE_NAME).finally(() => {
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

function updateCategorySelection() {
  categoryButtons.forEach((button) => {
    button.classList.toggle('active', button.dataset.category === selectedCategory);
  });
  const category = categories[selectedCategory];
  if (!category.dictionaries.some((dict) => dict.key === selectedDictionary)) {
    selectedDictionary = category.dictionaries[0].key;
  }
  setAccent(category.color);
  renderDictionaryButtons();
  renderSearchHistory();
}

function handleDictionarySelection(dictionaryKey) {
  selectedDictionary = dictionaryKey;
  setAccent(categories[selectedCategory].color);
  renderDictionaryButtons();
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

if (settingsOverlay) {
  settingsOverlay.addEventListener('click', (event) => {
    if (event.target === settingsOverlay) {
      closeSettings();
    }
  });
}

if (clearHistoryButton) {
  clearHistoryButton.addEventListener('click', clearSearchHistory);
}

if (resetCacheButton) {
  resetCacheButton.addEventListener('click', resetCacheAndReload);
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && settingsOverlay && !settingsOverlay.classList.contains('hide')) {
    closeSettings();
  }
});

if (installButton) {
  installButton.addEventListener('click', async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const choiceResult = await deferredInstallPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('PWA install accepted');
    } else {
      console.log('PWA install dismissed');
    }
    deferredInstallPrompt = null;
    hideInstallBanner();
  });
}

if (installDismiss) {
  installDismiss.addEventListener('click', hideInstallBanner);
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  showInstallBanner();
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  hideInstallBanner();
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
  updateCategorySelection();
  updateTime();
  setInterval(updateTime, 60_000);
  updateOnlineStatus();
  queryInput.focus();
  
  // Service Worker の登録
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then((registration) => {
      console.log('Service Worker registered:', registration);
    }).catch((error) => {
      console.log('Service Worker registration failed:', error);
    });
  }
});
// コントローラー用JavaScript

// グローバル変数
let parentWindow = null;
let currentPage = 'home';
let lastUpdateTime = null;

// 初期化
document.addEventListener('DOMContentLoaded', function() {
    initializeController();
    updateLastUpdateTime();
    setInterval(updateLastUpdateTime, 1000);
    
    // 親ウィンドウとの通信設定
    setupParentCommunication();
    
    // フライト設定の読み込み
    loadFlightSettings();
});

// コントローラー初期化
function initializeController() {
    // 言語設定の復元
    const savedLanguage = localStorage.getItem('language') || 'ja';
    document.getElementById('language-select').value = savedLanguage;
    
    // 音量・明るさ設定の復元
    const savedVolume = localStorage.getItem('volumePercent') || '60';
    const savedBrightness = localStorage.getItem('brightnessPercent') || '75';
    
    document.getElementById('volume-slider').value = savedVolume;
    document.getElementById('brightness-slider').value = savedBrightness;
    document.getElementById('volume-value').textContent = savedVolume + '%';
    document.getElementById('brightness-value').textContent = savedBrightness + '%';
    
    // 現在のページを取得
    detectCurrentPage();
    
    // キーボードショートカット
    setupKeyboardShortcuts();
}

// 親ウィンドウとの通信設定
function setupParentCommunication() {
    // 親ウィンドウを取得
    if (window.opener) {
        parentWindow = window.opener;
    } else if (window.parent && window.parent !== window) {
        parentWindow = window.parent;
    }
    
    // メッセージ受信リスナー
    window.addEventListener('message', function(event) {
        handleParentMessage(event.data);
    });
}

// 親ウィンドウからのメッセージ処理
function handleParentMessage(data) {
    switch(data.type) {
        case 'page_changed':
            updateCurrentPage(data.page);
            break;
        case 'volume_changed':
            updateVolumeDisplay(data.volume);
            break;
        case 'brightness_changed':
            updateBrightnessDisplay(data.brightness);
            break;
        case 'language_changed':
            updateLanguageDisplay(data.language);
            break;
        case 'announcement_status':
            updateAnnouncementStatus(data.status);
            break;
    }
}

// 現在のページを検出
function detectCurrentPage() {
    if (parentWindow) {
        try {
            const parentLocation = parentWindow.location.pathname;
            const pageName = parentLocation.split('/').pop().replace('.html', '');
            updateCurrentPage(pageName);
        } catch (e) {
            console.log('親ウィンドウのページ情報を取得できませんでした');
        }
    }
}

// 現在のページを更新
function updateCurrentPage(page) {
    currentPage = page;
    const pageNames = {
        'index': 'ホーム',
        'home': 'ホーム',
        'entertainment': 'エンターテイメント',
        'meal': '食事',
        'map': 'フライトマップ',
        'wifi': 'Wi-Fi',
        'game': 'ゲーム',
        'language': '言語設定'
    };
    
    document.getElementById('current-page').textContent = pageNames[page] || page;
}

// 最終更新時刻の更新
function updateLastUpdateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ja-JP', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    document.getElementById('last-update').textContent = timeString;
    lastUpdateTime = now;
}

// キーボードショートカットの設定
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', function(e) {
        // Ctrl + キーで各種制御
        if (e.ctrlKey) {
            switch(e.key) {
                case 'h':
                    e.preventDefault();
                    navigateTo('home');
                    break;
                case 'e':
                    e.preventDefault();
                    navigateTo('entertainment');
                    break;
                case 'm':
                    e.preventDefault();
                    navigateTo('meal');
                    break;
                case 'p':
                    e.preventDefault();
                    mediaControl('play');
                    break;
                case ' ':
                    e.preventDefault();
                    mediaControl('pause');
                    break;
                case 's':
                    e.preventDefault();
                    mediaControl('stop');
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    mediaControl('prev');
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    mediaControl('next');
                    break;
                case 'a':
                    e.preventDefault();
                    startAnnounce();
                    break;
                case 'x':
                    e.preventDefault();
                    stopAnnounce();
                    break;
            }
        }
    });
}

// ナビゲーション制御
function navigateTo(page) {
    try {
        const pageUrls = {
            'home': '/index.html',
            'entertainment': '/entertainment.html',
            'meal': '/meal.html',
            'map': '/map.html',
            'wifi': '/wifi.html',
            'game': '/game.html'
        };
        
        const url = pageUrls[page];
        if (!url) {
            showNotification(`不明なページ: ${page}`, 'error');
            return;
        }
        
        // 親ウィンドウにナビゲーション指示を送信
        if (parentWindow) {
            parentWindow.location.href = url;
            updateCurrentPage(page);
        } else {
            // 親ウィンドウがない場合は直接遷移
            window.location.href = url;
        }
        
        showNotification(`ページ遷移: ${page}`, 'success');
        logAction('navigation', { page: page });
    } catch (error) {
        showNotification('ナビゲーションエラー: ' + error.message, 'error');
        console.error('Navigation error:', error);
    }
}

// メディア制御
function mediaControl(action) {
    try {
        const actions = {
            'play': '再生',
            'pause': '一時停止',
            'stop': '停止',
            'prev': '前の項目',
            'next': '次の項目',
            'rewind': '10秒戻る',
            'forward': '10秒進む',
            'mute': 'ミュート'
        };
        
        // 親ウィンドウにメディア制御指示を送信
        if (parentWindow) {
            parentWindow.postMessage({
                type: 'media_control',
                action: action
            }, '*');
        }
        
        showNotification(`メディア制御: ${actions[action]}`, 'info');
        logAction('media_control', { action: action });
    } catch (error) {
        showNotification('メディア制御エラー: ' + error.message, 'error');
        console.error('Media control error:', error);
    }
}

// 音量制御
function setVolume(value) {
    try {
        document.getElementById('volume-value').textContent = value + '%';
        localStorage.setItem('volumePercent', value);
        
        // 親ウィンドウに音量設定を送信
        if (parentWindow) {
            parentWindow.postMessage({
                type: 'volume_set',
                volume: value
            }, '*');
        }
        
        logAction('volume_set', { value: value });
    } catch (error) {
        console.error('Volume control error:', error);
    }
}

function adjustVolume(delta) {
    const slider = document.getElementById('volume-slider');
    const newValue = Math.max(0, Math.min(100, parseInt(slider.value) + delta));
    slider.value = newValue;
    setVolume(newValue);
}

// 音量表示の更新
function updateVolumeDisplay(volume) {
    document.getElementById('volume-slider').value = volume;
    document.getElementById('volume-value').textContent = volume + '%';
}

// 明るさ制御
function setBrightness(value) {
    try {
        document.getElementById('brightness-value').textContent = value + '%';
        localStorage.setItem('brightnessPercent', value);
        
        // 親ウィンドウに明るさ設定を送信
        if (parentWindow) {
            parentWindow.postMessage({
                type: 'brightness_set',
                brightness: value
            }, '*');
        }
        
        logAction('brightness_set', { value: value });
    } catch (error) {
        console.error('Brightness control error:', error);
    }
}

function adjustBrightness(delta) {
    const slider = document.getElementById('brightness-slider');
    const newValue = Math.max(0, Math.min(100, parseInt(slider.value) + delta));
    slider.value = newValue;
    setBrightness(newValue);
}

// 明るさ表示の更新
function updateBrightnessDisplay(brightness) {
    document.getElementById('brightness-slider').value = brightness;
    document.getElementById('brightness-value').textContent = brightness + '%';
}

// 言語設定
function setLanguage(lang) {
    try {
        localStorage.setItem('language', lang);
        
        // 親ウィンドウに言語設定を送信
        if (parentWindow) {
            parentWindow.postMessage({
                type: 'language_set',
                language: lang
            }, '*');
        }
        
        showNotification(`言語設定: ${getLanguageName(lang)}`, 'info');
        logAction('language_set', { language: lang });
    } catch (error) {
        showNotification('言語設定エラー: ' + error.message, 'error');
        console.error('Language setting error:', error);
    }
}

// 言語表示の更新
function updateLanguageDisplay(language) {
    document.getElementById('language-select').value = language;
}

function getLanguageName(code) {
    const languages = {
        'ja': '日本語',
        'en': 'English',
        'ko': '한국어',
        'zh': '中文'
    };
    return languages[code] || code;
}

// PAアナウンス制御
function startAnnounce() {
    try {
        const text = document.getElementById('announce-text').value.trim();
        if (!text) {
            showNotification('アナウンス内容を入力してください', 'error');
            return;
        }
        
        // 親ウィンドウにアナウンス開始指示を送信
        if (parentWindow) {
            parentWindow.postMessage({
                type: 'announce_start',
                text: text
            }, '*');
        }
        
        const status = document.getElementById('announce-status');
        status.textContent = 'アナウンス中...';
        status.className = 'rc-announce-status info';
        
        showNotification('アナウンス開始', 'success');
        logAction('announce_start', { text: text });
    } catch (error) {
        showNotification('アナウンス開始エラー: ' + error.message, 'error');
        console.error('Announcement start error:', error);
    }
}

function stopAnnounce() {
    try {
        // 親ウィンドウにアナウンス停止指示を送信
        if (parentWindow) {
            parentWindow.postMessage({
                type: 'announce_stop'
            }, '*');
        }
        
        const status = document.getElementById('announce-status');
        status.textContent = 'アナウンス停止';
        status.className = 'rc-announce-status success';
        
        showNotification('アナウンス停止', 'info');
        logAction('announce_stop');
    } catch (error) {
        showNotification('アナウンス停止エラー: ' + error.message, 'error');
        console.error('Announcement stop error:', error);
    }
}

// アナウンスステータスの更新
function updateAnnouncementStatus(status) {
    const statusElement = document.getElementById('announce-status');
    if (status.active) {
        statusElement.textContent = 'アナウンス中...';
        statusElement.className = 'rc-announce-status info';
    } else {
        statusElement.textContent = 'アナウンス停止';
        statusElement.className = 'rc-announce-status success';
    }
}

// 通知送信
function sendNotification() {
    try {
        const title = document.getElementById('notification-title').value.trim();
        const message = document.getElementById('notification-message').value.trim();
        
        if (!title || !message) {
            showNotification('タイトルとメッセージを入力してください', 'error');
            return;
        }
        
        // 親ウィンドウに通知送信指示を送信
        if (parentWindow) {
            parentWindow.postMessage({
                type: 'send_notification',
                title: title,
                message: message
            }, '*');
        }
        
        showNotification('通知を送信しました', 'success');
        logAction('send_notification', { title: title, message: message });
        
        // 入力フィールドをクリア
        document.getElementById('notification-title').value = '';
        document.getElementById('notification-message').value = '';
    } catch (error) {
        showNotification('通知送信エラー: ' + error.message, 'error');
        console.error('Notification send error:', error);
    }
}

// 全通知削除
function clearNotifications() {
    try {
        // 親ウィンドウに通知削除指示を送信
        if (parentWindow) {
            parentWindow.postMessage({
                type: 'clear_notifications'
            }, '*');
        }
        
        showNotification('全通知を削除しました', 'success');
        logAction('clear_notifications');
    } catch (error) {
        showNotification('通知削除エラー: ' + error.message, 'error');
        console.error('Notification clear error:', error);
    }
}

// 緊急制御
function emergencyStop() {
    if (confirm('本当に全停止しますか？この操作は取り消せません。')) {
        try {
            // 親ウィンドウに緊急停止指示を送信
            if (parentWindow) {
                parentWindow.postMessage({
                    type: 'emergency_stop'
                }, '*');
            }
            
            showNotification('緊急停止実行', 'error');
            logAction('emergency_stop');
        } catch (error) {
            showNotification('緊急停止エラー: ' + error.message, 'error');
            console.error('Emergency stop error:', error);
        }
    }
}

function restartSystem() {
    if (confirm('システムを再起動しますか？')) {
        try {
            // 親ウィンドウに再起動指示を送信
            if (parentWindow) {
                parentWindow.postMessage({
                    type: 'system_restart'
                }, '*');
            }
            
            showNotification('システム再起動中...', 'warning');
            logAction('system_restart');
        } catch (error) {
            showNotification('システム再起動エラー: ' + error.message, 'error');
            console.error('System restart error:', error);
        }
    }
}

function showSystemInfo() {
    const info = {
        'システムバージョン': 'v1.0.0',
        '現在のページ': currentPage,
        '最終更新': lastUpdateTime ? lastUpdateTime.toLocaleString('ja-JP') : '不明',
        'ブラウザ': navigator.userAgent,
        '画面解像度': `${screen.width}x${screen.height}`,
        '利用可能メモリ': navigator.deviceMemory ? `${navigator.deviceMemory}GB` : '不明'
    };
    
    showModal('システム情報', createInfoTable(info));
}

// ユーティリティ関数
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function closeController() {
    if (confirm('コントローラーを閉じますか？')) {
        window.close();
    }
}

function showLogs() {
    // 実際の実装では、ログファイルを読み込んで表示
    const logs = [
        { time: '10:30:15', level: 'INFO', message: 'コントローラー起動' },
        { time: '10:30:20', level: 'INFO', message: '現在のページ: ホーム' },
        { time: '10:31:05', level: 'INFO', message: 'ページ遷移: entertainment' },
        { time: '10:32:10', level: 'WARN', message: '音量調整: 80%' }
    ];
    
    const logContent = logs.map(log => 
        `<div class="log-entry log-${log.level.toLowerCase()}">
            <span class="log-time">${log.time}</span>
            <span class="log-level">${log.level}</span>
            <span class="log-message">${log.message}</span>
        </div>`
    ).join('');
    
    showModal('システムログ', `<div class="log-container">${logContent}</div>`);
}

function showHelp() {
    const helpContent = `
        <h4>キーボードショートカット</h4>
        <ul>
            <li><strong>Ctrl + H</strong>: ホームページ</li>
            <li><strong>Ctrl + E</strong>: エンターテイメント</li>
            <li><strong>Ctrl + M</strong>: 食事ページ</li>
            <li><strong>Ctrl + P</strong>: 再生</li>
            <li><strong>Ctrl + Space</strong>: 一時停止</li>
            <li><strong>Ctrl + S</strong>: 停止</li>
            <li><strong>Ctrl + ←</strong>: 前の項目</li>
            <li><strong>Ctrl + →</strong>: 次の項目</li>
            <li><strong>Ctrl + A</strong>: アナウンス開始</li>
            <li><strong>Ctrl + X</strong>: アナウンス停止</li>
        </ul>
        
        <h4>操作方法</h4>
        <p>各ボタンをクリックすることで、メインページを制御できます。</p>
        <p>音量・明るさはスライダーまたは±ボタンで調整できます。</p>
        <p>PAアナウンスはテキストエリアに入力してから開始ボタンを押してください。</p>
    `;
    
    showModal('ヘルプ', helpContent);
}

// モーダル制御
function showModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = content;
    document.getElementById('modal-overlay').classList.add('show');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('show');
}

// 通知表示
function showNotification(message, type = 'info') {
    // 実際の実装では、トースト通知を表示
    console.log(`[${type.toUpperCase()}] ${message}`);
}

// ログ記録
function logAction(action, data = {}) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        action: action,
        data: data,
        page: currentPage,
        userAgent: navigator.userAgent
    };
    
    // 実際の実装では、ログをサーバーに送信またはローカルストレージに保存
    console.log('Action logged:', logEntry);
}

// フライト設定関連の関数
function loadFlightSettings() {
    // ローカルストレージから設定を読み込み
    const flightNumber = localStorage.getItem('flightNumber') || '';
    const seatNumber = localStorage.getItem('seatNumber') || '';
    const departureCity = localStorage.getItem('departureCity') || '大阪（関西）';
    const arrivalCity = localStorage.getItem('arrivalCity') || 'ソウル（仁川）';
    const depTime = localStorage.getItem('depTime') || '';
    const arrTime = localStorage.getItem('arrTime') || '';
    const progressPercent = localStorage.getItem('progressPercent') || '';
    
    // フォームに設定値を反映
    document.getElementById('flightNumber').value = flightNumber;
    document.getElementById('seatNumber').value = seatNumber;
    document.getElementById('departureCity').value = departureCity;
    document.getElementById('arrivalCity').value = arrivalCity;
    document.getElementById('depTime').value = depTime;
    document.getElementById('arrTime').value = arrTime;
    document.getElementById('progressPercent').value = progressPercent;
    
    // 空港IDを自動設定
    updateAirportIDs();
}

function saveFlightSettings() {
    // フォームから値を取得
    const flightNumber = document.getElementById('flightNumber').value;
    const seatNumber = document.getElementById('seatNumber').value;
    const departureCity = document.getElementById('departureCity').value;
    const arrivalCity = document.getElementById('arrivalCity').value;
    const depTime = document.getElementById('depTime').value;
    const arrTime = document.getElementById('arrTime').value;
    const progressPercent = document.getElementById('progressPercent').value;
    
    // ローカルストレージに保存
    localStorage.setItem('flightNumber', flightNumber);
    localStorage.setItem('seatNumber', seatNumber);
    localStorage.setItem('departureCity', departureCity);
    localStorage.setItem('arrivalCity', arrivalCity);
    localStorage.setItem('depTime', depTime);
    localStorage.setItem('arrTime', arrTime);
    localStorage.setItem('progressPercent', progressPercent);
    
    // 空港IDを自動設定して保存
    updateAirportIDs();
    
    // 親ウィンドウに設定変更を通知
    if (parentWindow) {
        parentWindow.postMessage({
            type: 'flight_settings_updated',
            data: {
                flightNumber: flightNumber,
                seatNumber: seatNumber,
                departureCity: departureCity,
                arrivalCity: arrivalCity,
                depTime: depTime,
                arrTime: arrTime,
                progressPercent: progressPercent
            }
        }, '*');
    }
    
    showNotification('フライト設定を保存しました', 'success');
    logAction('flight_settings_saved', {
        flightNumber: flightNumber,
        seatNumber: seatNumber,
        departureCity: departureCity,
        arrivalCity: arrivalCity
    });
}

function updateAirportIDs() {
    const departureCity = document.getElementById('departureCity').value;
    const arrivalCity = document.getElementById('arrivalCity').value;
    
    // 出発地の空港IDマッピング
    const departureMapping = {
        '大阪（関西）': 'KIX',
        '東京（成田）': 'NRT',
        '東京（羽田）': 'HND',
        '名古屋（中部）': 'NGO',
        '福岡': 'FUK',
        '札幌': 'CTS'
    };
    
    // 到着地の空港IDマッピング
    const arrivalMapping = {
        'ソウル（仁川）': 'ICN',
        '釜山': 'PUS',
        '台北': 'TPE'
    };
    
    // 空港IDを自動設定
    if (departureMapping[departureCity]) {
        localStorage.setItem('departureID', departureMapping[departureCity]);
    }
    if (arrivalMapping[arrivalCity]) {
        localStorage.setItem('arrivalID', arrivalMapping[arrivalCity]);
    }
}

// ユーティリティ関数
function createInfoTable(info) {
    const rows = Object.entries(info).map(([key, value]) => 
        `<tr><td><strong>${key}</strong></td><td>${value}</td></tr>`
    ).join('');
    
    return `<table class="info-table">
        <tbody>${rows}</tbody>
    </table>`;
}

// モーダル外クリックで閉じる
document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) {
        closeModal();
    }
});

// ESCキーでモーダルを閉じる
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// 都市選択時の空港ID自動更新イベントリスナーを追加
document.addEventListener('DOMContentLoaded', function() {
    const departureCitySelect = document.getElementById('departureCity');
    const arrivalCitySelect = document.getElementById('arrivalCity');
    
    if (departureCitySelect) {
        departureCitySelect.addEventListener('change', updateAirportIDs);
    }
    if (arrivalCitySelect) {
        arrivalCitySelect.addEventListener('change', updateAirportIDs);
    }
});

// ページ離脱時の処理
window.addEventListener('beforeunload', function() {
    // 親ウィンドウにコントローラー終了を通知
    if (parentWindow) {
        parentWindow.postMessage({
            type: 'controller_closed'
        }, '*');
    }
}); 

// プレイリスト管理
function getPlaylist() {
  return JSON.parse(localStorage.getItem('playlist') || '[]');
}

function savePlaylist(list) {
  localStorage.setItem('playlist', JSON.stringify(list));
}

function renderPlaylist() {
  const list = getPlaylist();
  const ul = document.getElementById('playlist-list');
  ul.innerHTML = '';
  list.forEach((item, idx) => {
    const li = document.createElement('li');
    li.className = 'rc-playlist-item';
    li.innerHTML = `
      <span class="rc-playlist-title">${item.title}</span>
      <span class="rc-playlist-url">${item.url}</span>
      <div class="rc-playlist-actions">
        <button class="rc-btn rc-btn-small" title="再生" onclick="playPlaylistItem(${idx})"><span class="material-icons">play_arrow</span></button>
        <button class="rc-btn rc-btn-small" title="上へ" onclick="movePlaylistItem(${idx}, -1)"><span class="material-icons">arrow_upward</span></button>
        <button class="rc-btn rc-btn-small" title="下へ" onclick="movePlaylistItem(${idx}, 1)"><span class="material-icons">arrow_downward</span></button>
        <button class="rc-btn rc-btn-small" title="削除" onclick="removePlaylistItem(${idx})"><span class="material-icons">delete</span></button>
      </div>
    `;
    ul.appendChild(li);
  });
}

function addPlaylistItem() {
  const title = document.getElementById('playlist-title').value.trim();
  const url = document.getElementById('playlist-url').value.trim();
  if (!title || !url) {
    showNotification('タイトルとURLを入力してください', 'error');
    return;
  }
  const list = getPlaylist();
  list.push({ title, url });
  savePlaylist(list);
  renderPlaylist();
  document.getElementById('playlist-title').value = '';
  document.getElementById('playlist-url').value = '';
}

function removePlaylistItem(idx) {
  const list = getPlaylist();
  list.splice(idx, 1);
  savePlaylist(list);
  renderPlaylist();
}

function movePlaylistItem(idx, dir) {
  const list = getPlaylist();
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= list.length) return;
  const tmp = list[idx];
  list[idx] = list[newIdx];
  list[newIdx] = tmp;
  savePlaylist(list);
  renderPlaylist();
}

function playPlaylistItem(idx) {
  const list = getPlaylist();
  const item = list[idx];
  if (!item) return;
  // 親ウィンドウに再生指示を送信
  if (parentWindow) {
    parentWindow.postMessage({
      type: 'playlist_play',
      data: item
    }, '*');
    showNotification(`「${item.title}」を再生指示しました`, 'success');
  } else {
    showNotification('親ウィンドウが見つかりません', 'error');
  }
}

document.addEventListener('DOMContentLoaded', function() {
  renderPlaylist();
}); 
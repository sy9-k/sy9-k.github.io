const controllerBtn = document.querySelector('.hm-btn-controller');
    if (controllerBtn) {
      controllerBtn.onclick = () => {
        openController();
      };
    }

    
    // 音量設定
    function setVolume(volume) {
      const volumeSlider = document.getElementById('volume-slider');
      if (volumeSlider) {
        volumeSlider.value = volume;
        volumeSlider.dispatchEvent(new Event('input'));
      }
      localStorage.setItem('volumePercent', volume);
    }

    // 明るさ設定
    function setBrightness(brightness) {
      const brightnessSlider = document.getElementById('brightness-slider');
      if (brightnessSlider) {
        brightnessSlider.value = brightness;
        brightnessSlider.dispatchEvent(new Event('input'));
      }
      localStorage.setItem('brightnessPercent', brightness);
    }

    // 言語設定
    function setLanguage(language) {
      localStorage.setItem('language', language);
      location.reload();
    }

    // PAアナウンス制御
    function startAnnouncement(text) {
      console.log('アナウンス開始:', text);
      // 実際の実装では、PAアナウンスシステムを制御
      if (paDialog && paMessage) {
        paMessage.textContent = text;
        paKeyDown = true;
        updatePADialog();
      }
    }

    function stopAnnouncement() {
      console.log('アナウンス停止');
      // 実際の実装では、PAアナウンスシステムを停止
      if (paDialog) {
        paKeyDown = false;
        updatePADialog();
      }
    }


    // 通知管理機能
    function addNotification(title, message) {
      const noticeList = document.getElementById('notice-list');
      if (noticeList) {
        // 既存の空メッセージを削除
        const emptyNote = noticeList.querySelector('.settings-note');
        if (emptyNote && emptyNote.textContent.includes('現在お知らせはありません')) {
          emptyNote.remove();
        }
        
        // 新しい通知を作成
        const notification = document.createElement('div');
        notification.className = 'notification-item';
        notification.style.cssText = `
          background: #f5f5f5;
          border-left: 4px solid #1976d2;
          padding: 12px;
          margin-bottom: 8px;
          border-radius: 4px;
        `;
        
        const titleEl = document.createElement('div');
        titleEl.style.cssText = 'font-weight: bold; color: #1976d2; margin-bottom: 4px;';
        titleEl.textContent = title;
        
        const messageEl = document.createElement('div');
        messageEl.style.cssText = 'color: #333; font-size: 0.9rem;';
        messageEl.textContent = message;
        
        const timeEl = document.createElement('div');
        timeEl.style.cssText = 'color: #666; font-size: 0.8rem; margin-top: 4px;';
        timeEl.textContent = new Date().toLocaleString('ja-JP');
        
        notification.appendChild(titleEl);
        notification.appendChild(messageEl);
        notification.appendChild(timeEl);
        
        noticeList.appendChild(notification);
        
        console.log('通知を追加しました:', title, message);
      }
    }


    document.addEventListener('DOMContentLoaded', function() {
      // 設定パネル
      const settingsBtn = document.querySelector('.hm-btn-settings');
      const settingsPanel = document.getElementById('settings-panel');
      const settingsOverlay = document.getElementById('settings-overlay');
      if (settingsBtn && settingsPanel && settingsOverlay) {
        settingsBtn.onclick = () => {
          settingsPanel.classList.add('open');
          settingsOverlay.classList.add('open');
        };
        settingsOverlay.onclick = () => {
          settingsPanel.classList.remove('open');
          settingsOverlay.classList.remove('open');
        };
        document.addEventListener('keydown', e => {
          if (e.key === 'Escape') {
            settingsPanel.classList.remove('open');
            settingsOverlay.classList.remove('open');
          }
        });
      }
      // お知らせパネル
      const noticeBtn = document.querySelector('.hm-btn-notice');
      const noticePanel = document.getElementById('notice-panel');
      const noticeOverlay = document.getElementById('notice-overlay');
      if (noticeBtn && noticePanel && noticeOverlay) {
        noticeBtn.onclick = () => {
          noticePanel.classList.add('open');
          noticeOverlay.classList.add('open');
        };
        noticeOverlay.onclick = () => {
          noticePanel.classList.remove('open');
          noticeOverlay.classList.remove('open');
        };
        document.addEventListener('keydown', e => {
          if (e.key === 'Escape') {
            noticePanel.classList.remove('open');
            noticeOverlay.classList.remove('open');
          }
        });
      }
    });


    // コントローラーからのメッセージ処理
    function handleControllerMessage(data) {
      switch(data.type) {
        case 'media_control':
          handleMediaControl(data.action);
          break;
        case 'volume_set':
          setVolume(data.volume);
          break;
        case 'brightness_set':
          setBrightness(data.brightness);
          break;
        case 'language_set':
          setLanguage(data.language);
          break;
        case 'announce_start':
          startAnnouncement(data.text);
          break;
        case 'announce_stop':
          stopAnnouncement();
          break;
        case 'emergency_stop':
          emergencyStop();
          break;
        case 'system_restart':
          restartSystem();
          break;
        case 'controller_closed':
          console.log('コントローラーが閉じられました');
          break;
        case 'send_notification':
          addNotification(data.title, data.message);
          break;
        case 'clear_notifications':
          clearAllNotifications();
          break;
      }
    }

        // 緊急制御
    function emergencyStop() {
      console.log('緊急停止実行');
      // 実際の実装では、システム全体を停止
    }

    function restartSystem() {
      console.log('システム再起動');
      // 実際の実装では、システムを再起動
      if (confirm('システムを再起動しますか？')) {
        location.reload();
      }
    }


    function clearAllNotifications() {
      const noticeList = document.getElementById('notice-list');
      if (noticeList) {
        noticeList.innerHTML = '<div class="settings-note">現在お知らせはありません。</div>';
        console.log('全通知を削除しました');
      }
    }


    // コントローラーを開く
    function openController() {
      const controllerWindow = window.open('/remote-control/index.html', 'controller', 
        'width=800,height=600,resizable=yes,scrollbars=yes,status=yes');
      
      if (controllerWindow) {
        // コントローラーウィンドウとの通信設定
        window.addEventListener('message', function(event) {
          handleControllerMessage(event.data);
        });
      }
    }

    // メディア制御処理
    function handleMediaControl(action) {
      console.log('メディア制御:', action);
      
      // 現在再生中のコンテンツがある場合は制御
      const videoPlayer = document.querySelector('video');
      const audioPlayer = document.querySelector('audio');
      
      switch(action) {
        case 'play':
          if (videoPlayer) {
            videoPlayer.play();
          } else if (audioPlayer) {
            audioPlayer.play();
          }
          break;
        case 'pause':
          if (videoPlayer) {
            videoPlayer.pause();
          } else if (audioPlayer) {
            audioPlayer.pause();
          }
          break;
        case 'stop':
          if (videoPlayer) {
            videoPlayer.pause();
            videoPlayer.currentTime = 0;
          } else if (audioPlayer) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
          }
          break;
        case 'next':
          // 次のコンテンツに移動
          console.log('次のコンテンツに移動');
          break;
        case 'prev':
          // 前のコンテンツに移動
          console.log('前のコンテンツに移動');
          break;
        case 'volume_up':
          const currentVolume = localStorage.getItem('volumePercent') || 60;
          const newVolumeUp = Math.min(100, parseInt(currentVolume) + 10);
          setVolume(newVolumeUp);
          break;
        case 'volume_down':
          const currentVol = localStorage.getItem('volumePercent') || 60;
          const newVolumeDown = Math.max(0, parseInt(currentVol) - 10);
          setVolume(newVolumeDown);
          break;
      }
    }

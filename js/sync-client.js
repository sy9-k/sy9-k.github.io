import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyBjf9oJZ0d-YHwJe1fq9RhcPP_HgdINdzA",
  authDomain: "fpms-902b6.firebaseapp.com",
  databaseURL: "https://fpms-902b6-default-rtdb.firebaseio.com",
  projectId: "fpms-902b6",
  appId: "1:203930990498:web:0835e33509f3e594b924fb"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const dbRef = ref(db, 'system_control');

let lastActionTime = parseInt(localStorage.getItem('last_sync_time') || "0");

export async function setupSync() {
  async function poll() {
    try {
      const snapshot = await get(dbRef);
      if (!snapshot.exists()) return;
      const data = snapshot.val();

      // 1. 強制リロード
      if (data.reloadSignal && data.reloadSignal > lastActionTime) {
        localStorage.setItem('last_sync_time', data.reloadSignal);
        window.location.reload();
        return;
      }

      // 2. 一度きりの実行命令 (lastUpdateが更新された時)
      if (data.lastUpdate && data.lastUpdate > lastActionTime) {
        lastActionTime = data.lastUpdate;
        localStorage.setItem('last_sync_time', lastActionTime);

        // --- 明るさの同期 ---
        if (data.brightness !== undefined) {
          localStorage.setItem('brightnessPercent', data.brightness);
          document.body.style.filter = `brightness(${data.brightness}%)`;
          const bSlider = document.getElementById('brightness-slider');
          if (bSlider) bSlider.value = data.brightness;
        }

        // --- 座席・ルートの同期 ---
        if (data.seatNumber) {
          localStorage.setItem('seatNumber', data.seatNumber);
          const el = document.getElementById('hm-seat');
          if (el) el.textContent = data.seatNumber;
        }
        if (data.departureID || data.arrivalID) {
          if (data.departureID) localStorage.setItem('departureID', data.departureID);
          if (data.arrivalID) localStorage.setItem('arrivalID', data.arrivalID);
          const dep = localStorage.getItem('departureID') || '---';
          const arr = localStorage.getItem('arrivalID') || '---';
          const el = document.getElementById('hm-route');
          if (el) el.textContent = `${dep} – ${arr}`;
        }

        // --- ページ遷移 ---
        const pages = { home:'home.html', entertainment:'entertainment.html', meal:'meal.html', map:'map.html', wifi:'wifi.html', game:'game.html' };
        const currentFile = window.location.pathname.split('/').pop() || 'index.html';
        const targetPage = pages[data.currentPage];
        if (targetPage && !currentFile.includes(targetPage)) {
          window.location.href = targetPage;
          return;
        }

        // --- 音量反映 ---
        if (data.volume !== undefined) {
          document.querySelectorAll('video, audio').forEach(v => v.volume = data.volume / 100);
        }
      }

      // 3. リアルタイム・アナウンス
      const overlay = document.getElementById('announcement-overlay');
      if (data.announcement && overlay) {
        overlay.style.display = data.announcement.active ? 'flex' : 'none';
        const msg = document.getElementById('msg-text');
        if (msg) msg.innerText = data.announcement.text;
      }

    } catch (err) {
      console.error("Sync Error:", err);
    }
  }

  setInterval(poll, 1500);
  poll();
}
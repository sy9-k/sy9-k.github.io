import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const fpms_firebaseConfig = {
  apiKey: "AIzaSyBjf9oJZ0d-YHwJe1fq9RhcPP_HgdINdzA",
  authDomain: "fpms-902b6.firebaseapp.com",
  databaseURL: "https://fpms-902b6-default-rtdb.firebaseio.com",
  projectId: "fpms-902b6",
  appId: "1:203930990498:web:0835e33509f3e594b924fb"
};

const fpms_app = initializeApp(fpms_firebaseConfig);
const fpms_db = getDatabase(fpms_app);
const fpms_dbRef = ref(fpms_db, 'system_control');

// 前回の「Firebaseのデータ」をメモリに保持（変更検知用）
let fpms_prevDataCache = {
  currentPage: localStorage.getItem('fpms_remote_page_val') || "",
  reloadSignal: parseInt(localStorage.getItem('fpms_last_reload_sig') || "0")
};

function fpms_restoreState() {
  const pVal = localStorage.getItem('progressPercent');
  if (pVal !== null) {
    const bar = document.getElementById('hm-progress-bar') || document.querySelector('.hm-progress-bar');
    if (bar) {
      const n = Number(pVal);
      bar.style.width = (n <= 2) ? '8px' : (n >= 98) ? 'calc(100% - 8px)' : `calc(${n}% - 16px)`;
    }
  }
  const bVal = localStorage.getItem('brightnessPercent');
  if (bVal !== null) document.body.style.filter = `brightness(${bVal}%)`;
  const s = localStorage.getItem('seatNumber');
  if (s) { const el = document.getElementById('hm-seat'); if (el) el.textContent = s; }
  const d = localStorage.getItem('departureID');
  const a = localStorage.getItem('arrivalID');
  if (d || a) {
    const el = document.getElementById('hm-route');
    if (el) el.textContent = `${d || '---'} – ${a || '---'}`;
  }
}

export async function setupSync() {
  fpms_restoreState();

  async function fpms_poll() {
    try {
      const snapshot = await get(fpms_dbRef);
      if (!snapshot.exists()) return;
      const data = snapshot.val();

      // --- 1. 強制リロード判定 (reloadSignalが変わった瞬間) ---
      if (data.reloadSignal && data.reloadSignal > fpms_prevDataCache.reloadSignal) {
        localStorage.setItem('fpms_last_reload_sig', data.reloadSignal);
        window.location.reload();
        return;
      }

      // --- 2. ページ移動判定 (Firebase上の currentPage 文字列が変わった瞬間) ---
      if (data.currentPage && data.currentPage !== fpms_prevDataCache.currentPage) {
        const pages = { home:'home.html', entertainment:'entertainment.html', meal:'meal.html', map:'map.html', wifi:'wifi.html', game:'game.html' };
        const target = pages[data.currentPage];
        if (target) {
          localStorage.setItem('fpms_remote_page_val', data.currentPage);
          window.location.href = target;
          return; 
        }
      }

      // --- 3. その他の値の強制同期 (LocalStorage上書き & 画面更新) ---
      
      // 明るさ
      if (data.brightness !== undefined) {
        localStorage.setItem('brightnessPercent', data.brightness);
        document.body.style.filter = `brightness(${data.brightness}%)`;
        const slider = document.getElementById('brightness-slider');
        if (slider) slider.value = data.brightness;
      }

      // 座席・ルート
      if (data.seatNumber) {
        localStorage.setItem('seatNumber', data.seatNumber);
        const el = document.getElementById('hm-seat'); if (el) el.textContent = data.seatNumber;
      }
      if (data.departureID) localStorage.setItem('departureID', data.departureID);
      if (data.arrivalID) localStorage.setItem('arrivalID', data.arrivalID);
      const routeEl = document.getElementById('hm-route');
      if (routeEl) {
        routeEl.textContent = `${localStorage.getItem('departureID') || '---'} – ${localStorage.getItem('arrivalID') || '---'}`;
      }

      // 進捗バー
      if (data.progressPercent !== undefined) {
        localStorage.setItem('progressPercent', data.progressPercent);
        const bar = document.getElementById('hm-progress-bar') || document.querySelector('.hm-progress-bar');
        if (bar) {
          const p = Number(data.progressPercent);
          bar.style.width = (p <= 2) ? '8px' : (p >= 98) ? 'calc(100% - 8px)' : `calc(${p}% - 16px)`;
        }
      }

      // アナウンス
      const overlay = document.getElementById('announcement-overlay');
      if (data.announcement && overlay) {
        overlay.style.display = data.announcement.active ? 'flex' : 'none';
        const msg = document.getElementById('msg-text');
        if (msg) msg.innerText = data.announcement.text;
      }

      // 判定用のキャッシュを更新
      fpms_prevDataCache.currentPage = data.currentPage || "";
      fpms_prevDataCache.reloadSignal = data.reloadSignal || 0;

    } catch (err) {
      console.error("[FPMS] Sync Error:", err);
    }
  }

  setInterval(fpms_poll, 1500);
  fpms_poll();
}

let fpms_keyCount = 0;

document.addEventListener('keydown', (e) => {
  const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  if (keys.includes(e.key)) {
    fpms_keyCount++;
    if (fpms_keyCount >= 10) {
      window.location.href = './remote-control/';
    }
  }
});
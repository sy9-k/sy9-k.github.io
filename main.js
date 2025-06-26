// ===========================
// SPA画面遷移制御
// ===========================
function showScreen(screenId) {
    [
        'airline-selection-screen',
        'ana-identification-screen',
        'booking-reference-input-screen',
        'mileage-member-input-screen',
        'e-ticket-input-screen',
        'help-screen',
        'loading-screen'
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const showEl = document.getElementById(screenId);
    if (showEl) showEl.classList.remove('hidden');
}

// ===========================
// 言語選択ダイアログ機能
// ===========================
const languageDialogOverlay = document.getElementById('language-dialog-overlay');
const languageOptions = document.querySelectorAll('.language-option');
const closeLanguageDialogBtn = document.getElementById('close-language-dialog');
const languageSelectButton = document.getElementById('language-select-button');
let currentLanguage = 'ja'; // デフォルトは日本語

function openLanguageDialog() {
    languageDialogOverlay.classList.remove('hidden');
    setTimeout(() => languageDialogOverlay.classList.add('show'), 10);
}
function closeLanguageDialog() {
    languageDialogOverlay.classList.remove('show');
    setTimeout(() => languageDialogOverlay.classList.add('hidden'), 300);
}
if (languageSelectButton) {
    languageSelectButton.addEventListener('click', openLanguageDialog);
}
if (closeLanguageDialogBtn) {
    closeLanguageDialogBtn.addEventListener('click', closeLanguageDialog);
}
languageOptions.forEach(option => {
    option.addEventListener('click', function() {
        languageOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        const lang = option.getAttribute('data-lang');
        setLanguage(lang);
        closeLanguageDialog();
    });
});

// ===========================
// 多言語置換関数（各画面用）
// ===========================
function setLanguage(lang) {
    currentLanguage = lang;
    const allEls = document.querySelectorAll('[data-ja], [data-en], [data-ko], [data-zh]');
    allEls.forEach(el => {
        if (el.dataset[lang]) {
            el.textContent = el.dataset[lang];
        }
    });
    document.querySelectorAll('.input-display-placeholder').forEach(span => {
        if (span.dataset[lang]) span.textContent = span.dataset[lang];
    });
    languageOptions.forEach(opt => {
        opt.classList.toggle('selected', opt.getAttribute('data-lang') === lang);
    });
    // Eチケットタブラベル
    setETicketTabLabels(lang);
}
setLanguage(currentLanguage);

// ===========================
// カスタムアラート・確認ダイアログ
// ===========================
function ensureCustomAlertDialog() {
    if (!document.getElementById('custom-alert-dialog-overlay')) {
        const dialogHtml = `
        <div id="custom-alert-dialog-overlay" class="md3-dialog-overlay hidden" tabindex="-1">
            <div class="md3-dialog">
                <h3 class="md3-dialog-title" id="custom-alert-title"></h3>
                <div class="md3-dialog-content" id="custom-alert-message"></div>
                <div class="md3-dialog-actions">
                    <button id="custom-alert-ok-btn" class="md3-button md3-text-button" autofocus>OK</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', dialogHtml);
    }
}
function customAlert(message, title = 'お知らせ', okLabel) {
    ensureCustomAlertDialog();
    const overlay = document.getElementById('custom-alert-dialog-overlay');
    const msgEl = document.getElementById('custom-alert-message');
    const titleEl = document.getElementById('custom-alert-title');
    const okBtn = document.getElementById('custom-alert-ok-btn');
    msgEl.textContent = message;
    titleEl.textContent = title;
    okBtn.textContent = okLabel || (currentLanguage === 'ja' ? 'OK' : currentLanguage === 'en' ? 'OK' : currentLanguage === 'ko' ? '확인' : '确认');
    overlay.classList.remove('hidden');
    setTimeout(() => overlay.classList.add('show'), 10);

    function closeHandler() {
        overlay.classList.remove('show');
        setTimeout(() => overlay.classList.add('hidden'), 300);
        okBtn.removeEventListener('click', closeHandler);
        overlay.removeEventListener('click', overlayHandler);
        document.removeEventListener('keydown', escHandler);
    }
    function overlayHandler(e) {
        if (e.target === overlay) closeHandler();
    }
    function escHandler(e) {
        if (e.key === 'Escape') closeHandler();
    }
    okBtn.addEventListener('click', closeHandler);
    overlay.addEventListener('click', overlayHandler);
    document.addEventListener('keydown', escHandler);
}
function ensureCustomConfirmDialog() {
    if (!document.getElementById('custom-confirm-dialog-overlay')) {
        const dialogHtml = `
        <div id="custom-confirm-dialog-overlay" class="md3-dialog-overlay hidden" tabindex="-1">
            <div class="md3-dialog">
                <h3 class="md3-dialog-title" id="custom-confirm-title"></h3>
                <div class="md3-dialog-content" id="custom-confirm-message"></div>
                <div class="md3-dialog-actions">
                    <button id="custom-confirm-cancel-btn" class="md3-button md3-text-button">キャンセル</button>
                    <button id="custom-confirm-ok-btn" class="md3-button md3-text-button" autofocus>OK</button>
                </div>
            </div>
        </div>`;
        document.body.insertAdjacentHTML('beforeend', dialogHtml);
    }
}
function customConfirm(message, title = '確認', okLabel, cancelLabel) {
    ensureCustomConfirmDialog();
    return new Promise((resolve) => {
        const overlay = document.getElementById('custom-confirm-dialog-overlay');
        const msgEl = document.getElementById('custom-confirm-message');
        const titleEl = document.getElementById('custom-confirm-title');
        const okBtn = document.getElementById('custom-confirm-ok-btn');
        const cancelBtn = document.getElementById('custom-confirm-cancel-btn');
        msgEl.textContent = message;
        titleEl.textContent = title;
        okBtn.textContent = okLabel || (currentLanguage === 'ja' ? 'OK' : currentLanguage === 'en' ? 'OK' : currentLanguage === 'ko' ? '확인' : '确认');
        cancelBtn.textContent = cancelLabel || (currentLanguage === 'ja' ? 'キャンセル' : currentLanguage === 'en' ? 'Cancel' : currentLanguage === 'ko' ? '취소' : '取消');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('show'), 10);

        function onOk() {
            cleanup();
            resolve(true);
        }
        function onCancel() {
            cleanup();
            resolve(false);
        }
        function overlayHandler(e) {
            if (e.target === overlay) onCancel();
        }
        function escHandler(e) {
            if (e.key === 'Escape') onCancel();
        }
        function cleanup() {
            overlay.classList.remove('show');
            setTimeout(() => overlay.classList.add('hidden'), 300);
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            overlay.removeEventListener('click', overlayHandler);
            document.removeEventListener('keydown', escHandler);
        }
        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        overlay.addEventListener('click', overlayHandler);
        document.addEventListener('keydown', escHandler);
    });
}

// ===========================
// 航空会社カード→チェックイン方法画面
// ===========================
document.querySelectorAll('.md3-card[data-airline]').forEach(card => {
    card.addEventListener('click', function() {
        const logo = card.querySelector('img').src;
        document.getElementById('ana-selected-airline-logo').src = logo;
        document.getElementById('booking-selected-airline-logo').src = logo;
        document.getElementById('mileage-selected-airline-logo').src = logo;
        document.getElementById('e-ticket-selected-airline-logo').src = logo;
        showScreen('ana-identification-screen');
    });
});

// ===========================
// チェックイン方法カード→各入力画面
// ===========================
document.querySelectorAll('#ana-identification-screen .md3-card').forEach(card => {
    card.addEventListener('click', function() {
        const method = card.getAttribute('data-method');
        if (method === "booking-reference") {
            showScreen('booking-reference-input-screen');
        } else if (method === "mileage-member") {
            showScreen('mileage-member-input-screen');
        } else if (method === "e-ticket-number") {
            showScreen('e-ticket-input-screen');
        } else if (method === "passport") {
            customAlert(
                currentLanguage === 'ja' ? "パスポートによるチェックインは現在対応していません。" :
                currentLanguage === 'en' ? "Check-in with passport is not currently supported." :
                currentLanguage === 'ko' ? "여권 체크인은 현재 지원되지 않습니다." :
                "护照办理登机手续目前尚未支持。",
                currentLanguage === 'ja' ? "お知らせ" :
                currentLanguage === 'en' ? "Notice" :
                currentLanguage === 'ko' ? "알림" :
                "通知"
            );
        }
    });
});

// ===========================
// 各画面の「戻る」「キャンセル」「ヘルプ」ボタン
// ===========================
document.getElementById('id-back-button')?.addEventListener('click', () => {
    showScreen('airline-selection-screen');
});
document.getElementById('booking-back-button')?.addEventListener('click', () => {
    showScreen('ana-identification-screen');
});
document.getElementById('booking-help-button')?.addEventListener('click', () => {
    showScreen('help-screen');
});
document.getElementById('cancel-button')?.addEventListener('click', () => {
    showScreen('airline-selection-screen');
});
document.getElementById('mileage-back-button')?.addEventListener('click', () => {
    showScreen('ana-identification-screen');
});
document.getElementById('mileage-help-button')?.addEventListener('click', () => {
    showScreen('help-screen');
});
document.getElementById('mileage-cancel-button')?.addEventListener('click', () => {
    showScreen('airline-selection-screen');
});
document.getElementById('e-ticket-back-button')?.addEventListener('click', () => {
    showScreen('ana-identification-screen');
});
document.getElementById('e-ticket-help-button')?.addEventListener('click', () => {
    showScreen('help-screen');
});
document.getElementById('e-ticket-cancel-button')?.addEventListener('click', () => {
    showScreen('airline-selection-screen');
});
document.getElementById('main-help-button')?.addEventListener('click', () => {
    showScreen('help-screen');
});
document.getElementById('id-help-button')?.addEventListener('click', () => {
    showScreen('help-screen');
});
document.getElementById('help-back-button')?.addEventListener('click', () => {
    showScreen('airline-selection-screen');
});
document.getElementById('help-back-to-home-button')?.addEventListener('click', () => {
    showScreen('airline-selection-screen');
});

// ===========================
// 予約番号入力画面
// ===========================
let bookingInput = "";
const bookingInputLength = 6;
const bookingElements = {
    inputText: document.getElementById('input-text'),
    numberButtons: document.querySelectorAll('#booking-reference-input-screen .number-button[data-number]'),
    backspaceButton: document.getElementById('backspace-button'),
    clearAllButton: document.getElementById('clear-all-button'),
    cancelButton: document.getElementById('cancel-button'),
    confirmButton: document.getElementById('confirm-button')
};
function updateBookingInputDisplay() {
    if (!bookingElements.inputText) return;
    if (bookingInput.length === 0) {
        bookingElements.inputText.textContent = bookingElements.inputText?.dataset?.ja || "______";
        bookingElements.inputText.classList.add('input-display-placeholder');
    } else {
        bookingElements.inputText.textContent = bookingInput.padEnd(bookingInputLength, '_');
        bookingElements.inputText.classList.remove('input-display-placeholder');
    }
    if (bookingElements.confirmButton)
        bookingElements.confirmButton.disabled = bookingInput.length !== bookingInputLength;
}
if (bookingElements.numberButtons.length) {
    bookingElements.numberButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (bookingInput.length < bookingInputLength) {
                bookingInput += button.dataset.number;
                updateBookingInputDisplay();
            }
        });
    });
}
if (bookingElements.backspaceButton) bookingElements.backspaceButton.addEventListener('click', () => {
    bookingInput = bookingInput.slice(0, -1);
    updateBookingInputDisplay();
});
if (bookingElements.clearAllButton) bookingElements.clearAllButton.addEventListener('click', () => {
    bookingInput = "";
    updateBookingInputDisplay();
});
if (bookingElements.confirmButton) bookingElements.confirmButton.addEventListener('click', () => {
    if (bookingInput.length === bookingInputLength) {
        customAlert(
            currentLanguage === 'ja' ? `予約番号が確認されました: ${bookingInput}` :
            currentLanguage === 'en' ? `Booking Reference Confirmed: ${bookingInput}` :
            currentLanguage === 'ko' ? `예약 번호 확인됨: ${bookingInput}` :
            `预订编号已确认: ${bookingInput}`,
            currentLanguage === 'ja' ? "確認" :
            currentLanguage === 'en' ? "Confirmed" :
            currentLanguage === 'ko' ? "확인" :
            "确认"
        );
        showScreen('airline-selection-screen');
        bookingInput = "";
        updateBookingInputDisplay();
    }
});
updateBookingInputDisplay();

// ===========================
// マイレージ会員番号入力画面
// ===========================
let mileageInput = "";
const mileageInputLength = 10;
const mileageElements = {
    inputText: document.getElementById('mileage-input-text'),
    numberButtons: document.querySelectorAll('#mileage-member-input-screen .number-button[data-number]'),
    backspaceButton: document.getElementById('mileage-backspace-button'),
    clearAllButton: document.getElementById('mileage-clear-all-button'),
    cancelButton: document.getElementById('mileage-cancel-button'),
    confirmButton: document.getElementById('mileage-confirm-button')
};
function updateMileageInputDisplay() {
    if (!mileageElements.inputText) return;
    if (mileageInput.length === 0) {
        mileageElements.inputText.textContent = mileageElements.inputText?.dataset?.ja || "__________";
        mileageElements.inputText.classList.add('input-display-placeholder');
    } else {
        mileageElements.inputText.textContent = mileageInput.padEnd(mileageInputLength, '_');
        mileageElements.inputText.classList.remove('input-display-placeholder');
    }
    if (mileageElements.confirmButton)
        mileageElements.confirmButton.disabled = mileageInput.length !== mileageInputLength;
}
if (mileageElements.numberButtons.length) {
    mileageElements.numberButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (mileageInput.length < mileageInputLength) {
                mileageInput += button.dataset.number;
                updateMileageInputDisplay();
            }
        });
    });
}
if (mileageElements.backspaceButton) mileageElements.backspaceButton.addEventListener('click', () => {
    mileageInput = mileageInput.slice(0, -1);
    updateMileageInputDisplay();
});
if (mileageElements.clearAllButton) mileageElements.clearAllButton.addEventListener('click', () => {
    mileageInput = "";
    updateMileageInputDisplay();
});
if (mileageElements.confirmButton) mileageElements.confirmButton.addEventListener('click', () => {
    if (mileageInput.length === mileageInputLength) {
        customAlert(
            currentLanguage === 'ja' ? `マイレージ会員番号が確認されました: ${mileageInput}` :
            currentLanguage === 'en' ? `Mileage Member No. Confirmed: ${mileageInput}` :
            currentLanguage === 'ko' ? `마일리지 번호 확인됨: ${mileageInput}` :
            `里程会员号已确认: ${mileageInput}`,
            currentLanguage === 'ja' ? "確認" :
            currentLanguage === 'en' ? "Confirmed" :
            currentLanguage === 'ko' ? "확인" :
            "确认"
        );
        showScreen('airline-selection-screen');
        mileageInput = "";
        updateMileageInputDisplay();
    }
});
updateMileageInputDisplay();

// ===========================
// Eチケット番号入力画面（多言語・英数字キーボード対応）
// ===========================
let eTicketInput = "";
const eTicketInputLength = 13;
const eTicketElements = {
    inputText: document.getElementById('e-ticket-input-text'),
    numberButtons: document.querySelectorAll('#e-ticket-number-pad .number-button[data-number]'),
    backspaceButton: document.getElementById('e-ticket-backspace-button'),
    clearAllButton: document.getElementById('e-ticket-clear-all-button'),
    alphaPad: document.getElementById('e-ticket-alpha-pad'),
    alphaButtons: document.querySelectorAll('#e-ticket-alpha-pad .alpha-button'),
    alphaBackspaceButton: document.getElementById('e-ticket-alpha-backspace-button'),
    alphaClearAllButton: document.getElementById('e-ticket-alpha-clear-all-button'),
    tabNumeric: document.getElementById('e-ticket-tab-numeric'),
    tabAlpha: document.getElementById('e-ticket-tab-alpha'),
    numberPad: document.getElementById('e-ticket-number-pad'),
    cancelButton: document.getElementById('e-ticket-cancel-button'),
    confirmButton: document.getElementById('e-ticket-confirm-button'),
    backButton: document.getElementById('e-ticket-back-button'),
    helpButton: document.getElementById('e-ticket-help-button'),
    airlineLogo: document.getElementById('e-ticket-selected-airline-logo'),
};

function updateETicketInputDisplay() {
    if (!eTicketElements.inputText) return;
    if (eTicketInput.length === 0) {
        eTicketElements.inputText.textContent = eTicketElements.inputText?.dataset?.ja || "_____________";
        eTicketElements.inputText.classList.add('input-display-placeholder');
    } else {
        eTicketElements.inputText.textContent = eTicketInput.padEnd(eTicketInputLength, '_');
        eTicketElements.inputText.classList.remove('input-display-placeholder');
    }
    if (eTicketElements.confirmButton)
        eTicketElements.confirmButton.disabled = eTicketInput.length !== eTicketInputLength;
}
// 数字パッド
if (eTicketElements.numberButtons.length) {
    eTicketElements.numberButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (eTicketInput.length < eTicketInputLength) {
                eTicketInput += button.dataset.number;
                updateETicketInputDisplay();
            }
        });
    });
}
if (eTicketElements.backspaceButton)
    eTicketElements.backspaceButton.addEventListener('click', () => {
        eTicketInput = eTicketInput.slice(0, -1);
        updateETicketInputDisplay();
    });
if (eTicketElements.clearAllButton)
    eTicketElements.clearAllButton.addEventListener('click', () => {
        eTicketInput = "";
        updateETicketInputDisplay();
    });
// アルファベットパッド
if (eTicketElements.alphaButtons.length) {
    eTicketElements.alphaButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (eTicketInput.length < eTicketInputLength) {
                eTicketInput += button.dataset.alpha;
                updateETicketInputDisplay();
            }
        });
    });
}
if (eTicketElements.alphaBackspaceButton)
    eTicketElements.alphaBackspaceButton.addEventListener('click', () => {
        eTicketInput = eTicketInput.slice(0, -1);
        updateETicketInputDisplay();
    });
if (eTicketElements.alphaClearAllButton)
    eTicketElements.alphaClearAllButton.addEventListener('click', () => {
        eTicketInput = "";
        updateETicketInputDisplay();
    });
// タブ切替
function setETicketPad(tab) {
    if (tab === "numeric") {
        eTicketElements.tabNumeric.classList.add('active');
        eTicketElements.tabAlpha.classList.remove('active');
        eTicketElements.numberPad.classList.remove('hidden');
        eTicketElements.alphaPad.classList.add('hidden');
    } else {
        eTicketElements.tabNumeric.classList.remove('active');
        eTicketElements.tabAlpha.classList.add('active');
        eTicketElements.numberPad.classList.add('hidden');
        eTicketElements.alphaPad.classList.remove('hidden');
    }
}
eTicketElements.tabNumeric?.addEventListener('click', () => setETicketPad('numeric'));
eTicketElements.tabAlpha?.addEventListener('click', () => setETicketPad('alpha'));
// タブラベル言語対応
function setETicketTabLabels(lang) {
    if (eTicketElements.tabNumeric && eTicketElements.tabNumeric.dataset[lang]) {
        eTicketElements.tabNumeric.textContent = eTicketElements.tabNumeric.dataset[lang];
    } else if (eTicketElements.tabNumeric) {
        eTicketElements.tabNumeric.textContent = "123";
    }
    if (eTicketElements.tabAlpha && eTicketElements.tabAlpha.dataset[lang]) {
        eTicketElements.tabAlpha.textContent = eTicketElements.tabAlpha.dataset[lang];
    } else if (eTicketElements.tabAlpha) {
        eTicketElements.tabAlpha.textContent = "ABC";
    }
}
// アクションボタン
if (eTicketElements.cancelButton)
    eTicketElements.cancelButton.addEventListener('click', () => {
        eTicketInput = "";
        updateETicketInputDisplay();
        setETicketPad('numeric');
        showScreen('airline-selection-screen');
    });
if (eTicketElements.backButton)
    eTicketElements.backButton.addEventListener('click', () => {
        setETicketPad('numeric');
        showScreen('ana-identification-screen');
    });
if (eTicketElements.confirmButton)
    eTicketElements.confirmButton.addEventListener('click', () => {
        if (eTicketInput.length === eTicketInputLength) {
            customAlert(
                currentLanguage === 'ja' ? `Eチケット番号が確認されました: ${eTicketInput}` :
                currentLanguage === 'en' ? `E-Ticket No. Confirmed: ${eTicketInput}` :
                currentLanguage === 'ko' ? `E-티켓 번호 확인됨: ${eTicketInput}` :
                `电子机票号已确认: ${eTicketInput}`,
                currentLanguage === 'ja' ? "確認" :
                currentLanguage === 'en' ? "Confirmed" :
                currentLanguage === 'ko' ? "확인" :
                "确认"
            );
            showScreen('airline-selection-screen');
            eTicketInput = "";
            updateETicketInputDisplay();
            setETicketPad('numeric');
        }
    });
if (eTicketElements.helpButton)
    eTicketElements.helpButton.addEventListener('click', () => {
        showScreen('help-screen');
    });

updateETicketInputDisplay();
setETicketPad('numeric');

// ===========================
// 初期画面言語設定
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLanguage);
});
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
        'loading-screen',
        'dangerous-goods-screen',
        'staff-assistance-screen',
        'boarding-pass-screen',
        'staff-menu-screen',
        'flight-list-screen' // 【追加】フライトリスト画面
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
    const showEl = document.getElementById(screenId);
    if (showEl) showEl.classList.remove('hidden');

    // フライトリスト画面が表示される際にデータをレンダリング
    if (screenId === 'flight-list-screen') {
        renderFlightList();
    }
}

// ===========================
// 言語選択ダイアログ機能
// ===========================
const languageDialogOverlay = document.getElementById('language-dialog-overlay');
const languageOptions = document.querySelectorAll('.language-option');
const closeLanguageDialogBtn = document.getElementById('close-language-dialog');
const languageSelectButton = document.getElementById('language-select-button');
let currentLanguage = 'ja';

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
function setLanguage(lang) {
    currentLanguage = lang;
    document.querySelectorAll('[data-ja], [data-en], [data-ko], [data-zh]').forEach(el => {
        if (el.dataset[lang]) {
            el.textContent = el.dataset[lang];
        }
    });
    languageOptions.forEach(option => {
        if (option.dataset.lang === lang) {
            option.classList.add('selected');
        } else {
            option.classList.remove('selected');
        }
    });
    setETicketTabLabels(lang);
}

// 【変更】言語選択オプションにクリックイベントを追加
languageOptions.forEach(option => {
    option.addEventListener('click', function() {
        setLanguage(this.dataset.lang);
        closeLanguageDialog();
    });
});

// ===========================
// 航空会社選択機能
// ===========================
let selectedAirlineLogoUrl = ''; // 選択された航空会社のロゴURLを保持
document.querySelectorAll('.md3-card.md3-elevated-card').forEach(card => {
    card.addEventListener('click', function() {
        const selectedAirline = this.dataset.airline;
        const airlineLogo = this.querySelector('img').src;
        selectedAirlineLogoUrl = airlineLogo; // ロゴURLを保存
        const mileageCard = document.querySelector('#ana-identification-screen .md3-card[data-method="mileage-member"]');

        if (selectedAirline === 'ana') {
            showScreen('loading-screen');
            setTimeout(() => {
                window.location.href = 'ana_check_in.html';
            }, 1500);
            if (mileageCard) {
                mileageCard.classList.remove('hidden');
            }
        } else {
            document.getElementById('ana-selected-airline-logo').src = airlineLogo;
            document.getElementById('booking-selected-airline-logo').src = airlineLogo;
            document.getElementById('mileage-selected-airline-logo').src = airlineLogo;
            document.getElementById('e-ticket-selected-airline-logo').src = airlineLogo;
            document.getElementById('dangerous-goods-selected-airline-logo').src = airlineLogo;
            document.getElementById('boarding-pass-selected-airline-logo').src = airlineLogo;
            document.getElementById('flight-list-selected-airline-logo').src = airlineLogo; // 【追加】フライトリスト画面にもロゴをセット

            if (selectedAirline === 'airbusan' || selectedAirline === 'airjapan') {
                if (mileageCard) {
                    mileageCard.classList.add('hidden');
                }
            } else {
                if (mileageCard) {
                    mileageCard.classList.remove('hidden');
                }
            }
            showScreen('ana-identification-screen');
        }
    });
});

// ===========================
// 各画面の機能 (ヘルプ、識別、入力)
// ===========================
const mainHelpButton = document.getElementById('main-help-button');
const idHelpButton = document.getElementById('id-help-button');
const bookingHelpButton = document.getElementById('booking-help-button');
const mileageHelpButton = document.getElementById('mileage-help-button');
const eTicketHelpButton = document.getElementById('e-ticket-help-button');
const helpBackButton = document.getElementById('help-back-button');
const helpBackToHomeButton = document.getElementById('help-back-to-home-button');
if (mainHelpButton) mainHelpButton.addEventListener('click', () => showScreen('help-screen'));
if (idHelpButton) idHelpButton.addEventListener('click', () => showScreen('help-screen'));
if (bookingHelpButton) bookingHelpButton.addEventListener('click', () => showScreen('help-screen'));
if (mileageHelpButton) mileageHelpButton.addEventListener('click', () => showScreen('help-screen'));
if (eTicketHelpButton) eTicketHelpButton.addEventListener('click', () => showScreen('help-screen'));
if (helpBackButton) helpBackButton.addEventListener('click', () => history.back());
if (helpBackToHomeButton) helpBackToHomeButton.addEventListener('click', () => showScreen('airline-selection-screen'));
document.querySelectorAll('#ana-identification-screen .md3-card').forEach(card => {
    card.addEventListener('click', function() {
        const method = this.dataset.method;
        if (method === 'booking-reference') {
            showScreen('booking-reference-input-screen');
        } else if (method === 'mileage-member') {
            showScreen('mileage-member-input-screen');
        } else if (method === 'e-ticket-number') {
            showScreen('e-ticket-input-screen');
        } else {
            customAlert(
                currentLanguage === 'ja' ? "この機能は現在開発中です。" : "This feature is currently under development.",
                currentLanguage === 'ja' ? "お知らせ" : "Notice"
            );
        }
    });
});
const idBackButton = document.getElementById('id-back-button');
if (idBackButton) idBackButton.addEventListener('click', () => showScreen('airline-selection-screen'));
const bookingElements = {
    inputText: document.getElementById('input-text'),
    backButton: document.getElementById('booking-back-button'),
    confirmButton: document.getElementById('confirm-button'),
    clearAllButton: document.getElementById('clear-all-button'),
    backspaceButton: document.getElementById('backspace-button'),
    numberButtons: document.querySelectorAll('#booking-reference-input-screen .number-button:not(.special)')
};
let bookingInput = "";
const bookingInputLength = 6;
function updateBookingInputDisplay() {
    if (bookingElements.inputText) {
        bookingElements.inputText.textContent = bookingInput.padEnd(bookingInputLength, '_');
    }
    if (bookingElements.confirmButton) {
        bookingElements.confirmButton.disabled = bookingInput.length !== bookingInputLength;
    }
}
if (bookingElements.numberButtons) {
    bookingElements.numberButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (bookingInput.length < bookingInputLength) {
                bookingInput += this.dataset.number;
                updateBookingInputDisplay();
            }
        });
    });
}
if (bookingElements.backspaceButton) {
    bookingElements.backspaceButton.addEventListener('click', () => {
        bookingInput = bookingInput.slice(0, -1);
        updateBookingInputDisplay();
    });
}
if (bookingElements.clearAllButton) {
    bookingElements.clearAllButton.addEventListener('click', () => {
        bookingInput = "";
        updateBookingInputDisplay();
    });
}
if (bookingElements.backButton) {
    bookingElements.backButton.addEventListener('click', () => {
        bookingInput = "";
        updateBookingInputDisplay();
        showScreen('ana-identification-screen');
    });
}
if (bookingElements.confirmButton) {
    bookingElements.confirmButton.addEventListener('click', () => {
        if (bookingInput.length === bookingInputLength) {
            showScreen('dangerous-goods-screen');
            bookingInput = "";
            updateBookingInputDisplay();
        }
    });
}

const mileageElements = {
    inputText: document.getElementById('mileage-input-text'),
    backButton: document.getElementById('mileage-back-button'),
    confirmButton: document.getElementById('mileage-confirm-button'),
    clearAllButton: document.getElementById('mileage-clear-all-button'),
    backspaceButton: document.getElementById('mileage-backspace-button'),
    numberButtons: document.querySelectorAll('#mileage-member-input-screen .number-button:not(.special)')
};
let mileageInput = "";
const mileageInputLength = 10;
function updateMileageInputDisplay() {
    if (mileageElements.inputText) {
        mileageElements.inputText.textContent = mileageInput.padEnd(mileageInputLength, '_');
    }
    if (mileageElements.confirmButton) {
        mileageElements.confirmButton.disabled = mileageInput.length !== mileageInputLength;
    }
}
if (mileageElements.numberButtons) {
    mileageElements.numberButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (mileageInput.length < mileageInputLength) {
                mileageInput += this.dataset.number;
                updateMileageInputDisplay();
            }
        });
    });
}
if (mileageElements.backspaceButton) {
    mileageElements.backspaceButton.addEventListener('click', () => {
        mileageInput = mileageInput.slice(0, -1);
        updateMileageInputDisplay();
    });
}
if (mileageElements.clearAllButton) {
    mileageElements.clearAllButton.addEventListener('click', () => {
        mileageInput = "";
        updateMileageInputDisplay();
    });
}
if (mileageElements.backButton) {
    mileageElements.backButton.addEventListener('click', () => {
        mileageInput = "";
        updateMileageInputDisplay();
        showScreen('ana-identification-screen');
    });
}
if (mileageElements.confirmButton) {
    mileageElements.confirmButton.addEventListener('click', () => {
        if (mileageInput.length === mileageInputLength) {
            showScreen('dangerous-goods-screen');
            mileageInput = "";
            updateMileageInputDisplay();
        }
    });
}

const eTicketElements = {
    inputText: document.getElementById('e-ticket-input-text'),
    backButton: document.getElementById('e-ticket-back-button'),
    confirmButton: document.getElementById('e-ticket-confirm-button'),
    tabNumeric: document.getElementById('e-ticket-tab-numeric'),
    tabAlpha: document.getElementById('e-ticket-tab-alpha'),
    numberPad: document.getElementById('e-ticket-number-pad'),
    alphaPad: document.getElementById('e-ticket-alpha-pad'),
    clearAllButtonNumeric: document.getElementById('e-ticket-clear-all-button'),
    backspaceButtonNumeric: document.getElementById('e-ticket-backspace-button'),
    clearAllButtonAlpha: document.getElementById('e-ticket-alpha-clear-all-button'),
    backspaceButtonAlpha: document.getElementById('e-ticket-alpha-backspace-button'),
    numberButtons: document.querySelectorAll('#e-ticket-number-pad .number-button:not(.special)'),
    alphaButtons: document.querySelectorAll('#e-ticket-alpha-pad .alpha-button')
};
let eTicketInput = "";
const eTicketInputLength = 13;
let currentETicketPad = 'numeric';
function updateETicketInputDisplay() {
    if (eTicketElements.inputText) {
        eTicketElements.inputText.textContent = eTicketInput.padEnd(eTicketInputLength, '_');
    }
    if (eTicketElements.confirmButton) {
        eTicketElements.confirmButton.disabled = eTicketInput.length !== eTicketInputLength;
    }
}
function setETicketPad(padType) {
    currentETicketPad = padType;
    if (eTicketElements.numberPad && eTicketElements.alphaPad && eTicketElements.tabNumeric && eTicketElements.tabAlpha) {
        if (padType === 'numeric') {
            eTicketElements.numberPad.classList.remove('hidden');
            eTicketElements.alphaPad.classList.add('hidden');
            eTicketElements.tabNumeric.classList.add('active');
            eTicketElements.tabAlpha.classList.remove('active');
        } else {
            eTicketElements.numberPad.classList.add('hidden');
            eTicketElements.alphaPad.classList.remove('hidden');
            eTicketElements.tabNumeric.classList.remove('active');
            eTicketElements.tabAlpha.classList.add('active');
        }
    }
}
function setETicketTabLabels(lang) {
    if (eTicketElements.tabNumeric) {
        eTicketElements.tabNumeric.textContent = eTicketElements.tabNumeric.dataset[lang] || eTicketElements.tabNumeric.dataset.en;
    }
    if (eTicketElements.tabAlpha) {
        eTicketElements.tabAlpha.textContent = eTicketElements.tabAlpha.dataset[lang] || eTicketElements.tabAlpha.dataset.en;
    }
}
if (eTicketElements.numberButtons) {
    eTicketElements.numberButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (eTicketInput.length < eTicketInputLength) {
                eTicketInput += this.dataset.number;
                updateETicketInputDisplay();
            }
        });
    });
}
if (eTicketElements.alphaButtons) {
    eTicketElements.alphaButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (eTicketInput.length < eTicketInputLength) {
                eTicketInput += this.dataset.alpha;
                updateETicketInputDisplay();
            }
        });
    });
}
if (eTicketElements.backspaceButtonNumeric) eTicketElements.backspaceButtonNumeric.addEventListener('click', () => { eTicketInput = eTicketInput.slice(0, -1); updateETicketInputDisplay(); });
if (eTicketElements.backspaceButtonAlpha) eTicketElements.backspaceButtonAlpha.addEventListener('click', () => { eTicketInput = eTicketInput.slice(0, -1); updateETicketInputDisplay(); });
if (eTicketElements.clearAllButtonNumeric) eTicketElements.clearAllButtonNumeric.addEventListener('click', () => { eTicketInput = ""; updateETicketInputDisplay(); });
if (eTicketElements.clearAllButtonAlpha) eTicketElements.clearAllButtonAlpha.addEventListener('click', () => { eTicketInput = ""; updateETicketInputDisplay(); });
if (eTicketElements.tabNumeric) eTicketElements.tabNumeric.addEventListener('click', () => setETicketPad('numeric'));
if (eTicketElements.tabAlpha) eTicketElements.tabAlpha.addEventListener('click', () => setETicketPad('alpha'));
if (eTicketElements.backButton) {
    eTicketElements.backButton.addEventListener('click', () => {
        eTicketInput = "";
        updateETicketInputDisplay();
        setETicketPad('numeric');
        showScreen('ana-identification-screen');
    });
}
if (eTicketElements.confirmButton) {
    eTicketElements.confirmButton.addEventListener('click', () => {
        if (eTicketInput.length === eTicketInputLength) {
            showScreen('dangerous-goods-screen');
            eTicketInput = "";
            updateETicketInputDisplay();
            setETicketPad('numeric');
        }
    });
}

// ===========================
// カスタムアラート機能
// ===========================
function customAlert(message, title = "") {
    const alertOverlay = document.createElement('div');
    alertOverlay.classList.add('md3-dialog-overlay');
    alertOverlay.classList.add('show');
    alertOverlay.innerHTML = `
        <div class="md3-dialog">
            ${title ? `<h3 class="md3-dialog-title">${title}</h3>` : ''}
            <div class="md3-dialog-content">
                <p>${message}</p>
            </div>
            <div class="md3-dialog-actions">
                <button class="md3-button md3-text-button close-alert-button" data-ja="閉じる" data-en="Close" data-ko="닫기" data-zh="关闭">閉じる</button>
            </div>
        </div>
    `;
    document.body.appendChild(alertOverlay);
    const closeButton = alertOverlay.querySelector('.close-alert-button');
    if (closeButton) {
        closeButton.textContent = closeButton.dataset[currentLanguage] || closeButton.dataset.en;
    }
    alertOverlay.querySelector('.close-alert-button').addEventListener('click', () => {
        alertOverlay.classList.remove('show');
        setTimeout(() => alertOverlay.remove(), 300);
    });
}

// ===========================
// カスタムプロンプト機能（パスワード入力用）
// ===========================
function customPrompt(message, title = "", callback) {
    const promptOverlay = document.createElement('div');
    promptOverlay.classList.add('md3-dialog-overlay');
    promptOverlay.classList.add('show');
    promptOverlay.innerHTML = `
        <div class="md3-dialog">
            ${title ? `<h3 class="md3-dialog-title">${title}</h3>` : ''}
            <div class="md3-dialog-content">
                <p>${message}</p>
                <input type="password" id="prompt-input" class="md3-text-field" style="width: 100%; padding: 8px; margin-top: 10px; box-sizing: border-box;">
            </div>
            <div class="md3-dialog-actions">
                <button class="md3-button md3-text-button cancel-prompt-button" data-ja="キャンセル" data-en="Cancel" data-ko="취소" data-zh="取消">キャンセル</button>
                <button class="md3-button md3-text-button ok-prompt-button" data-ja="OK" data-en="OK" data-ko="확인" data-zh="确定">OK</button>
            </div>
        </div>
    `;
    document.body.appendChild(promptOverlay);

    const promptInput = promptOverlay.querySelector('#prompt-input');
    const okButton = promptOverlay.querySelector('.ok-prompt-button');
    const cancelButton = promptOverlay.querySelector('.cancel-prompt-button');

    okButton.textContent = okButton.dataset[currentLanguage] || okButton.dataset.en;
    cancelButton.textContent = cancelButton.dataset[currentLanguage] || cancelButton.dataset.en;

    const closePrompt = () => {
        promptOverlay.classList.remove('show');
        setTimeout(() => promptOverlay.remove(), 300);
    };

    okButton.addEventListener('click', () => {
        callback(promptInput.value);
        closePrompt();
    });

    cancelButton.addEventListener('click', () => {
        callback(null); // User cancelled
        closePrompt();
    });

    // Allow pressing Enter key to submit
    promptInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            okButton.click();
        }
    });

    promptInput.focus(); // Focus on the input field
}


// ===========================
// 危険物確認画面機能
// ===========================
const dangerousGoodsNoButton = document.getElementById('dangerous-goods-no-button');
const dangerousGoodsYesButton = document.getElementById('dangerous-goods-yes-button');

if (dangerousGoodsNoButton) {
    dangerousGoodsNoButton.addEventListener('click', () => {
        showScreen('flight-list-screen'); // 【変更】フライトリスト画面へ遷移
    });
}

if (dangerousGoodsYesButton) {
    dangerousGoodsYesButton.addEventListener('click', () => {
        showScreen('staff-assistance-screen');
    });
}

// ===========================
// 追加画面のボタン機能
// ===========================
const sfmButton = document.getElementById('sfm-button');
const boardingPassDoneButton = document.getElementById('boarding-pass-done-button');

if (sfmButton) {
    sfmButton.addEventListener('click', () => {
        authenticateStaffAccess();
    });
}

if (boardingPassDoneButton) {
    boardingPassDoneButton.addEventListener('click', () => {
        showScreen('airline-selection-screen');
    });
}

// ===========================
// 【新規追加】スタッフメニュー画面機能
// ===========================
const staffMenuButton = document.getElementById('staff-menu-button');
const staffMenuBackButton = document.getElementById('staff-menu-back-button');
const staffMenuExitButton = document.getElementById('staff-menu-exit-button');
const staffMenuButtons = document.querySelectorAll('.staff-menu-button');

function authenticateStaffAccess() {
    customPrompt(
        currentLanguage === 'ja' ? 'スタッフメニューにアクセスするにはパスワードを入力してください。' : 'Please enter the password to access the staff menu.',
        currentLanguage === 'ja' ? 'パスワード認証' : 'Password Authentication',
        (password) => {
            if (password === '1234') {
                showScreen('staff-menu-screen');
            } else if (password !== null) {
                customAlert(
                    currentLanguage === 'ja' ? 'パスワードが間違っています。' : 'Incorrect password.',
                    currentLanguage === 'ja' ? 'エラー' : 'Error'
                );
            }
        }
    );
}

if (staffMenuButton) {
    staffMenuButton.addEventListener('click', () => {
        authenticateStaffAccess();
    });
}

if (staffMenuBackButton) {
    staffMenuBackButton.addEventListener('click', () => {
        showScreen('staff-assistance-screen');
    });
}

if (staffMenuExitButton) {
    staffMenuExitButton.addEventListener('click', () => {
        showScreen('airline-selection-screen');
    });
}

if (staffMenuButtons) {
    staffMenuButtons.forEach(button => {
        button.addEventListener('click', () => {
            const functionName = button.dataset.function;
            customAlert(
                currentLanguage === 'ja' ? `機能「${functionName}」は現在開発中です。` : `Function "${functionName}" is currently under development.`,
                currentLanguage === 'ja' ? 'お知らせ' : 'Notice'
            );
        });
    });
}

// ===========================
// 【新規追加】フライトリスト機能
// ===========================
const mockFlights = [
    {
        airline: 'ANA',
        airlineLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8d/All_Nippon_Airways_Logo.svg/1024px-All_Nippon_Airways_Logo.svg.png',
        flightNumber: 'NH2178',
        departureCity: '大阪／伊丹(ITM)',
        arrivalCity: '東京／成田(NRT)',
        departureDateTime: '2025年5月23日',
        seat: '20A'
    },
    {
        airline: 'Air Canada',
        airlineLogo: 'https://www.dataiku.com/wp-content/uploads/2023/10/Air-Canada-Logo.png',
        flightNumber: 'AC006',
        departureCity: '東京／成田(NRT)',
        arrivalCity: 'モントリオール(YUL)',
        departureDateTime: '2025年5月23日',
        seat: '47B'
    },
    {
        airline: 'Air Canada',
        airlineLogo: 'https://www.dataiku.com/wp-content/uploads/2023/10/Air-Canada-Logo.png',
        flightNumber: 'AC670',
        departureCity: 'モントリオール(YUL)',
        arrivalCity: 'ハリファックス(YHZ)',
        departureDateTime: '2025年5月23日',
        seat: '35A'
    }
];

function renderFlightList() {
    const flightListContainer = document.getElementById('flight-list');
    if (!flightListContainer) return;

    flightListContainer.innerHTML = ''; // 既存のリストをクリア

    mockFlights.forEach(flight => {
        const flightCard = document.createElement('div');
        flightCard.classList.add('md3-card', 'md3-elevated-card', 'flight-item-card');
        flightCard.innerHTML = `
            <div class="flight-card-header">
                <img src="${flight.airlineLogo}" alt="${flight.airline} Logo" class="flight-airline-logo">
                <div class="flight-details-main">
                    <span class="flight-detail-label" data-ja="航空会社" data-en="Airline" data-ko="항공사" data-zh="航空公司">航空会社</span>
                    <span class="flight-detail-value">${flight.airline}</span>
                </div>
            </div>
            <div class="flight-card-body">
                <div class="flight-detail-row">
                    <div class="flight-detail-item">
                        <span class="flight-detail-label" data-ja="フライト" data-en="Flight" data-ko="항공편" data-zh="航班">フライト</span>
                        <span class="flight-detail-value">${flight.flightNumber}</span>
                    </div>
                    <div class="flight-detail-item">
                        <span class="flight-detail-label" data-ja="座席" data-en="Seat" data-ko="좌석" data-zh="座位">座席</span>
                        <span class="flight-detail-value">${flight.seat}</span>
                    </div>
                </div>
                <div class="flight-detail-row">
                    <div class="flight-detail-item full-width">
                        <span class="flight-detail-label" data-ja="出発地" data-en="Departure" data-ko="출발지" data-zh="出发地">出発地</span>
                        <span class="flight-detail-value">${flight.departureCity}</span>
                    </div>
                </div>
                <div class="flight-detail-row">
                    <div class="flight-detail-item full-width">
                        <span class="flight-detail-label" data-ja="到着地" data-en="Arrival" data-ko="도착지" data-zh="目的地">到着地</span>
                        <span class="flight-detail-value">${flight.arrivalCity}</span>
                    </div>
                </div>
                <div class="flight-detail-row">
                    <div class="flight-detail-item full-width">
                        <span class="flight-detail-label" data-ja="出発日時" data-en="Departure Date/Time" data-ko="출발 일시" data-zh="出发日期/时间">出発日時</span>
                        <span class="flight-detail-value">${flight.departureDateTime}</span>
                    </div>
                </div>
            </div>
            <div class="flight-card-actions">
                <button class="md3-button md3-text-button flight-action-button" data-action="seat-map" data-ja="シートマップ" data-en="Seat Map" data-ko="좌석 배치도" data-zh="座位图">
                    <span class="material-symbols-rounded">event_seat</span>
                    <span data-ja="シートマップ" data-en="Seat Map" data-ko="좌석 배치도" data-zh="座位图">シートマップ</span>
                </button>
                <button class="md3-button md3-text-button flight-action-button" data-action="upgrade" data-ja="グレートアップ" data-en="Upgrade" data-ko="업그레이드" data-zh="升舱">
                    <span class="material-symbols-rounded">arrow_upward</span>
                    <span data-ja="グレートアップ" data-en="Upgrade" data-ko="업그레이드" data-zh="升舱">グレートアップ</span>
                </button>
                <button class="md3-button md3-text-button flight-action-button" data-action="mileage-registration" data-ja="マイル登録" data-en="Mileage Registration" data-ko="마일리지 등록" data-zh="里程登记">
                    <span class="material-symbols-rounded">card_membership</span>
                    <span data-ja="マイル登録" data-en="Mileage Registration" data-ko="마일리지 등록" data-zh="里程登记">マイル登録</span>
                </button>
            </div>
        `;
        flightListContainer.appendChild(flightCard);

        // Add event listeners to the new buttons
        flightCard.querySelectorAll('.flight-action-button').forEach(button => {
            button.addEventListener('click', function() {
                const action = this.dataset.action;
                let message = '';
                let title = currentLanguage === 'ja' ? 'お知らせ' : 'Notice';
                if (action === 'seat-map') {
                    message = currentLanguage === 'ja' ? 'シートマップ機能は現在開発中です。' : 'Seat map feature is currently under development.';
                } else if (action === 'upgrade') {
                    message = currentLanguage === 'ja' ? 'グレートアップ機能は現在開発中です。' : 'Upgrade feature is currently under development.';
                } else if (action === 'mileage-registration') {
                    message = currentLanguage === 'ja' ? 'マイル登録機能は現在開発中です。' : 'Mileage registration feature is currently under development.';
                }
                customAlert(message, title);
            });
        });

        // Apply current language to newly rendered elements
        flightCard.querySelectorAll('[data-ja], [data-en], [data-ko], [data-zh]').forEach(el => {
            if (el.dataset[currentLanguage]) {
                el.textContent = el.dataset[currentLanguage];
            }
        });
    });
}

// 【新規追加】フライトリスト完了ボタン
const flightListDoneButton = document.getElementById('flight-list-done-button');
if (flightListDoneButton) {
    flightListDoneButton.addEventListener('click', () => {
        showScreen('airline-selection-screen');
    });
}

// ===========================
// 初期画面言語設定とその他の初期化
// ===========================
document.addEventListener('DOMContentLoaded', () => {
    setLanguage(currentLanguage);
    setETicketTabLabels(currentLanguage);
    updateETicketInputDisplay();
    updateBookingInputDisplay();
    updateMileageInputDisplay();
});

// 作品管理システム - 使用例とヘルプ

// ========================================
// 新しい作品を簡単に追加する方法
// ========================================

// 1. 最新映画に新しい作品を追加
contentManager.addContent('latestMovies', {
  id: 'action-movie-2025',
  title: 'アクション映画2025',
  description: '最新のアクション映画です。スリリングな戦闘シーンと感動的なストーリーをお楽しみください。\n\n視聴時間：約110分\n言語：日本語、英語、韓国語、中国語対応\n字幕：日本語、英語、韓国語、中国語対応',
  genre: 'アクション',
  backgroundColor: '#e74c3c',
  coverImage: 'image/covers/action-movie-2025.jpg'
});

// 2. アニメに新しい作品を追加
contentManager.addContent('anime', {
  id: 'romance-anime',
  title: '恋愛アニメ',
  description: '心温まる恋愛アニメです。美しいアニメーションと感動的なストーリーをお楽しみください。\n\n視聴時間：約90分\n言語：日本語、英語、韓国語、中国語対応\n字幕：日本語、英語、韓国語、中国語対応',
  genre: '恋愛',
  backgroundColor: '#e91e63',
  coverImage: 'image/covers/romance-anime.jpg'
});

// 3. 人気作品に新しい作品を追加
contentManager.addContent('popular', {
  id: 'documentary-2025',
  title: 'ドキュメンタリー2025',
  description: '最新のドキュメンタリー番組です。世界の様々な話題を深く掘り下げます。\n\n視聴時間：約60分\n言語：日本語、英語、韓国語、中国語対応\n字幕：日本語、英語、韓国語、中国語対応',
  backgroundColor: '#27ae60',
  coverImage: 'image/covers/documentary-2025.jpg',
  episode: '特別版'
});

// ========================================
// 作品を更新する方法
// ========================================

// タイトルを更新
contentManager.updateContent('latestMovies', 'space-exploration-2025', {
  title: '宇宙探検2025 - 特別版'
});

// 説明文を更新
contentManager.updateContent('latestMovies', 'space-exploration-2025', {
  description: '更新された説明文...'
});

// カバー画像を更新
contentManager.updateContent('latestMovies', 'space-exploration-2025', {
  coverImage: 'image/covers/space-exploration-2025-special.jpg'
});

// ========================================
// 作品を削除する方法
// ========================================

// 作品を削除
contentManager.removeContent('latestMovies', 'action-movie-2025');

// ========================================
// テンプレートを使用する方法
// ========================================

// 映画のテンプレートを取得
const movieTemplate = contentManager.getContentTemplate('latestMovies');
console.log('映画テンプレート:', movieTemplate);

// テンプレートをベースに新しい作品を作成
const newMovie = {
  ...movieTemplate,
  id: 'my-custom-movie',
  title: '私のカスタム映画',
  description: 'カスタム映画の説明...',
  genre: 'ドラマ'
};

contentManager.addContent('latestMovies', newMovie);

// ========================================
// 利用可能なセクションを確認
// ========================================

console.log('利用可能なセクション:', contentManager.getAvailableSections());
// 出力: ['popular', 'recommended', 'latestMovies', 'anime']

// ========================================
// 作品情報を検索・取得する方法
// ========================================

// IDで作品を取得
const movie = getContentData.getById('space-exploration-2025');
console.log('映画情報:', movie);

// カテゴリー別に作品を取得
const sfMovies = getContentData.getByCategory('2025 アクション・SF');
console.log('SF映画:', sfMovies);

// ジャンル別に作品を取得
const actionMovies = getContentData.getByGenre('アクション・SF');
console.log('アクション映画:', actionMovies);

// ========================================
// 一括で作品を追加する方法
// ========================================

// 複数の映画を一括追加
const newMovies = [
  {
    id: 'comedy-movie-1',
    title: 'コメディ映画1',
    description: '笑いの絶えないコメディ映画です。',
    genre: 'コメディ',
    backgroundColor: '#f1c40f',
    coverImage: 'image/covers/comedy-movie-1.jpg'
  },
  {
    id: 'comedy-movie-2',
    title: 'コメディ映画2',
    description: '続編のコメディ映画です。',
    genre: 'コメディ',
    backgroundColor: '#f39c12',
    coverImage: 'image/covers/comedy-movie-2.jpg'
  }
];

newMovies.forEach(movie => {
  contentManager.addContent('latestMovies', movie);
});

// ========================================
// ページを再レンダリングする方法
// ========================================

// 作品を追加・更新・削除した後、ページを再レンダリング
function refreshContent() {
  renderContent();
}

// 使用例：
// contentManager.addContent('latestMovies', newMovie);
// refreshContent(); // ページを更新

// ========================================
// デバッグ用のヘルパー関数
// ========================================

// 現在のすべての作品を表示
function showAllContent() {
  console.log('=== 現在のすべての作品 ===');
  contentManager.getAvailableSections().forEach(section => {
    console.log(`\n--- ${section} ---`);
    console.log(contentData[section].items);
  });
}

// 特定のセクションの作品を表示
function showSectionContent(section) {
  console.log(`=== ${section} セクション ===`);
  console.log(contentData[section].items);
}

// 使用例：
// showAllContent();
// showSectionContent('latestMovies'); 
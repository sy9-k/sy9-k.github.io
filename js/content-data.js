// 作品情報管理ファイル
window.contentData = {
  // 今月の最新作
  featured: {
    title: "今月の最新作",
    description: "機内で最新の映画・番組を楽しもう！ハリウッドの話題作から外国作品まで見どころを一挙紹介",
    watchButton: "今すぐ見る",
    detailButton: "詳細",
    plusButton: "＋"
  },

  // 人気作品
  popular: {
    title: "AirPlane Systems 利用者の中での人気作品",
    items: [
      {
        id: "illit-dothedance",
        title: "ILLIT, 빌려온 고양이 (Do the Dance) | MyK FESTA | MyK LIVE KPOP",
        category: "2025 ALL KPOP",
        description: "ILLIT, 빌려온 고양이 (Do the Dance) | MyK FESTA | MyK LIVE KPOP",
        backgroundColor: "#4b9cf5",
        coverImage: "http://img.youtube.com/vi/D6EaJTkVsFQ/hqdefault.jpg", // カバー画像パス
        episode: "Myk LIVE KPOP",
        youtubeId: "D6EaJTkVsFQ", // YouTube動画ID
        availableLanguages: ["ko", "en"] // 利用可能言語（韓国語、英語のみ）
      }
    ]
  },

  // おすすめTV番組
  recommended: {
    title: "おすすめのテレビ番組",
    items: [
      {
        id: "drama-series-ep1",
        title: "ドラマシリーズ 第1話",
        category: "2025 ALL カテゴリー",
        description: "人気ドラマシリーズの第1話です。感動的なストーリーと素晴らしい演技をお楽しみください。\n\nこのドラマシリーズは、現代社会における人間関係や家族の絆をテーマにした感動的なストーリーです。第1話では、主人公の日常と彼を取り巻く人々との関係が描かれます。\n\n視聴時間：約60分\n言語：日本語、英語、韓国語、中国語対応\n字幕：日本語、英語、韓国語、中国語対応\n\n出演者：\n・主演：田中太郎\n・共演：佐藤花子、鈴木一郎\n・監督：山田次郎\n\nこの作品は、機内での快適な時間をお過ごしいただくために特別に制作されました。感動的なストーリーと素晴らしい演技をお楽しみください。\n\nご視聴の際は、お好みの言語と字幕を選択してからご覧ください。また、プレイリストに追加することで、後で簡単にアクセスすることができます。",
        backgroundColor: "#33ab9f",
        coverImage: "image/covers/drama-series-ep1.jpg",
        episode: "第1話",
        youtubeId: "dQw4w9WgXcQ", // YouTube動画ID
        availableLanguages: ["ja", "en", "ko", "zh"] // 利用可能言語（全言語対応）
      }
    ]
  },

  // 最新映画
  latestMovies: {
    title: "最新映画",
    items: [
      {
        id: "space-exploration-2025",
        title: "宇宙探検2025",
        category: "2025 アクション・SF",
        description: "最新のSF映画「宇宙探検2025」です。壮大な宇宙を舞台にした冒険物語をお楽しみください。\n\n人類が初めて深宇宙に到達した近未来を舞台に、宇宙船クルーたちの壮大な冒険を描いたSF映画です。未知の惑星での発見、宇宙での危機、そして人類の未来について考えさせられる作品です。\n\n視聴時間：約120分\n言語：日本語、英語、韓国語、中国語対応\n字幕：日本語、英語、韓国語、中国語対応\n\n出演者：\n・主演：ジョン・スミス\n・共演：エマ・ジョンソン、マイケル・ブラウン\n・監督：クリス・アンダーソン\n\nこの作品は、機内での快適な時間をお過ごしいただくために特別に制作されました。壮大な宇宙の世界観とスリリングなストーリーをお楽しみください。",
        backgroundColor: "#ff6b35",
        coverImage: "image/covers/space-exploration-2025.jpg",
        genre: "アクション・SF",
        youtubeId: "dQw4w9WgXcQ", // YouTube動画ID
        availableLanguages: ["ja", "en", "ko", "zh"] // 利用可能言語（全言語対応）
      }
    ]
  },

  // アニメ
  anime: {
    title: "アニメ",
    items: [
      {
        id: "adventure-world",
        title: "冒険の世界",
        category: "2025 アニメ・ファンタジー",
        description: "ファンタジーアニメ「冒険の世界」です。魔法と冒険の世界をお楽しみください。\n\n魔法が存在する世界で、主人公が仲間たちと共に冒険を繰り広げるファンタジーアニメです。美しいアニメーションと心躍る冒険ストーリーで、子供から大人まで楽しめる作品です。\n\n視聴時間：約85分\n言語：日本語、英語、韓国語、中国語対応\n字幕：日本語、英語、韓国語、中国語対応\n\n声優：\n・主人公：田中勇気\n・ヒロイン：佐藤愛\n・相棒：鈴木元気\n・監督：山田アニメ\n\nこの作品は、機内での快適な時間をお過ごしいただくために特別に制作されました。魔法と冒険の世界をお楽しみください。",
        backgroundColor: "#f39c12",
        coverImage: "image/covers/adventure-world.jpg",
        genre: "ファンタジー",
        youtubeId: "dQw4w9WgXcQ", // YouTube動画ID
        availableLanguages: ["ja", "en", "ko", "zh"] // 利用可能言語（全言語対応）
      },
    ]
  },

  // ライブ配信
  liveStreams: {
    title: "ライブ配信",
    items: [
      {
        id: "ntv-newslive",
        title: "24H NEWS LIVE - 日テレ",
        category: "2025 ニュース・情報",
        description: "最新のニュースをライブ配信でお届けします。\n\n世界中で起こっている最新の出来事をリアルタイムでお届けするニュースライブ配信です。政治、経済、スポーツ、エンターテイメントなど、様々な分野の最新情報をお楽しみください。\n\n配信時間：24時間\n言語：日本語対応\n字幕：日本語対応\n\nこのライブ配信は、機内での最新情報をお届けするために特別に制作されています。リアルタイムのニュースをお楽しみください。",
        backgroundColor: "#ff0000",
        coverImage: "http://img.youtube.com/vi/t9kwjZBLI-A/maxresdefault.jpg",
        genre: "ニュース",
        liveStreamUrl: "https://www.youtube.com/watch?v=t9kwjZBLI-A", // ライブ配信URL
        availableLanguages: [], // ライブ配信は言語選択不可
        isLiveStream: true // ライブ配信フラグ
      },
      {
        id: "kbs-musiclive",
        title: "THE KPOP:24/7 LIVE(K-POP시간 실시간 스트리밍 채널)",
        category: "2025 音楽・KPOP",
        description: "世界中のK-POPファンのために、「MUCIC BANK」をはじめとするKBSの音楽番組を24時間楽しむことができます。\nFor K-Pop fans around the world, you can enjoy 'Music Bank' and other KBS music programs during 24 hours.\n전세계 K-Pop 팬들을 위해 뮤직뱅크를 비롯해 다양한 KBS 음악프로그램을 24시간 언제든지 즐기실 수 있습니다.\n\nこのライブ配信は、機内での特別な音楽体験をお届けするために制作されています。生演奏の感動をお楽しみください。",
        backgroundColor: "#9b59b6",
        coverImage: "http://img.youtube.com/vi/JVocS7Yftw8/mqdefault.jpg",
        genre: "音楽",
        liveStreamUrl: "https://www.youtube.com/watch?v=JVocS7Yftw8", // ライブ配信URL
        availableLanguages: [], // ライブ配信は言語選択不可
        isLiveStream: true // ライブ配信フラグ
      
      }
    ]
  }
};

// 作品情報を取得する関数
window.getContentData = {
  // 特定の作品をIDで取得
  getById: function(id) {
    const allItems = [
      ...this.getAllPopular(),
      ...this.getAllRecommended(),
      ...this.getAllLatestMovies(),
      ...this.getAllAnime(),
      ...this.getAllLiveStreams()
    ];
    return allItems.find(item => item.id === id);
  },

  // 人気作品をすべて取得
  getAllPopular: function() {
    return contentData.popular.items;
  },

  // おすすめ作品をすべて取得
  getAllRecommended: function() {
    return contentData.recommended.items;
  },

  // 最新映画をすべて取得
  getAllLatestMovies: function() {
    return contentData.latestMovies.items;
  },

  // アニメをすべて取得
  getAllAnime: function() {
    return contentData.anime.items;
  },

  // ライブ配信をすべて取得
  getAllLiveStreams: function() {
    return contentData.liveStreams.items;
  },

  // カテゴリー別に作品を取得
  getByCategory: function(category) {
    const allItems = [
      ...this.getAllPopular(),
      ...this.getAllRecommended(),
      ...this.getAllLatestMovies(),
      ...this.getAllAnime(),
      ...this.getAllLiveStreams()
    ];
    return allItems.filter(item => item.category === category);
  },

  // ジャンル別に作品を取得
  getByGenre: function(genre) {
    const allItems = [
      ...this.getAllPopular(),
      ...this.getAllRecommended(),
      ...this.getAllLatestMovies(),
      ...this.getAllAnime(),
      ...this.getAllLiveStreams()
    ];
    return allItems.filter(item => item.genre === genre);
  }
};

// 簡単に作品を追加するためのヘルパー関数
window.contentManager = {
  // 新しい作品を追加
  addContent: function(section, content) {
    if (contentData[section] && contentData[section].items) {
      // 必須フィールドのチェック
      if (!content.id || !content.title || !content.description) {
        console.error('必須フィールドが不足しています: id, title, description');
        return false;
      }
      
      // デフォルト値の設定
      const defaultContent = {
        backgroundColor: "#666666",
        coverImage: null,
        category: "2025 ALL カテゴリー"
      };
      
      // 既存の作品とマージ
      const newContent = { ...defaultContent, ...content };
      
      // 重複チェック
      const existingIndex = contentData[section].items.findIndex(item => item.id === newContent.id);
      if (existingIndex !== -1) {
        console.warn(`作品ID "${newContent.id}" は既に存在します。上書きします。`);
        contentData[section].items[existingIndex] = newContent;
      } else {
        contentData[section].items.push(newContent);
      }
      
      console.log(`作品 "${newContent.title}" を ${section} セクションに追加しました。`);
      return true;
    } else {
      console.error(`セクション "${section}" が見つかりません。`);
      return false;
    }
  },

  // 作品を削除
  removeContent: function(section, contentId) {
    if (contentData[section] && contentData[section].items) {
      const index = contentData[section].items.findIndex(item => item.id === contentId);
      if (index !== -1) {
        const removed = contentData[section].items.splice(index, 1)[0];
        console.log(`作品 "${removed.title}" を削除しました。`);
        return true;
      } else {
        console.warn(`作品ID "${contentId}" が見つかりません。`);
        return false;
      }
    } else {
      console.error(`セクション "${section}" が見つかりません。`);
      return false;
    }
  },

  // 作品を更新
  updateContent: function(section, contentId, updates) {
    if (contentData[section] && contentData[section].items) {
      const index = contentData[section].items.findIndex(item => item.id === contentId);
      if (index !== -1) {
        contentData[section].items[index] = { ...contentData[section].items[index], ...updates };
        console.log(`作品 "${contentData[section].items[index].title}" を更新しました。`);
        return true;
      } else {
        console.warn(`作品ID "${contentId}" が見つかりません。`);
        return false;
      }
    } else {
      console.error(`セクション "${section}" が見つかりません。`);
      return false;
    }
  },

  // 利用可能なセクションを取得
  getAvailableSections: function() {
    return Object.keys(contentData).filter(key => key !== 'featured');
  },

  // 作品のテンプレートを取得
  getContentTemplate: function(section) {
    const templates = {
      popular: {
        id: "new-popular-content",
        title: "新しい人気作品",
        category: "2025 ALL カテゴリー",
        description: "作品の詳細な説明をここに入力してください。",
        backgroundColor: "#4b9cf5",
        coverImage: "image/covers/default.jpg",
        episode: "エピソード情報"
      },
      recommended: {
        id: "new-recommended-content",
        title: "新しいおすすめ作品",
        category: "2025 ALL カテゴリー",
        description: "作品の詳細な説明をここに入力してください。",
        backgroundColor: "#33ab9f",
        coverImage: "image/covers/default.jpg",
        episode: "エピソード情報"
      },
      latestMovies: {
        id: "new-movie",
        title: "新しい映画",
        category: "2025 ジャンル",
        description: "作品の詳細な説明をここに入力してください。",
        backgroundColor: "#ff6b35",
        coverImage: "image/covers/default.jpg",
        genre: "ジャンル"
      },
      anime: {
        id: "new-anime",
        title: "新しいアニメ",
        category: "2025 アニメ・ジャンル",
        description: "作品の詳細な説明をここに入力してください。",
        backgroundColor: "#f39c12",
        coverImage: "image/covers/default.jpg",
        genre: "ジャンル"
      }
    };
    
    return templates[section] || templates.latestMovies;
  }
};

// 使用例とヘルプ
console.log(`
=== 作品管理システム ===

利用可能なセクション: ${window.contentManager.getAvailableSections().join(', ')}

使用方法:
1. 新しい作品を追加:
   contentManager.addContent('latestMovies', {
     id: 'my-movie',
     title: '私の映画',
     description: '映画の説明...',
     genre: 'アクション'
   });

2. 作品を削除:
   contentManager.removeContent('latestMovies', 'my-movie');

3. 作品を更新:
   contentManager.updateContent('latestMovies', 'my-movie', {
     title: '更新されたタイトル'
   });

4. テンプレートを取得:
   contentManager.getContentTemplate('latestMovies');
`); 
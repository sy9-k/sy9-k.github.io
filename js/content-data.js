// 作品情報管理ファイル
// This file is maintained for backward compatibility
// Content is now loaded from CSV files via csv-content-loader.js

// Initialize with empty data; will be populated by CSV loader
window.contentData = {
  featured: {
    title: "今月の最新作",
    description: "機内で最新の映画・番組を楽しもう！ハリウッドの話題作から外国作品まで見どころを一挙紹介",
    watchButton: "今すぐ見る",
    detailButton: "詳細",
    plusButton: "＋"
  },
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
      },
      {
        id: "test",
        title: "AAA",
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
  },

  // 音楽プレイリスト
  musicPlaylists: {
    title: "音楽プレイリスト",
    items: [
      {
        id: "relaxing-music",
        title: "リラックス音楽",
        category: "2025 音楽・リラックス",
        description: "癒しの音楽コレクションです。\n\n静寂の森の音、夕暮れの海の波音、星空の夜の静けさ、朝の光の温かさをテーマにした癒しの音楽をお楽しみください。\n\n再生時間：約17分\n言語：音楽（言語非依存）\n\nこのプレイリストは、機内でのリラックスタイムをお過ごしいただくために特別に制作されています。心を落ち着かせる音楽をお楽しみください。",
        backgroundColor: "#667eea",
        coverImage: "https://via.placeholder.com/300x300/667eea/ffffff?text=Relaxing+Music",
        genre: "リラックス",
        playlistType: "relaxing",
        tracks: [
          { title: "静寂の森", artist: "Nature Sounds", duration: "3:45", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/667eea/ffffff?text=Relaxing+1" },
          { title: "夕暮れの海", artist: "Ocean Waves", duration: "4:20", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/764ba2/ffffff?text=Relaxing+2" },
          { title: "星空の夜", artist: "Ambient Music", duration: "5:15", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/667eea/ffffff?text=Relaxing+3" },
          { title: "朝の光", artist: "Sunrise", duration: "3:30", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/764ba2/ffffff?text=Relaxing+4" }
        ],
        availableLanguages: [], // 音楽は言語選択不可
        isMusicPlaylist: true // 音楽プレイリストフラグ
      },
      {
        id: "upbeat-music",
        title: "アップテンポ",
        category: "2025 音楽・アップテンポ",
        description: "元気になる音楽コレクションです。\n\nHappy Day、Dance Tonight、Summer Vibes、Energy Boostなど、元気になれる音楽をお楽しみください。\n\n再生時間：約15分\n言語：音楽（言語非依存）\n\nこのプレイリストは、機内でのエネルギーチャージタイムをお過ごしいただくために特別に制作されています。元気になる音楽をお楽しみください。",
        backgroundColor: "#ff6b6b",
        coverImage: "https://via.placeholder.com/300x300/ff6b6b/ffffff?text=Upbeat+Music",
        genre: "アップテンポ",
        playlistType: "upbeat",
        tracks: [
          { title: "Happy Day", artist: "Pop Stars", duration: "3:20", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/ff6b6b/ffffff?text=Upbeat+1" },
          { title: "Dance Tonight", artist: "DJ Mix", duration: "4:10", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/4ecdc4/ffffff?text=Upbeat+2" },
          { title: "Summer Vibes", artist: "Beach Band", duration: "3:55", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/ff6b6b/ffffff?text=Upbeat+3" },
          { title: "Energy Boost", artist: "Power Music", duration: "3:40", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/4ecdc4/ffffff?text=Upbeat+4" }
        ],
        availableLanguages: [],
        isMusicPlaylist: true
      },
      {
        id: "classical-music",
        title: "クラシック",
        category: "2025 音楽・クラシック",
        description: "名曲コレクションです。\n\nMoonlight Sonata、Für Elise、Symphony No. 5、The Four Seasonsなど、クラシックの名曲をお楽しみください。\n\n再生時間：約26分\n言語：音楽（言語非依存）\n\nこのプレイリストは、機内での上質な音楽体験をお過ごしいただくために特別に制作されています。クラシックの名曲をお楽しみください。",
        backgroundColor: "#45b7d1",
        coverImage: "https://via.placeholder.com/300x300/45b7d1/ffffff?text=Classical+Music",
        genre: "クラシック",
        playlistType: "classical",
        tracks: [
          { title: "Moonlight Sonata", artist: "Beethoven", duration: "6:30", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/45b7d1/ffffff?text=Classical+1" },
          { title: "Für Elise", artist: "Beethoven", duration: "3:45", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/96c93d/ffffff?text=Classical+2" },
          { title: "Symphony No. 5", artist: "Beethoven", duration: "8:20", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/45b7d1/ffffff?text=Classical+3" },
          { title: "The Four Seasons", artist: "Vivaldi", duration: "7:15", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/96c93d/ffffff?text=Classical+4" }
        ],
        availableLanguages: [],
        isMusicPlaylist: true
      },
      {
        id: "jazz-music",
        title: "ジャズ",
        category: "2025 音楽・ジャズ",
        description: "スムーズなジャズコレクションです。\n\nSmooth Jazz、Midnight Blues、Saxophone Dreams、Piano Jazzなど、スムーズなジャズをお楽しみください。\n\n再生時間：約21分\n言語：音楽（言語非依存）\n\nこのプレイリストは、機内での上質な音楽体験をお過ごしいただくために特別に制作されています。スムーズなジャズをお楽しみください。",
        backgroundColor: "#f093fb",
        coverImage: "https://via.placeholder.com/300x300/f093fb/ffffff?text=Jazz+Music",
        genre: "ジャズ",
        playlistType: "jazz",
        tracks: [
          { title: "Smooth Jazz", artist: "Jazz Ensemble", duration: "4:30", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/f093fb/ffffff?text=Jazz+1" },
          { title: "Midnight Blues", artist: "Blues Band", duration: "5:15", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/f5576c/ffffff?text=Jazz+2" },
          { title: "Saxophone Dreams", artist: "Sax Player", duration: "4:45", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/f093fb/ffffff?text=Jazz+3" },
          { title: "Piano Jazz", artist: "Jazz Pianist", duration: "6:20", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/f5576c/ffffff?text=Jazz+4" }
        ],
        availableLanguages: [],
        isMusicPlaylist: true
      },
      {
        id: "jpop-music",
        title: "J-POP",
        category: "2025 音楽・J-POP",
        description: "日本のポップスコレクションです。\n\n最新のJ-POPから名曲まで、日本のポップスをお楽しみください。\n\n再生時間：約18分\n言語：日本語\n\nこのプレイリストは、機内での日本の音楽体験をお過ごしいただくために特別に制作されています。J-POPをお楽しみください。",
        backgroundColor: "#ff9a9e",
        coverImage: "https://via.placeholder.com/300x300/ff9a9e/ffffff?text=J-POP+Music",
        genre: "J-POP",
        playlistType: "jpop",
        tracks: [
          { title: "夜に駆ける", artist: "YOASOBI", duration: "4:15", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/ff9a9e/ffffff?text=J-POP+1" },
          { title: "Pretender", artist: "Official HIGE DANdism", duration: "4:30", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/fad0c4/ffffff?text=J-POP+2" },
          { title: "Lemon", artist: "米津玄師", duration: "4:20", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/ff9a9e/ffffff?text=J-POP+3" },
          { title: "ドライフラワー", artist: "優里", duration: "4:45", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/fad0c4/ffffff?text=J-POP+4" }
        ],
        availableLanguages: ["ja"],
        isMusicPlaylist: true
      },
      {
        id: "kpop-music",
        title: "K-POP",
        category: "2025 音楽・K-POP",
        description: "韓国のポップスコレクションです。\n\n最新のK-POPから名曲まで、韓国のポップスをお楽しみください。\n\n再生時間：約16分\n言語：韓国語\n\nこのプレイリストは、機内での韓国の音楽体験をお過ごしいただくために特別に制作されています。K-POPをお楽しみください。",
        backgroundColor: "#a8edea",
        coverImage: "https://via.placeholder.com/300x300/a8edea/ffffff?text=K-POP+Music",
        genre: "K-POP",
        playlistType: "kpop",
        tracks: [
          { title: "Dynamite", artist: "BTS", duration: "3:20", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/a8edea/ffffff?text=K-POP+1" },
          { title: "How You Like That", artist: "BLACKPINK", duration: "3:45", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/fed6e3/ffffff?text=K-POP+2" },
          { title: "Butter", artist: "BTS", duration: "3:30", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/a8edea/ffffff?text=K-POP+3" },
          { title: "Lovesick Girls", artist: "BLACKPINK", duration: "3:25", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/fed6e3/ffffff?text=K-POP+4" }
        ],
        availableLanguages: ["ko"],
        isMusicPlaylist: true
      },
      {
        id: "rock-music",
        title: "ロック",
        category: "2025 音楽・ロック",
        description: "ロックコレクションです。\n\nクラシックロックからモダンロックまで、様々なロックをお楽しみください。\n\n再生時間：約22分\n言語：英語\n\nこのプレイリストは、機内でのロック体験をお過ごしいただくために特別に制作されています。ロックをお楽しみください。",
        backgroundColor: "#ffecd2",
        coverImage: "https://via.placeholder.com/300x300/ffecd2/ffffff?text=Rock+Music",
        genre: "ロック",
        playlistType: "rock",
        tracks: [
          { title: "Sweet Child O' Mine", artist: "Guns N' Roses", duration: "5:55", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/ffecd2/ffffff?text=Rock+1" },
          { title: "Bohemian Rhapsody", artist: "Queen", duration: "6:00", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/fcbcdf/ffffff?text=Rock+2" },
          { title: "Stairway to Heaven", artist: "Led Zeppelin", duration: "8:02", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/ffecd2/ffffff?text=Rock+3" },
          { title: "Hotel California", artist: "Eagles", duration: "6:30", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/fcbcdf/ffffff?text=Rock+4" }
        ],
        availableLanguages: ["en"],
        isMusicPlaylist: true
      },
      {
        id: "electronic-music",
        title: "エレクトロニカ",
        category: "2025 音楽・エレクトロニカ",
        description: "エレクトロニカコレクションです。\n\nアンビエント、チルアウト、ダウンテンポなど、リラックスできるエレクトロニカをお楽しみください。\n\n再生時間：約24分\n言語：音楽（言語非依存）\n\nこのプレイリストは、機内でのエレクトロニカ体験をお過ごしいただくために特別に制作されています。エレクトロニカをお楽しみください。",
        backgroundColor: "#d299c2",
        coverImage: "https://via.placeholder.com/300x300/d299c2/ffffff?text=Electronic+Music",
        genre: "エレクトロニカ",
        playlistType: "electronic",
        tracks: [
          { title: "Teardrop", artist: "Massive Attack", duration: "5:30", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/d299c2/ffffff?text=Electronic+1" },
          { title: "Porcelain", artist: "Moby", duration: "4:15", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/fef9d7/ffffff?text=Electronic+2" },
          { title: "Breathe", artist: "Télépopmusik", duration: "4:45", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/d299c2/ffffff?text=Electronic+3" },
          { title: "All I Need", artist: "Air", duration: "4:30", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/fef9d7/ffffff?text=Electronic+4" }
        ],
        availableLanguages: [],
        isMusicPlaylist: true
      },
      {
        id: "world-music",
        title: "ワールドミュージック",
        category: "2025 音楽・ワールド",
        description: "世界の音楽コレクションです。\n\nアフリカ、ラテン、アジアなど、世界中の音楽をお楽しみください。\n\n再生時間：約20分\n言語：多言語\n\nこのプレイリストは、機内での世界の音楽体験をお過ごしいただくために特別に制作されています。ワールドミュージックをお楽しみください。",
        backgroundColor: "#ffecd2",
        coverImage: "https://via.placeholder.com/300x300/ffecd2/ffffff?text=World+Music",
        genre: "ワールド",
        playlistType: "world",
        tracks: [
          { title: "Waka Waka", artist: "Shakira", duration: "3:45", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/ffecd2/ffffff?text=World+1" },
          { title: "Despacito", artist: "Luis Fonsi", duration: "4:20", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/fcbcdf/ffffff?text=World+2" },
          { title: "Ai Se Eu Te Pego", artist: "Michel Teló", duration: "3:15", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/ffecd2/ffffff?text=World+3" },
          { title: "Gangnam Style", artist: "PSY", duration: "4:20", url: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav", art: "https://via.placeholder.com/300x300/fcbcdf/ffffff?text=World+4" }
        ],
        availableLanguages: ["es", "pt", "ko"],
        isMusicPlaylist: true
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
      ...this.getAllLiveStreams(),
      ...this.getAllMusicPlaylists()
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

  // 音楽プレイリストをすべて取得
  getAllMusicPlaylists: function() {
    return contentData.musicPlaylists.items;
  },

  // カテゴリー別に作品を取得
  getByCategory: function(category) {
    const allItems = [
      ...this.getAllPopular(),
      ...this.getAllRecommended(),
      ...this.getAllLatestMovies(),
      ...this.getAllAnime(),
      ...this.getAllLiveStreams(),
      ...this.getAllMusicPlaylists()
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
      ...this.getAllLiveStreams(),
      ...this.getAllMusicPlaylists()
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
      },
      musicPlaylists: {
        id: "new-music-playlist",
        title: "新しい音楽プレイリスト",
        category: "2025 音楽・ジャンル",
        description: "プレイリストの詳細な説明をここに入力してください。",
        backgroundColor: "#667eea",
        coverImage: "image/covers/default.jpg",
        genre: "音楽ジャンル",
        playlistType: "custom",
        tracks: [
          { title: "新しい楽曲1", artist: "アーティスト1", duration: "3:30", url: "audio/sample1.mp3", art: "image/covers/default.jpg" },
          { title: "新しい楽曲2", artist: "アーティスト2", duration: "4:15", url: "audio/sample2.mp3", art: "image/covers/default.jpg" }
        ],
        availableLanguages: [],
        isMusicPlaylist: true
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
window.cityData = {
  tokyo: {
    name: "東京",
    img: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    desc: "日本の首都・東京は、伝統と最先端が融合する世界有数の大都市です。浅草寺や皇居などの歴史的名所から、渋谷・新宿の近未来的な街並み、グルメやショッピングまで多彩な魅力が楽しめます。",
    spots: [
      { name: "浅草寺", img: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Sensoji_Temple%2C_Tokyo%2C_Japan.jpg", desc: "東京最古の寺院で、雷門が有名な観光名所。" },
      { name: "東京タワー", img: "https://upload.wikimedia.org/wikipedia/commons/9/9e/Tokyo_Tower_and_around_Skyscrapers.jpg", desc: "東京のシンボル的存在の展望タワー。" },
      { name: "渋谷スクランブル交差点", img: "https://upload.wikimedia.org/wikipedia/commons/7/7c/Shibuya_Scramble_Crossing_2018.jpg", desc: "世界的に有名な大交差点。" }
    ],
    food: [
      { name: "寿司", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", desc: "新鮮な魚介を使った日本を代表する料理。" }
    ]
  },
  seoul: {
    name: "ソウル",
    img: "https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=400&q=80",
    desc: "韓国の首都・ソウルは、伝統と現代文化が融合する活気あふれる都市です。景福宮や南大門市場、明洞など観光・グルメ・ショッピングが楽しめます。",
    spots: [
      { name: "景福宮", img: "https://upload.wikimedia.org/wikipedia/commons/2/2b/Gyeongbokgung_in_Seoul.jpg", desc: "朝鮮王朝時代の壮麗な宮殿。" },
      { name: "南大門市場", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Namdaemun_Market_Seoul.jpg", desc: "韓国最大級の伝統市場。" },
      { name: "Nソウルタワー", img: "https://upload.wikimedia.org/wikipedia/commons/2/2d/N_Seoul_Tower_2012.jpg", desc: "ソウルのランドマーク的な展望タワー。" }
    ],
    food: [
      { name: "キムチチゲ", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", desc: "ピリ辛のキムチ鍋は韓国の定番家庭料理。" }
    ]
  },
  bangkok: {
    name: "バンコク",
    img: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Bangkok_skytrain_sunset.jpg",
    desc: "タイの首都・バンコクは、寺院やマーケット、近代的な高層ビルが混在するエネルギッシュな都市です。",
    spots: [
      { name: "ワット・ポー", img: "https://upload.wikimedia.org/wikipedia/commons/6/6b/Wat_Pho_Bangkok.jpg", desc: "巨大な涅槃仏で有名な寺院。" },
      { name: "ワット・アルン", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Wat_Arun_Bangkok.jpg", desc: "チャオプラヤー川沿いの美しい寺院。" },
      { name: "チャトゥチャック・ウィークエンドマーケット", img: "https://upload.wikimedia.org/wikipedia/commons/7/7e/Chatuchak_Weekend_Market_Bangkok.jpg", desc: "東南アジア最大級の市場。" }
    ],
    food: [
      { name: "パッタイ", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", desc: "タイを代表する焼きそば料理。" }
    ]
  },
  paris: {
    name: "パリ",
    img: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=400&q=80",
    desc: "フランスの首都・パリは、エッフェル塔やルーブル美術館、シャンゼリゼ通りなど世界的な観光名所が点在する芸術と美食の都です。",
    spots: [
      { name: "エッフェル塔", img: "https://upload.wikimedia.org/wikipedia/commons/a/a8/Tour_Eiffel_Wikimedia_Commons.jpg", desc: "パリの象徴的な鉄塔。" },
      { name: "ルーブル美術館", img: "https://upload.wikimedia.org/wikipedia/commons/a/af/Louvre_Museum_Wikimedia_Commons.jpg", desc: "世界最大級の美術館。" },
      { name: "ノートルダム大聖堂", img: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Notre_Dame_de_Paris_Wikimedia_Commons.jpg", desc: "ゴシック建築の傑作。" }
    ],
    food: [
      { name: "クロワッサン", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", desc: "サクサクのフランス伝統のパン。" }
    ]
  },
  london: {
    name: "ロンドン",
    img: "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80",
    desc: "イギリスの首都・ロンドンは、歴史的建造物と現代文化が融合する国際都市です。",
    spots: [
      { name: "ビッグ・ベン", img: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Big_Ben_2012.jpg", desc: "ロンドンの象徴的な時計台。" },
      { name: "ロンドン塔", img: "https://upload.wikimedia.org/wikipedia/commons/6/6e/Tower_of_London_viewed_from_the_River_Thames.jpg", desc: "歴史ある世界遺産の城塞。" },
      { name: "バッキンガム宮殿", img: "https://upload.wikimedia.org/wikipedia/commons/6/6e/Buckingham_Palace_from_gardens%2C_London%2C_UK_-_Diliff.jpg", desc: "英国王室の公式宮殿。" }
    ],
    food: [
      { name: "フィッシュ＆チップス", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", desc: "イギリスの伝統的なファストフード。" }
    ]
  },
  rome: {
    name: "ローマ",
    img: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Colosseum_in_Rome%2C_Italy_-_April_2007.jpg",
    desc: "イタリアの首都・ローマは、古代遺跡とバロック建築が共存する歴史都市です。",
    spots: [
      { name: "コロッセオ", img: "https://upload.wikimedia.org/wikipedia/commons/5/5c/Colosseum_in_Rome%2C_Italy_-_April_2007.jpg", desc: "古代ローマの円形闘技場。" },
      { name: "トレビの泉", img: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Trevi_Fountain_Rome.jpg", desc: "ローマを代表する美しい噴水。" },
      { name: "スペイン広場", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Spanish_Steps_Rome.jpg", desc: "映画でも有名な階段広場。" }
    ],
    food: [
      { name: "カルボナーラ", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", desc: "ローマ発祥のクリーミーなパスタ。" }
    ]
  },
  newyork: {
    name: "ニューヨーク",
    img: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=400&q=80",
    desc: "アメリカ最大の都市・ニューヨークは、自由の女神やセントラルパーク、タイムズスクエアなど世界的な観光名所が集まる都市です。多様な文化と最先端のトレンドが融合し、ショッピングやグルメも充実しています。",
    spots: [
      { name: "自由の女神", img: "https://upload.wikimedia.org/wikipedia/commons/a/a1/Statue_of_Liberty_7.jpg", desc: "アメリカの象徴的な像。" },
      { name: "セントラルパーク", img: "https://upload.wikimedia.org/wikipedia/commons/e/e6/Central_Park_New_York_City_New_York_23_crop.jpg", desc: "広大な都市公園。" },
      { name: "タイムズスクエア", img: "https://upload.wikimedia.org/wikipedia/commons/4/47/New_york_times_square-terabass.jpg", desc: "世界で最も有名な交差点の一つ。" }
    ],
    food: [
      { name: "ニューヨークピザ", img: "https://images.unsplash.com/photo-1519864600265-abb23847ef2c?auto=format&fit=crop&w=400&q=80", desc: "薄い生地が特徴のピザ。" }
    ]
  },
  losangeles: {
    name: "ロサンゼルス",
    img: "https://images.unsplash.com/photo-1502920917128-1aa500764ce0?auto=format&fit=crop&w=400&q=80",
    desc: "アメリカ西海岸の大都市・ロサンゼルスは、ハリウッドやビーチ、テーマパークで有名です。",
    spots: [
      { name: "ハリウッドサイン", img: "https://upload.wikimedia.org/wikipedia/commons/5/5b/Hollywood_Sign_(Zuschnitt).jpg", desc: "ロサンゼルスの象徴的な看板。" },
      { name: "サンタモニカピア", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Santa_Monica_Pier_2013.jpg", desc: "人気のビーチと遊園地。" },
      { name: "グリフィス天文台", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Griffith_Observatory_Los_Angeles.jpg", desc: "市内を一望できる展望スポット。" }
    ],
    food: [
      { name: "カリフォルニアロール", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", desc: "アメリカ生まれの巻き寿司。" }
    ]
  },
  sanfrancisco: {
    name: "サンフランシスコ",
    img: "https://images.unsplash.com/photo-1465101178521-c1a9136a3b99?auto=format&fit=crop&w=400&q=80",
    desc: "アメリカ西海岸の港町・サンフランシスコは、ゴールデンゲートブリッジやケーブルカーで有名です。",
    spots: [
      { name: "ゴールデンゲートブリッジ", img: "https://upload.wikimedia.org/wikipedia/commons/0/0c/GoldenGateBridge-001.jpg", desc: "世界的に有名な赤い吊り橋。" },
      { name: "フィッシャーマンズワーフ", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Fishermans_Wharf_San_Francisco.jpg", desc: "人気の観光エリア。" },
      { name: "アルカトラズ島", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Alcatraz_Island_photo_D_Ramey_Logan.jpg", desc: "歴史的な監獄島。" }
    ],
    food: [
      { name: "クラムチャウダー", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", desc: "サワードウブレッド入りの濃厚スープ。" }
    ]
  },
  sydney: {
    name: "シドニー",
    img: "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?auto=format&fit=crop&w=400&q=80",
    desc: "オーストラリア最大の都市・シドニーは、オペラハウスやハーバーブリッジで有名な港町です。",
    spots: [
      { name: "オペラハウス", img: "https://upload.wikimedia.org/wikipedia/commons/4/40/Sydney_Opera_House_Sails.jpg", desc: "世界遺産の美しい劇場。" },
      { name: "ハーバーブリッジ", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Sydney_Harbour_Bridge_night.jpg", desc: "シドニー湾を横断する大橋。" },
      { name: "ボンダイビーチ", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Bondi_Beach_Sydney.jpg", desc: "人気のビーチリゾート。" }
    ],
    food: [
      { name: "ミートパイ", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", desc: "オーストラリアの国民的軽食。" }
    ]
  },
  auckland: {
    name: "オークランド",
    img: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Auckland_CBD_skyline.jpg",
    desc: "ニュージーランド最大の都市・オークランドは、港町と自然が調和した都市です。",
    spots: [
      { name: "スカイタワー", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Sky_Tower_Auckland.jpg", desc: "南半球一の高さを誇る展望タワー。" },
      { name: "オークランド博物館", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Auckland_Museum.jpg", desc: "マオリ文化や自然史の展示が充実。" },
      { name: "デボンポート", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Devonport_Auckland.jpg", desc: "港町の雰囲気が楽しめるエリア。" }
    ],
    food: [
      { name: "フィッシュ＆チップス", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", desc: "ニュージーランドでも人気の定番料理。" }
    ]
  },
  capetown: {
    name: "ケープタウン",
    img: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80",
    desc: "南アフリカの港町・ケープタウンは、テーブルマウンテンや美しい海岸線で有名です。",
    spots: [
      { name: "テーブルマウンテン", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Table_Mountain_Cape_Town.jpg", desc: "ケープタウンの象徴的な山。" },
      { name: "ウォーターフロント", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Victoria_&_Alfred_Waterfront_Cape_Town.jpg", desc: "人気のショッピング＆観光エリア。" },
      { name: "ボルダーズビーチ", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Boulders_Beach_Cape_Town.jpg", desc: "ペンギンが見られるビーチ。" }
    ],
    food: [
      { name: "ボボティー", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", desc: "南アフリカの伝統的なミートローフ料理。" }
    ]
  },
  cairo: {
    name: "カイロ",
    img: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Kairo_001.jpg",
    desc: "エジプトの首都・カイロは、ピラミッドやスフィンクスなど古代遺跡で有名な都市です。",
    spots: [
      { name: "ギザのピラミッド", img: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Kairo_001.jpg", desc: "世界遺産の巨大なピラミッド群。" },
      { name: "エジプト考古学博物館", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Egyptian_Museum_Cairo.jpg", desc: "ツタンカーメンの財宝などを展示。" },
      { name: "ハーン・ハリーリ市場", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Khan_el-Khalili_Cairo.jpg", desc: "活気ある伝統的なバザール。" }
    ],
    food: [
      { name: "コシャリ", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", desc: "豆やパスタを使ったエジプトの国民食。" }
    ]
  },
  dubai: {
    name: "ドバイ",
    img: "https://upload.wikimedia.org/wikipedia/commons/0/0c/Dubai_Marina_Skyline_2015.jpg",
    desc: "アラブ首長国連邦の都市・ドバイは、超高層ビルや近未来的な建築で有名な観光都市です。",
    spots: [
      { name: "ブルジュ・ハリファ", img: "https://upload.wikimedia.org/wikipedia/commons/9/93/Burj_Khalifa_Dubai.jpg", desc: "世界一高い超高層ビル。" },
      { name: "ドバイモール", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Dubai_Mall.jpg", desc: "世界最大級のショッピングモール。" },
      { name: "パーム・ジュメイラ", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Palm_Jumeirah_Dubai.jpg", desc: "人工島の高級リゾートエリア。" }
    ],
    food: [
      { name: "マッチブース", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", desc: "アラブの伝統的な炊き込みご飯料理。" }
    ]
  },
  istanbul: {
    name: "イスタンブール",
    img: "https://images.unsplash.com/photo-1467269204594-9661b134dd2b?auto=format&fit=crop&w=400&q=80",
    desc: "トルコ最大の都市・イスタンブールは、ヨーロッパとアジアが交差する歴史都市です。",
    spots: [
      { name: "アヤソフィア", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Hagia_Sophia_Istanbul.jpg", desc: "ビザンチン建築の傑作。" },
      { name: "ブルーモスク", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Sultan_Ahmed_Mosque_Istanbul.jpg", desc: "美しい青いタイルで有名なモスク。" },
      { name: "グランドバザール", img: "https://upload.wikimedia.org/wikipedia/commons/2/2e/Grand_Bazaar_Istanbul.jpg", desc: "世界最大級の屋内市場。" }
    ],
    food: [
      { name: "ケバブ", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=400&q=80", desc: "トルコを代表する肉料理。" }
    ]
  }
}; 
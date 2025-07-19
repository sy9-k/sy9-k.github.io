# カバー画像ディレクトリ

このディレクトリには、エンターテイメント作品のカバー画像を配置します。

## 推奨仕様

- **サイズ**: 320x180px (16:9アスペクト比)
- **形式**: JPG, PNG, WebP
- **ファイルサイズ**: 100KB以下を推奨
- **ファイル名**: 作品IDと一致させる（例: `flight-tv-ep1.jpg`）

## ファイル命名規則

作品IDに基づいてファイル名を決定します：

```
作品ID: "flight-tv-ep1" → ファイル名: "flight-tv-ep1.jpg"
作品ID: "space-exploration-2025" → ファイル名: "space-exploration-2025.jpg"
```

## 現在の作品とカバー画像

### 人気作品
- `flight-tv-ep1.jpg` - Flight TV ep.1

### おすすめTV番組
- `drama-series-ep1.jpg` - ドラマシリーズ 第1話

### 最新映画
- `space-exploration-2025.jpg` - 宇宙探検2025
- `family-bonds.jpg` - 家族の絆
- `mystery-hotel.jpg` - ミステリー・ホテル

### アニメ
- `adventure-world.jpg` - 冒険の世界
- `future-city.jpg` - 未来都市

## 新しい作品を追加する場合

1. カバー画像をこのディレクトリに配置
2. `content-data.js`で作品情報を追加
3. `coverImage`プロパティに画像パスを指定

例：
```javascript
{
  id: "new-movie",
  title: "新しい映画",
  coverImage: "image/covers/new-movie.jpg",
  // ... その他の情報
}
```

## 注意事項

- 画像が見つからない場合は、背景色が表示されます
- 画像の著作権に注意してください
- 機内エンターテイメントに適した内容の画像を使用してください 
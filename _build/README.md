# _build — サイトのページを作る元ファイル

`_` で始まるフォルダなので、GitHub Pages では公開されません（リポジトリにだけあるファイルです）。

## ページを作り直す

```
python _build/build.py
```

- 型は **トップページの `index.html`** です。`<main id="main">` の外側（`<head>`・ヘッダー・フッター）が全ページ共通になります。
- 各ページの中身は `_build/pages/*.html` です。ページを直すときは、ここを編集してから build します（書き出された `about/index.html` などを直接直しても、次の build で上書きされます）。
- トップページだけは `index.html` を直接編集します（編集したら build して、ほかのページのヘッダー・フッターにも反映します）。
- ページの一覧・タイトル・説明・追加で読み込むファイルは `build.py` の `pages` と `EXTRA` にあります。
- `sitemap.xml` も build で作り直されます。

## 共有画像（assets/og.png）を作り直す

```
python _build/og/render.py
```

`_build/og/og.html` を Microsoft Edge で撮影して `assets/og.png` に保存します。

## サポートの記事・お知らせ

記事は **記事エディター（https://sy9-k.github.io/studio/）** で書きます。保存すると SK Hub Systems に入り、サポートページにすぐ出ます（build もプッシュもいりません）。

- `support/articles.json` は予備です（SK Hub Systems に記事が 1 件もない・届かないときだけ使われる）。記事エディターの「バックアップを書き出す」で作ったファイルと入れ替えてプッシュすると、予備も新しくなります。
- 読み込みと本文の書き方は `support/articles.js` にまとめています。

## build で作らないページ

次のページは、それぞれのフォルダのファイルを直接編集します。

- `index.html`（トップ）
- `dictionary/`（MALU）
- `y-filter/`（Y-FILTER. 管理コンソール。共通部分は y-filter リポジトリの `systems/sync-console.mjs` でコピー）
- `qr-prj/`・`smart-dash/`（SK's Lab）
- `news/`（サポートへの転送）・`usercheck/`（同意・アクセス制限の画面）

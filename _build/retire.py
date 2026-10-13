"""旧ドメイン（sy9-k.github.io）のサポートを終えるときに、1 回だけ動かすスクリプト

  python _build/retire.py          … 試しに動かす（何も変えずに、残すもの・消すもの・書きかえるものを出す）
  python _build/retire.py --apply  … 実際に変える（このあと、変更を確かめてからコミット・プッシュする）

終えたあとの sy9-k.github.io:
  ・一般の人: どのページを開いても「このアドレスは使われていません」（/moved/ の中身）。古いデータがなければ sk-hub.jp の同じページへ移る
    （GitHub Pages は、ないページを開くと 404.html を出す。残さないページを消して、404.html と index.html を /moved/ の中身にする）
  ・管理者: /admin/（管理画面）は今までどおり使える。アカウント（/account/）・RedFlag Checker（/frameworks/）・同意と制限の画面（/usercheck/）も残す
  ・ホーム画面に追加したアプリの Service Worker（sw.js）は、自分を解除してキャッシュを消す中身に置きかえる（消すと古い画面が出続けるため）

残すもの = KEEP_PAGES のページと、そのページが読み込むファイル（HTML の src・href、JS の import、CSS の url() をたどる）と、KEEP_EXTRA
"""
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MARK = os.path.join(ROOT, "_build", "RETIRED")

# 入り口のページ（ここから読み込むファイルをたどる）
KEEP_PAGES = [
    "admin/**/index.html",
    "account/index.html",
    "moved/index.html",
    "move/index.html",
    "usercheck/*.html",
]
# たどっても見つからない（JS の中で組み立てる）けれど要るもの
KEEP_EXTRA = [
    "admin/**",                      # 管理画面（共通部分・各ページの JS）
    "assets/i18n/*.js",              # assets/i18n.js が言語ごとに読み込む
    "assets/move-data.js",           # /move/ が使う
    "assets/sk-dark.png",            # RedFlag Checker の右下のマーク
    "frameworks/**",                 # RedFlag Checker（check.js が check-heavy.js を読み込む）
    "policies/docs/*.txt",           # アカウントのページ・site.js が規約の文を読む
    "y-filter/firebase-config.js",   # assets/hub/account.js が読む
    "y-filter/shared/version.json",  # site.js が読む
    "updates/updates.json",          # site.js が読む
    "support/articles.js",           # 管理画面の記事エディターのプレビュー
    "google4b04249061c7d95f.html",   # Google Search Console の持ち主の確認（消さない）
    "robots.txt",                    # 下で書きかえる
]
# 公開しないもの・リポジトリの設定（GitHub Pages では配信されない）は触らない
SKIP = re.compile(r"^(\.|_)")

KILL_SW = """// 旧ドメイン（sy9-k.github.io）のサポートを終えたので、この Service Worker は自分を解除して、キャッシュを消す
// （_build/retire.py が書いたもの。ホーム画面に追加したアプリを開くと、このあと sk-hub.jp への案内が出る）
self.addEventListener("install", function () { self.skipWaiting(); });
self.addEventListener("activate", function (event) {
  event.waitUntil((async function () {
    var keys = await caches.keys();
    await Promise.all(keys.map(function (k) { return caches.delete(k); }));
    await self.registration.unregister();
    var clients = await self.clients.matchAll({ type: "window" });
    clients.forEach(function (c) { c.navigate(c.url); });
  })());
});
"""

ROBOTS = """# 旧ドメイン（sy9-k.github.io）は使われていません。SK は https://sk-hub.jp/ です
User-agent: *
Disallow: /
"""

# 読み込むもの（src と <link href>）だけをたどる。<a href> のリンク先のページはたどらない
HTML_REF = re.compile(r"""\bsrc\s*=\s*["'](/[^"'#?]*)|<link\b[^>]*?\bhref\s*=\s*["'](/[^"'#?]*)""")
JS_REF = re.compile(r"""(?:from\s+|import\s*\(\s*|import\s+)["'](/[^"'#?]+)["']""")
CSS_REF = re.compile(r"""url\(\s*["']?(/[^"')#?]+)|@import\s+["'](/[^"']+)["']""")


def all_files():
    out = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        rel_dir = os.path.relpath(dirpath, ROOT)
        if rel_dir != "." and SKIP.match(rel_dir.split(os.sep)[0]):
            dirnames[:] = []
            continue
        for name in filenames:
            rel = os.path.normpath(os.path.join(rel_dir, name)).replace(os.sep, "/")
            if not SKIP.match(rel):
                out.append(rel)
    return sorted(out)


def glob_match(pattern, path):
    rx = re.escape(pattern).replace(r"\*\*/", "(?:.*/)?").replace(r"\*\*", ".*").replace(r"\*", "[^/]*")
    return re.fullmatch(rx, path) is not None


def refs_of(path):
    full = os.path.join(ROOT, path)
    try:
        text = open(full, encoding="utf-8").read()
    except (UnicodeDecodeError, FileNotFoundError):
        return []
    found = []
    if path.endswith((".html", ".htm")):
        found += [a or b for a, b in HTML_REF.findall(text)]
        found += JS_REF.findall(text)  # <script type="module"> の中の import
    elif path.endswith((".js", ".mjs")):
        found += JS_REF.findall(text)
    elif path.endswith(".css"):
        found += [a or b for a, b in CSS_REF.findall(text)]
    out = []
    for ref in found:
        if ref.startswith("//"):
            continue
        rel = ref.lstrip("/")
        if rel == "" or rel.endswith("/"):
            rel += "index.html"
        out.append(rel)
    return out


def plan():
    files = all_files()
    known = set(files)
    keep = {f for f in files if any(glob_match(p, f) for p in KEEP_PAGES + KEEP_EXTRA)}
    todo = sorted(keep)
    while todo:
        for r in refs_of(todo.pop()):
            if r in known and r not in keep:
                keep.add(r)
                todo.append(r)
    sws = [f for f in files if f.endswith("/sw.js") or f == "sw.js"]
    keep -= set(sws)
    delete = [f for f in files if f not in keep and f not in sws and f not in ("index.html", "404.html", "sitemap.xml")]
    return files, sorted(keep), delete, sws


def main():
    apply = "--apply" in sys.argv
    if os.path.exists(MARK):
        print("もう終えています（_build/RETIRED があります）。")
        return 1
    files, keep, delete, sws = plan()
    print(f"ファイル {len(files)} 個のうち")
    print(f"  残す       {len(keep)} 個")
    print(f"  消す       {len(delete)} 個")
    print(f"  置きかえる Service Worker {len(sws)} 個・index.html・404.html（/moved/ の中身）・robots.txt / sitemap.xml を消す")
    if "-v" in sys.argv or not apply:
        print("\n残すもの:")
        for f in keep:
            print("  " + f)
        print("\n消すもの（フォルダごとの数）:")
        dirs = {}
        for f in delete:
            top = f.split("/")[0] if "/" in f else "(いちばん上)"
            dirs[top] = dirs.get(top, 0) + 1
        for d, n in sorted(dirs.items()):
            print(f"  {d}: {n}")
    if not apply:
        print("\n試しに動かしただけです。実際に変えるときは --apply を付けます。")
        return 0

    for f in delete:
        os.remove(os.path.join(ROOT, f))
    # 空になったフォルダを消す
    for dirpath, dirnames, filenames in os.walk(ROOT, topdown=False):
        rel = os.path.relpath(dirpath, ROOT)
        if rel != "." and not SKIP.match(rel.split(os.sep)[0]) and not os.listdir(dirpath):
            os.rmdir(dirpath)
    for f in sws:
        os.makedirs(os.path.dirname(os.path.join(ROOT, f)) or ROOT, exist_ok=True)
        open(os.path.join(ROOT, f), "w", encoding="utf-8").write(KILL_SW)
    moved = open(os.path.join(ROOT, "moved", "index.html"), encoding="utf-8").read()
    for name in ("index.html", "404.html"):
        open(os.path.join(ROOT, name), "w", encoding="utf-8").write(moved)
    open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8").write(ROBOTS)
    if os.path.exists(os.path.join(ROOT, "sitemap.xml")):
        os.remove(os.path.join(ROOT, "sitemap.xml"))
    open(MARK, "w", encoding="utf-8").write("旧ドメインのサポートを終えました（_build/retire.py）。このあとは build.py を動かしません。\n")
    print("\n終えました。git status で確かめてからコミットします。")
    return 0


if __name__ == "__main__":
    sys.exit(main())

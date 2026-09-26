# サイトのページを作るスクリプト（使い方は _build/README.md）
#   python _build/build.py
# index.html（トップ）のヘッダー・フッターを型にして、_build/pages/*.html の中身を差し込み、各ページの index.html を書き出す。
# 多言語: URL は変えず、ブラウザで選んだ言語に訳す（assets/i18n.js）。ここでは
#   ・ブラウザで使う辞書（assets/i18n/<言語>.js）を _build/i18n/<言語>.json から作る
#   ・ページとスクリプトの中の「辞書にない文」を探して _build/i18n/missing/<言語>.json に書き出す（訳を入れて辞書に足す）
# あわせて sitemap.xml も作り直す。
import datetime, json, pathlib, re, sys

BUILD = pathlib.Path(__file__).resolve().parent
REPO = BUILD.parent
PAGES = BUILD / "pages"
I18N = BUILD / "i18n"
ORIGIN = "https://sy9-k.github.io"
sys.path.insert(0, str(BUILD))
from i18n import LANGS, Translator, key_of, load_table, translate  # noqa: E402

index = (REPO / "index.html").read_text(encoding="utf-8")
head, rest = index.split('  <main id="main">\n', 1)
home_body, tail = rest.split("  </main>\n", 1)

# (元, 出力先, タイトル, 説明, リダイレクトしない, 検索に載せる)
pages = [
    ("sk-hub-systems.html", "sk-hub-systems/index.html", "SK Hub Systems | SK", "Y-FILTER. の遠隔管理・ブロックリストの配信・アクセスチェックを支える、SK が運営するサーバー基盤「SK Hub Systems」。", True, True),
    ("updates.html", "updates/index.html", "アップデート | SK", "SK のサイトとプロダクト（Y-FILTER.・SK Hub Systems・SK's Lab）のアップデート情報。", True, True),
    ("lab.html", "lab/index.html", "SK's Lab | SK", "SK の実験的なツールを置いている場所。QR Drop やスマートダッシュボードなど。", False, True),
    ("status.html", "status/index.html", "システム稼働状況 | SK", "SK のサイトとプロダクト（SK Hub Systems・Y-FILTER.・MALU）のシステム稼働状況。", True, True),
    ("credits.html", "credits/index.html", "Link & Credit | SK", "SK のサイトとプロダクトで使わせてもらっているもの（RedCheck など）と、つながりのあるサイト。", True, True),
    ("about.html", "about/index.html", "私について | SK", "Y-FILTER. と MALU を開発している SK の自己紹介と、これまでにつくったもの。", False, True),
    ("y-filter.html", "products/y-filter/index.html", "Y-FILTER. | SK", "有害なサイトのブロックや利用時間の管理ができるブラウザ拡張機能「Y-FILTER.」（開発中）。", False, True),
    ("malu.html", "products/malu/index.html", "MALU | SK", "国語・英語・韓国語・中国語などの辞書をひとつの検索ボックスから引ける辞書検索アプリ「MALU」。", False, True),
    ("support.html", "support/index.html", "サポート | SK", "SK からのお知らせと、Y-FILTER.・MALU・SK Hub Systems・SK's Lab の使い方や困ったときの記事。", True, True),
    ("account.html", "account/index.html", "SK Hub Systems アカウント | SK", "SK のサービスを 1 つの Google アカウントで使える「SK Hub Systems アカウント」。ログイン・アカウントの確認・削除。", True, True),
    ("contact.html", "contact/index.html", "お問い合わせ | SK", "SK への不具合の報告・ご質問・ご要望はこちらから。", True, True),
    ("policies.html", "policies/index.html", "利用規約・プライバシーポリシー | SK", "SK 利用規約・SK プライバシーポリシーと、SK Hub Systems アカウント・Y-FILTER. の利用規約。", True, True),
    ("lang.html", "lang/index.html", "Language | SK", "Choose your language / 言語を選択", True, False),
    ("inbox.html", "inbox/index.html", "お問い合わせの受信箱 | SK", "SK へのお問い合わせの受信箱（開発者用）。", True, False),
    ("studio.html", "studio/index.html", "記事エディター | SK", "サポートのお知らせと記事を書くページ（開発者用）。", True, False),
    ("404.html", "404.html", "ページが見つかりません | SK", "お探しのページは見つかりませんでした。", True, False),
]
# 訳さないページ（開発者だけが使う）
NOT_TRANSLATED = {"inbox.html", "studio.html"}

# ページごとに追加する <head> の中身と <body> のクラス
EXTRA = {
    "account.html": ('  <script type="module" src="/account/account-page.js"></script>\n', None),
    "inbox.html": ('  <script type="module" src="/inbox/inbox.js"></script>\n', None),
    "studio.html": ('  <script type="module" src="/studio/studio.js"></script>\n', None),
    "contact.html": ('  <script src="/contact/contact.js" defer></script>\n', None),
    "support.html": ('  <script src="/support/help.js" defer></script>\n', None),
    "status.html": ('  <script src="/status/status.js" defer></script>\n', None),
    "lang.html": ('  <script src="/lang/lang.js" defer></script>\n', "lang-page"),
    "credits.html": ('  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@700&display=swap">\n', None),
    "y-filter.html": (
        '  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Noto+Sans+JP:wght@900&display=swap">\n'
        '  <link rel="stylesheet" href="/products/y-filter/yf.css">\n',
        "yf-page",
    ),
}

# t("…") などで訳す文を探すファイル（ページの外でスクリプトが作る文字）
RUNTIME_SOURCES = [
    "assets/site.js", "support/help.js", "support/articles.js", "account/account-page.js",
    "contact/contact.js", "status/status.js", "frameworks/check.js",
]
# build で作らないページ（ブラウザでページごと訳す）
STANDALONE_PAGES = ["usercheck/blocked.html", "usercheck/terms_not_accepted.html"]


def page_url(dst):
    return ORIGIN + "/" + dst.removesuffix("index.html")


def set_meta(h, pattern, value):
    return re.sub(pattern, lambda m: m.group(1) + value.replace("\\", "\\\\") + m.group(2), h, count=1)


def assemble(body, dst, title, desc, no_redirect, indexable, src=None):
    h = re.sub(r"<title>.*?</title>", f"<title>{title}</title>", head)
    h = set_meta(h, r'(<meta name="description" content=")[^"]*(">)', desc)
    h = set_meta(h, r'(<meta property="og:title" content=")[^"]*(">)', title)
    h = set_meta(h, r'(<meta property="og:description" content=")[^"]*(">)', desc)
    if indexable:
        h = set_meta(h, r'(<meta property="og:url" content=")[^"]*(">)', page_url(dst))
        h = set_meta(h, r'(<link rel="canonical" href=")[^"]*(">)', page_url(dst))
    else:
        # 検索に載せないページ（受信箱・404 など）: URL の指定を外して noindex にする
        h = re.sub(r'  <link rel="canonical" href="[^"]*">\n', "", h)
        h = re.sub(r'  <meta property="og:url" content="[^"]*">\n', "", h)
        h = h.replace('  <meta name="theme-color"', '  <meta name="robots" content="noindex">\n  <meta name="theme-color"', 1)
    if src in EXTRA:
        extra_head, body_class = EXTRA[src]
        h = h.replace("</head>\n", extra_head + "</head>\n", 1)
        if body_class:
            h = h.replace("<body>", f'<body class="{body_class}">', 1)
    t = tail
    if no_redirect:
        # ブロック中・同意撤回中の人も読めるように、リダイレクトしないモードで読み込む
        t = t.replace('/frameworks/check.js"', '/frameworks/check.js?check=none"')
    if src in NOT_TRANSLATED:
        # 開発者用のページは訳さない
        t = t.replace("<script>window.SKI18N && SKI18N.translatePage();</script>", "")
    return h + '  <main id="main">\n' + body + "  </main>\n" + t


translators = {code: Translator(code, load_table(I18N / f"{code}.json")) for code, *_ in LANGS if code != "ja"}
sitemap = [page_url("index.html")]
checked = [index]

for src, dst, title, desc, no_redirect, indexable in pages:
    body = (PAGES / src).read_text(encoding="utf-8")
    text = assemble(body, dst, title, desc, no_redirect, indexable, src)
    out = REPO / dst
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding="utf-8", newline="\n")
    if indexable:
        sitemap.append(page_url(dst))
    if src not in NOT_TRANSLATED:
        checked.append(text)
print("wrote", len(pages), "pages")

# 辞書にない文を探す（ページ ＋ build で作らないページ ＋ スクリプトの t("…")）
for rel in STANDALONE_PAGES:
    checked.append((REPO / rel).read_text(encoding="utf-8"))
runtime_keys = set()
for rel in RUNTIME_SOURCES:
    source = (REPO / rel).read_text(encoding="utf-8")
    for q in ('"', "'"):
        for k in re.findall(r"\b(?:t|tx|tw)\(\s*" + q + r"((?:[^" + q + r"\\]|\\.)*)" + q, source):
            runtime_keys.add(json.loads(f'"{k}"') if "\\" in k else k)
for code, tr in translators.items():
    for text in checked:
        translate(text, tr)
    for k in runtime_keys:
        if re.search(r"[぀-ヿ㐀-鿿]", k) and not tr.table.get(key_of(k)):
            tr.missing.add(key_of(k))

# ブラウザで使う辞書（キーは assets/i18n.js の keyOf と同じ形）
(REPO / "assets" / "i18n").mkdir(parents=True, exist_ok=True)
for code, tr in translators.items():
    js = ("// build が作るファイル（_build/i18n/%s.json から）。直接編集しない\nwindow.SK_I18N_DICT = %s;\n"
          % (code, json.dumps(dict(sorted(tr.table.items())), ensure_ascii=False, separators=(",", ":"))))
    (REPO / "assets" / "i18n" / f"{code}.js").write_text(js, encoding="utf-8", newline="\n")

# 訳がない文の一覧
missing_dir = I18N / "missing"
missing_dir.mkdir(parents=True, exist_ok=True)
for code, tr in translators.items():
    path = missing_dir / f"{code}.json"
    if tr.missing:
        path.write_text(json.dumps({k: "" for k in sorted(tr.missing)}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
        print(f"missing {code}: {len(tr.missing)}")
    elif path.exists():
        path.unlink()

# サイトマップ（このスクリプトで作るページ ＋ 別に作っているアプリ）
sitemap += [ORIGIN + "/dictionary/", ORIGIN + "/y-filter/", ORIGIN + "/qr-prj/", ORIGIN + "/smart-dash/"]
today = datetime.date.today().isoformat()
xml = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
xml += [f"  <url><loc>{u}</loc><lastmod>{today}</lastmod></url>" for u in sitemap]
xml.append("</urlset>")
(REPO / "sitemap.xml").write_text("\n".join(xml) + "\n", encoding="utf-8", newline="\n")
print("wrote sitemap.xml", len(sitemap), "urls")

# SNS で共有したときの画像（assets/og.png・1200×630）を作り直すスクリプト
#   python _build/og/render.py
# og.html を Microsoft Edge（ヘッドレス）で開いて撮影する。og.html の中の REPO/ はリポジトリの場所に置き換える。
import os, pathlib, shutil, subprocess, tempfile

OG = pathlib.Path(__file__).resolve().parent
REPO = OG.parent.parent
EDGE_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]

edge = next((p for p in EDGE_CANDIDATES if os.path.exists(p)), None)
if not edge:
    raise SystemExit("Microsoft Edge が見つかりません")

with tempfile.TemporaryDirectory() as tmp:
    tmp = pathlib.Path(tmp)
    html = (OG / "og.html").read_text(encoding="utf-8").replace("REPO/", REPO.as_uri() + "/")
    page = tmp / "og.html"
    page.write_text(html, encoding="utf-8")
    shot = tmp / "og.png"
    subprocess.run([
        edge, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--allow-file-access-from-files",
        f"--user-data-dir={tmp / 'profile'}", "--window-size=1200,630", "--virtual-time-budget=6000",
        f"--screenshot={shot}", page.as_uri(),
    ], check=True, timeout=120)
    shutil.copyfile(shot, REPO / "assets" / "og.png")

print("wrote assets/og.png")

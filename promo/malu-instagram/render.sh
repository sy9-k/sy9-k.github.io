#!/bin/sh
# story.html を headless Chrome で開いて、1080×1920 の PNG（malu-story.png）にする
cd "$(dirname "$0")"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars \
  --allow-file-access-from-files --window-size=1080,1920 --virtual-time-budget=8000 \
  --screenshot="$PWD/malu-story.png" "file://$PWD/story.html"

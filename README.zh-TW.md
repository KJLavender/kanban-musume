# Kanban Musume 看板娘:寫程式時陪著你的動漫角色

[English](README.md) | **繁體中文**

Kanban Musume(看板娘)把動漫角色放到你的程式碼旁邊。在 VS Code 裡,角色會站在編輯器角落,後面是她自己的淡化插畫;她會沿著視窗邊緣走來走去、跟著你打字、被點到會有反應,每隔幾分鐘換下一個角色上場。另外還有一個桌面寵物,會演出 coding agent 正在做的事。

<p align="center"><img src="docs/vscode-editor.png" width="100%" alt="ヒカリ站在 VS Code 編輯器角落,後面是淡化的插畫"></p>

## 快速開始(VS Code)

1. 到[最新版本](https://github.com/KJLavender/kanban-musume/releases/latest)下載 `kanban-musume-vscode-0.2.0.vsix`。這是 Windows 版。
2. 安裝。在 VS Code 打開「擴充功能」,點右上角的 `...`,選「從 VSIX 安裝...」,選這個檔案。或是在終端機執行:

   ```bash
   code --install-extension kanban-musume-vscode-0.2.0.vsix
   ```

3. 按 `Ctrl+Shift+P`,執行「Kanban Musume: 把角色放進編輯器」,按「繼續」,再按「重新載入視窗」。

角色會出現在右下角。在她身上按右鍵換下一個角色,可以把她拖到任何地方,點她的頭或臉頰會有反應。角色有 DeepSeek娘、芙蘭朵露和蕾米莉亞(東方 Project),以及ヒカリ和ノゾミ(蔚藍檔案),每個都有自己的背景插畫。想移除的話,在解除安裝前先執行「Kanban Musume: 把角色從編輯器移除」。詳細說明在[在 VS Code 裡](#在-vs-code-裡)。

## 桌面寵物

桌面寵物會即時演出 coding agent 正在做的事。agent 在讀檔案,寵物就翻書;agent 在改程式,寵物就打字;agent 要做有風險的事、需要你同意時,寵物會舉一塊寫著「准」和「不准」的牌子跑過來問你。

它支援講 [ACP](https://agentclientprotocol.com)(Agent Client Protocol,程式與 coding agent 溝通的標準協定)的 agent,例如 Claude Code（預設）、Codex 或 Gemini CLI。寵物不聊天,也不靠讀 log 猜。它直接讀 agent 真實的 `session/update` 事件,事件一來就演出來。

<p align="center">
  <img src="docs/pets/hikari.gif" width="192" height="208" alt="ヒカリ Hikari">
  <img src="docs/pets/nozomi.gif" width="192" height="208" alt="ノゾミ Nozomi">
</p>
<p align="center"><img src="docs/showcase.png" width="100%" alt="ヒカリ和ノゾミ的每個動作,插畫版與像素版"></p>

預設的寵物是遊戲《蔚藍檔案》的ヒカリ和ノゾミ([見下方](#ヒカリ與ノゾミ))。另外還有用程式畫的小雞,也可以用你自己的圖片或 Codex 角色包。

## 寵物會做什麼

內建小雞的反應如下:

![poses](docs/poses.png)

| agent 在做什麼 | 小雞在做什麼 |
|---|---|
| 思考或列計畫 | 頭上冒燈泡、踱步 |
| `tool_call` read / search | 翻書 |
| `tool_call` edit / delete / move | 快速打字 |
| `tool_call` execute | 在鐵砧上敲榔頭 |
| `tool_call` fetch | 拿望遠鏡看 |
| `request_permission` | 舉牌跑過來,牌上有「准」和「不准」。60 秒沒回應就自動拒絕 |
| turn 成功 | 開心跳,冒出愛心;經驗值夠就升級 |
| turn 失敗 | 變灰,頭上一朵烏雲下雨 |
| 權限被拒或任務被取消 | 轉過身去生悶氣 |
| 閒置很久 | 變無聊,然後睡著 |

上面還疊了一層簡單的電子雞養成。體力每次 tool call 都會下降,睡覺時恢復。無聊值在閒置時上升,高到一定程度,寵物會跑來向你討任務。每完成一個任務得到經驗值(XP),連續成功有額外加成。小雞 Lv.3 長雞冠,Lv.5 戴皇冠。所有資料存在 `~/.acp-pet/`。

![features](docs/features.png)

## 安裝與執行

需要 Node.js 和 npm,以及一個已經裝好並登入的 coding agent。寵物透過 [acpx](https://github.com/openclaw/acpx)(執行 ACP agent 的工具)啟動 agent,`npm install` 會一併裝好 acpx。

```bash
npm install
npm run demo      # 腳本示範,不需要 agent
npm start         # 正式使用
```

兩個指令都會先 build,再用 Electron 開啟。

操作方式:

- 單擊寵物摸摸牠。點的位置不同,反應也不同:摸頭會開心,戳臉頰會嘟嘴,幾秒內連點五下會生氣。雙擊開啟任務框,拖曳可以移動位置。
- 在寵物上按右鍵,或點托盤圖示,開啟選單。

任務框可以輸入:

| 輸入 | 會發生什麼 |
|---|---|
| `修好那個壞掉的測試` | 送給真的 agent |
| `/demo`、`/fail` | 腳本演出,一次成功、一次失敗 |
| `/flow 第一步 >> 第二步 >> 第三步` | 接力賽:各步驟在同一個 session 裡依序執行,畫面上有「2/3」徽章。哪一步失敗就停 |

選單的主要項目:餵任務、示範表演、外表、寵物日記、睡覺、比賽、新增一隻寵物、大小、永遠在最上層、唸出台詞 (TTS)、自由走動・互動、離開。

## ヒカリ與ノゾミ

預設的兩隻是《蔚藍檔案》的橘家雙胞胎:ヒカリ(Hikari)淡定,會在帽簷敬禮;ノゾミ(Nozomi)綁側馬尾,笑起來露虎牙。`scripts/pets/` 裡的腳本畫出每一格動畫,每隻都有兩種畫風,在選單的「外表」切換:

- 插畫風(`hikari`、`nozomi`,預設):平滑的 Q 版插畫。`draw_twins_hd.py` 先用 4 倍大小畫每一格,再縮小讓邊緣平滑,最後加上貼紙描邊。
- 像素風(`hikari-pixel`、`nozomi-pixel`):`draw_twins.py` 畫出 48×52 的像素圖並放大 4 倍,邊緣保持銳利。預覽動畫在 `docs/pets/*-pixel.gif`。

兩種都是 Codex 角色包 v2 格式:`pets/<id>/pet.json` 加一張 8×11 格的 `spritesheet.webp`。[awesome-codex-pet](https://github.com/legeling/awesome-codex-pet) 用的也是這個格式。v2 角色包有 16 個看的方向,所以閒著的寵物會轉頭跟著你的滑鼠看。

- 想在 Codex 裡也用,執行 `npm run pets:install-codex`,它會複製到 `~/.codex/pets/`,再到 Codex 設定裡選。
- 改了腳本想重畫,執行 `npm run pets:draw`,需要 Python 和 Pillow。
- 這些是同人二創,詳見 [ASSETS-LICENSE.md](ASSETS-LICENSE.md)。角色版權屬於 NEXON Games 和 Yostar,圖片僅限非商業使用。

## DeepSeek娘、芙蘭朵露與蕾米莉亞

另外內建三隻:DeepSeek娘(穿女僕裝的鯨魚女孩,是 DeepSeek 模型的同人看板娘),以及《東方 Project》的斯卡雷特姊妹:芙蘭朵露和蕾米莉亞。在選單的「外表」裡選。

<p align="center"><img src="docs/guests.png" width="100%" alt="DeepSeek娘、芙蘭朵露、蕾米莉亞的待機、讀檔、打字、要權限、開心、思考"></p>

這三隻是「圖片外表」,不是 sprite sheet:`pets/<id>/` 裡每個動作一張 PNG,所以不會轉頭、也沒有逐格動畫,改用跳、抖、搖來表現。圖是用 AI 產圖工具照「動作格子圖」的 prompt 產生,再用 `scripts/pets/import_sheet.py` 切開。原始格子圖放在 `scripts/pets/sheets/`。重新產生的方式:

```bash
python scripts/pets/import_sheet.py scripts/pets/sheets/flandre-main.jpg flandre --out pets --name "フランドール" \
    --poses idle,reading,typing,tugging,happy,sick,sleeping,thinking \
    --also scripts/pets/sheets/flandre-extra.jpg 4x2 _,hammering,peeking,_,sulking,_,levelup \
    --also scripts/pets/sheets/flandre-extra2.jpg 4x2 ref,bored,working,_,ref
```

`--also` 會把第二張格子圖加進同一個外表,並把角色縮放成跟第一張一樣大;`_` 代表跳過那一格,`ref` 代表這格只拿來對齊大小、不輸出。這些是同人二創,僅限非商業使用,詳見 [ASSETS-LICENSE.md](ASSETS-LICENSE.md)。

## 多隻寵物與比賽

選單的「新增一隻寵物」會在桌面多放一隻。每隻都有自己的 agent、workspace、外表和存檔。「比賽」會把同一個任務同時丟給所有閒著的寵物,最先完成的拿到獎盃和 15 點額外 XP,其他的生悶氣。想讓不同的 agent 互相比,就在設定檔裡給每隻寵物填不同的 `agent`。

## 桌面上的生活

像經典的 [Shimeji](https://kilkakon.com/shimeji/) 一樣,你忙別的事時,寵物也會自己動:

- 牠們會沿著螢幕底部來回散步,高度維持在你放下的位置。
- 兩隻閒著的寵物會走到彼此身邊聊天。ヒカリ和ノゾミ有專屬的雙胞胎對話,芙蘭朵露和蕾米莉亞也有姊妹對話。
- 滑鼠靠近時,牠們有時會轉過來打招呼。
- 偶爾會自言自語。DeepSeek娘、芙蘭朵露、蕾米莉亞有各自的台詞。
- 你在打字時,牠們會待在原地,偶爾幫你加油。「打字」的判斷方式是:系統偵測到鍵盤輸入,而且滑鼠連續 3 秒沒動。

工作中、舉著權限牌時、被拖曳時,以及被你放下後的一分鐘內,牠們會待在原地。滑鼠停在寵物上也會讓牠不走開。選單的「自由走動・互動」可以把這些全部關掉,也可以在設定檔寫 `"wander": false`。

### 玩遊戲的時候

在 Windows 上,全螢幕遊戲開著時寵物會自動讓開:縮成一半大小、排在螢幕右下角、不走動也不說話,唸台詞也會暫停。遊戲關掉後就回到原本的位置。如果有任務在跑,任務會繼續,權限牌也照樣會出現(只是比較小)。

程式每 3 秒問一次 Windows 現在是不是有全螢幕的東西佔住畫面(Windows 自己的勿擾功能也是用這個判斷)。無邊框視窗模式的遊戲不算全螢幕,可以在設定檔用執行檔名稱列出來,例如 `"gameProcesses": ["Genshin.exe"]`。選單的「玩遊戲時縮到角落」或設定檔的 `"gameMode": false` 可以關掉這個功能。全螢幕看影片、簡報也會被當成全螢幕。

## 外表(skin)

選單的「外表」可以換寵物的樣子。共有三種:

1. 內建外表:ヒカリ、ノゾミ、DeepSeek娘、芙蘭朵露、蕾米莉亞,以及五種顏色的程式小雞(小黃雞、雪白鴨、薄荷史萊姆、櫻花雞、夜貓)。小雞有手繪的道具,例如書、鍵盤、榔頭。
2. 你自己的圖片。在 `~/.acp-pet/skins/` 建一個資料夾,每個動作放一張圖。支援 PNG、GIF(動畫也可以)、WebP、JPG。只有 `idle` 是必要的,缺少的動作會自動換用別的動作:

   ```
   ~/.acp-pet/skins/my-cat/
   ├── idle.gif        必要
   ├── working.gif     思考、讀檔、打字、敲榔頭、偷看時使用
   ├── happy.png       升級時也用
   ├── sick.png        生悶氣時也用
   ├── reading.png     任何動作名稱都能覆蓋預設(見上面的表)
   └── skin.json       選填:{ "name": "My cat", "pixelated": true }
   ```

   圖片外表沒有手繪道具,寵物會用徽章和動作(跳、抖、搖)表示它在做什麼。
3. Codex 角色包。把角色包資料夾(`pet.json` 加每格 192×208 的 spritesheet;v1 是 8×9,v2 是 8×11)放進 `~/.acp-pet/skins/`,直接就能用,所以 [awesome-codex-pet](https://github.com/legeling/awesome-codex-pet) 或 [OpenPet](https://github.com/dengyie/OpenPet) 上的角色都可以拿來用。

選單每次打開都會重新讀取資料夾,新加的外表不用重開就會出現。超過 8 MB 的圖片,以及指到外表資料夾之外的路徑,都會被拒絕。

## 在 VS Code 裡

`vscode/` 裡還有一個 VS Code 版。寵物住在檔案總管側邊欄最下面的「Kanban Musume」面板,而且角色會輪流上場:每 5 分鐘換下一個,上場時會打招呼。任務做到一半或舉著權限牌時不會換。

牠會對這些事情有反應:

- 你自己的編輯:你打字牠跟著打字,出現新的錯誤會生病、錯誤全部清掉會開心,跑 task 時敲榔頭,偵錯時拿望遠鏡。
- 給 agent 的任務:在指令面板執行「Kanban Musume: 餵任務給寵物」,或在寵物上雙擊。agent 會在你開的第一個資料夾裡工作。跟桌面版不同,這是你真正的專案,所以權限牌很重要:修改檔案和執行指令一樣要你在面板裡按「准」。
- 點擊:跟桌面版一樣(摸頭、戳臉頰)。按右鍵會開一個小選單。

沒有上架 Marketplace。請從 Releases 下載 `.vsix` 安裝(見[快速開始](#快速開始vs-code)),或從這個 repo 直接執行:

```bash
npm install
npm run vscode:build
code --extensionDevelopmentPath="$PWD/vscode"
```

這會另外開一個載入了擴充套件的 VS Code 視窗。`npm run vscode:package` 會打包出 `.vsix`(Windows PowerShell 如果因為「已停用指令碼執行」擋掉 `npm`,改打 `npm.cmd`)。設定(搜尋 `acpPet`):

- `acpPet.characters`:輪流上場的角色,照順序。預設是 `deepseek`、`flandre`、`remilia`、`hikari-art`、`nozomi-art`。沒安裝的會自動跳過。
- `acpPet.rotateMinutes`:幾分鐘換一次。`0` 代表不換。
- `acpPet.agent`:跑任務的 acpx agent,預設 `claude`。改了之後要重新載入視窗。
- `acpPet.reactToEditor`:關掉對你自己編輯動作的反應。
- `acpPet.permissionTimeoutSec`:權限牌幾秒沒回應就當作「不准」。

### 編輯器裡的角色

跟 [doki-theme](https://github.com/doki-theme/doki-theme-vscode) 一樣,擴充套件也可以把角色直接放進編輯器:她站在右下角,後面是淡淡的背景插畫。在指令面板執行「Kanban Musume: 把角色放進編輯器」,再重新載入視窗。

- 她會呼吸晃動,你打字時跟著打字,點她會有反應(摸頭、戳臉頰;幾秒內連點五下會生氣)。
- 她會沿著視窗底部走來走去。可以把她拖到任何地方,她會記住位置(拖離底部的話她就待在原地)。在她身上按右鍵換下一個角色。
- 角色放進編輯器後,側邊欄的面板會隱藏;agent 要權限時,改成跳出 VS Code 通知,一樣有「准」「不准」兩個按鈕。
- 10 分鐘沒碰鍵盤滑鼠她會睡著,你回來就會醒。偶爾會自言自語。
- 每隔幾分鐘(`acpPet.rotateMinutes`)換下一個角色,背景也跟著換。

只會用圖片角色:內附的 DeepSeek娘、芙蘭朵露、蕾米莉亞、ヒカリ、ノゾミ(`hikari-art`、`nozomi-art`),以及你放進 `~/.acp-pet/skins` 的圖片資料夾。內附的角色都附有背景圖,放在 `pets/<id>/background.png`。想換成自己的,放一張 `~/.acp-pet/backgrounds/<id>.png`(或 `.webp`、`.jpg`),會優先使用。請用去背、背景透明的圖,跟 doki-theme 一樣;`python scripts/pets/cut_background.py art.jpg deepseek` 可以把純白的底去掉(黑底加 `--backdrop black`,兩種都有用 `both`)。沒有純色底的完整場景圖,用 `--backdrop none --feather 0.15` 讓四邊淡出,不會變成一個方框;人物被圖片下緣切到的話加 `--no-bottom`,避免下緣淺色的皮膚被當成背景去掉。`acpPet.editor.backgroundOpacity` 調背景的明顯程度(預設 0.12,0 就是不顯示),`acpPet.editor.height` 調角色大小。

做法是改 VS Code 自己的一個檔案(`workbench.html`):加一行 script 和旁邊一個放圖片的資料夾,並更新 `product.json` 裡這個檔案的檢查碼,這樣 VS Code 就不會說安裝已損毀。VS Code 更新後這個修改會消失,擴充套件會發現並問你要不要放回去。想還原,請在解除安裝擴充套件之前執行「Kanban Musume: 把角色從編輯器移除」。

VS Code 版的寵物有自己的存檔 `~/.acp-pet/vscode-save.json`,等級跟桌面版的寵物分開算。

## 在 Orca 裡

[Orca](https://orca.build) 狀態列有自己的寵物,會依 agent 的狀態(工作中、等你回覆、完成、失敗)做出反應。它也能載入這些角色:

```bash
python scripts/pets/make_orca_bundle.py      # 為每個圖片角色產生 dist-orca/<id>/
```

接著在 Orca 狀態列的寵物選單匯入寵物包(pet bundle),選 `dist-orca/<id>/pet.json`。每個寵物包會把角色的動作轉成 Orca 的動畫(待機、走路、揮手、跳、失敗、等待、工作中、檢查),每格 320x400。Orca 的寵物沒有背景插畫,也不會自動輪替角色,要在它的選單裡換。

## 設定

第一次啟動時,程式會寫出 `~/.acp-pet/config.json`:

```json
{
  "pets": [
    { "id": "pet1", "name": "ヒカリ", "agent": "claude", "workspace": "C:\\Users\\you\\acp-pet-workspace", "skin": "hikari" }
  ],
  "permissionTimeoutSec": 60,
  "scale": 1,
  "alwaysOnTop": true,
  "tts": false,
  "wander": true,
  "gameMode": true,
  "gameProcesses": []
}
```

- `agent` 可以是任何 [acpx 的 agent 名稱](https://github.com/openclaw/acpx),例如 `codex` 或 `gemini`。該 agent 必須已經安裝並登入。
- `workspace` 是 agent 工作的資料夾。每隻寵物請各用一個獨立的練習用資料夾。
- `scale`(0.75、1、1.25、1.5 或 2)、`alwaysOnTop`、`tts`(把對話框的台詞唸出來)、`wander` 和 `gameMode` 也可以從選單改。
- `gameProcesses` 用執行檔名稱(`Genshin.exe` 或 `genshin`)列出要額外偵測的遊戲,程式啟動時讀取。
- 舊的 v0.1 設定檔(`{ "agent", "workspace" }`)會自動轉換。

## 安全

acpx 不是沙箱,所以寵物自己加了幾道防護:

- 權限預設拒絕。讀取、搜尋、思考會自動放行。其他動作(編輯、執行、fetch 等)都要你按「准」。逾時沒回應就視為拒絕。
- acpx 的 client 端檔案與終端機 callback 都關掉了,所以 `request_permission`,也就是寵物舉的牌子,是唯一的關卡。
- 每隻寵物的 `workspace` 必須是專用資料夾。程式會拒絕你的家目錄、磁碟根目錄、`~/.ssh`、`~/.aws`、`~/.gnupg`、`~/.config` 和 `~/.acp-pet`。
- `/flow` 接力賽是跑在寵物自己的 session 上,而不是 acpx 的 `FlowRunner`,因為 `FlowRunner` 沒有權限 callback,會繞過牌子。
- 想要真正的隔離,請用另一個使用者帳號或容器來執行 agent。

## 程式架構

```
acpx runtime ─ AcpRuntimeEvent ─▶ AcpEventNormalizer ─ PetEvent ─▶ PetBrain ─ PetSnapshot ─▶ renderer (sprite / skin)
      ▲                                                                ▲
      └──── onPermissionRequest ──▶ PermissionGate ──── sign ──────────┘ ◀── 准 / 不准
```

| 檔案 | 用途 |
|---|---|
| `src/core/acp-source.ts` | 唯一接觸 acpx 的檔案。acpx 還沒到 1.0,所以把耦合集中在一處 |
| `src/core/brain.ts` | 狀態機:把事件對應成動作,並記錄寵物的數值。它自己沒有時鐘,所以行為是確定的 |
| `src/core/permission.ts` | 預設拒絕的權限閘門,有逾時 |
| `src/core/controller.ts` | 把一隻寵物接起來,也負責接力賽。不含 Electron 程式碼 |
| `src/core/race.ts` | 比賽裁判 |
| `src/core/ambient.ts` | 決定下一個要散步、聊天還是打招呼的是誰 |
| `src/core/skins.ts` | 載入外表:換色、圖片資料夾、Codex 角色包(v1 與 v2) |
| `src/core/look.ts` | v2 的轉頭看:滑鼠角度對應到 16 格其中之一 |
| `src/core/game.ts` | 判斷「是不是在玩遊戲」「是不是在打字」的規則 |
| `src/core/fake-source.ts` | `/demo` 和 `/fail` 用的腳本演出 |
| `src/main/` | Electron 端:每隻寵物一個透明、可穿透點擊的視窗,還有托盤、選單、設定,以及偵測遊戲和打字的 `game-watch.ts` |
| `src/renderer/` | 用程式畫的像素 sprite、外表顯示、對話框、權限牌、唸台詞 |
| `pets/` | 內附的寵物:ヒカリ和ノゾミ(插畫版與像素版),DeepSeek娘、芙蘭朵露、蕾米莉亞(圖片外表) |
| `scripts/pets/` | 畫雙胞胎 sprite sheet、把動作格子圖切成圖片外表的 Python 腳本 |
| `vscode/` | VS Code 擴充套件:側邊欄 webview、角色輪替、對編輯動作的反應。共用 `src/core` |

## 測試

```bash
npm test          # 單元與整合測試
npm run smoke     # 啟動真正的 Electron 程式並跑約 30 項檢查,截圖放在 smoke-out/
npm run vscode:test   # 第一次會另外下載一份 VS Code 到 .vscode-test/,用用完即丟的設定檔開啟擴充套件,檢查面板、換角色、打字反應和一次 /demo 任務
ACP_PET_LIVE=1 npx vitest run test/live.test.ts   # 在暫存資料夾驅動真的 agent:一個 turn 加一次兩步的接力(會用掉 agent 額度)
```

## 致謝

- [acpx](https://github.com/openclaw/acpx):ACP runtime
- [qq-slime-pet](https://github.com/DTSFO/qq-slime-pet):用程式畫 sprite,以及點擊穿透的判斷技巧
- [Shimeji](https://kilkakon.com/shimeji/):桌寵自己走動的點子
- [vscode-pets](https://github.com/tonybaloney/vscode-pets) 和 [doki-theme-vscode](https://github.com/doki-theme/doki-theme-vscode):在 VS Code 裡放寵物和角色的點子
- [awesome-codex-pet](https://github.com/legeling/awesome-codex-pet):Codex pet v2 格式
- [OpenPet](https://github.com/dengyie/OpenPet):Codex 角色包的資料夾結構
- [codex-has-a-pet-too](https://github.com/ChenxiChu001/codex-has-a-pet-too) 和 [miku-on-desktop](https://github.com/thunguo/miku-on-desktop):啟發這個專案的其他 agent 寵物

## 授權

程式碼:MIT。ヒカリ和ノゾミ的圖片是《蔚藍檔案》同人二創,僅限非商業使用,詳見 [ASSETS-LICENSE.md](ASSETS-LICENSE.md)。

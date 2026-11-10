# Kanban Musume for VS Code

[English](README.md) | **繁體中文**

住在你編輯器裡的動漫角色。她站在右下角,後面是她自己的淡化插畫;她會沿著視窗底部走來走去,你打字時跟著打字,點她會有反應。每隔幾分鐘換下一個角色上場。

這是 [Kanban Musume](https://github.com/KJLavender/kanban-musume) 的 VS Code 部分。

## 開始使用

1. 從[最新版本](https://github.com/KJLavender/kanban-musume/releases/latest)下載並安裝 `kanban-musume-vscode-0.2.0.vsix`:在「擴充功能」點 `...`,選「從 VSIX 安裝...」。或執行 `code --install-extension kanban-musume-vscode-0.2.0.vsix`。
2. 按 `Ctrl+Shift+P`,執行「Kanban Musume: 把角色放進編輯器」,按「繼續」,再按「重新載入視窗」。

## 跟她玩

- 點她的頭是摸頭,也可以戳臉頰。幾秒內連點五下她會生氣。
- 可以把她拖到任何地方,她會記住位置。在她身上按右鍵換下一個角色。
- 10 分鐘沒碰鍵盤滑鼠她會睡著,你回來就會醒。偶爾會自言自語。

角色:DeepSeek娘、芙蘭朵露和蕾米莉亞(東方 Project)、ヒカリ和ノゾミ(蔚藍檔案)。每個都附有自己的背景圖;想換成自己的,放一張 `~/.acp-pet/backgrounds/<id>.png`。這些是 AI 產生的同人圖,僅限非商業使用,詳見 ASSETS-LICENSE.md。

## 丟任務給 coding agent(選用)

「Kanban Musume: 餵任務給寵物」會透過 [acpx](https://github.com/openclaw/acpx) 把任務交給 coding agent(預設 Claude Code,要先安裝並登入)。agent 會在你開的第一個資料夾裡工作。它要修改檔案或執行指令時,會跳出通知讓你按「准」或「不准」;你同意之前什麼都不會發生,60 秒沒回應就當作「不准」。

## 設定

在設定裡搜尋 `acpPet`。改了之後 VS Code 會問要不要更新角色,按「更新」再重新載入。

- `acpPet.characters`:輪流上場的角色,照順序。
- `acpPet.rotateMinutes`:幾分鐘換一次(預設 5)。`0` 代表不換。
- `acpPet.editor.backgroundOpacity`(預設 0.12)和 `acpPet.editor.height`(預設 220):背景的明顯程度和角色大小。
- `acpPet.agent`、`acpPet.reactToEditor`、`acpPet.permissionTimeoutSec`:跑任務的 agent、側邊欄面板的反應、權限逾時秒數。

## 原理與移除

跟 doki-theme 一樣,這會改 VS Code 自己的一個檔案(`workbench.html`)並更新它的檢查碼,所以 VS Code 不會說安裝已損毀。VS Code 更新後修改會消失,擴充套件會問你要不要放回去。解除安裝前,請先執行「Kanban Musume: 把角色從編輯器移除」還原原本的檔案。

這個安裝檔是在 Windows 上打包的,裡面有 acpx 相依套件的 Windows 專用檔案。

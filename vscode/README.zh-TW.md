# ACP Pet for VS Code

[English](README.md) | **繁體中文**

住在檔案總管側邊欄的小寵物。你在編輯器裡做什麼,牠就演什麼;你丟任務給 coding agent 時,牠也會演出 agent 正在做的事。好幾個角色會輪流上場:每隔幾分鐘換下一個,上場時會打招呼。

這是 [acp-pet](https://github.com/KJLavender/acp-pet) 的 VS Code 版。acp-pet 是給支援 ACP(Agent Client Protocol,讓程式和 coding agent 溝通的標準)的 agent 用的桌面寵物。

## 牠會做什麼

- 你打字時跟著打字。出現新的錯誤會生病,錯誤全部清掉會開心。
- 跑 task 時敲榔頭,結束後依結果開心或生病。偵錯時拿望遠鏡。
- 在指令面板執行「ACP Pet: 餵任務給寵物」,或在寵物上雙擊,就能給牠任務。agent 會在你開的第一個資料夾裡工作。agent 要修改檔案或執行指令時,寵物會在面板裡舉牌,你按「准」之前什麼都不會發生。60 秒沒回應就當作「不准」。
- 點寵物可以摸牠:摸頭、戳臉頰。幾秒內連點五下會生氣。按右鍵開選單。

角色:ヒカリ和ノゾミ(蔚藍檔案)、DeepSeek娘、芙蘭朵露和蕾米莉亞(東方 Project),還有用程式畫的小雞。這些是同人圖,僅限非商業使用,詳見 ASSETS-LICENSE.md。

## 編輯器裡的角色

執行「ACP Pet: 把角色放進編輯器」再重新載入視窗,角色就會站在編輯器右下角,後面是淡淡的背景插畫,跟 doki-theme 一樣。可以點她、拖她,按右鍵換下一個。你打字她跟著打字,你離開她會睡著,角色每幾分鐘輪流上場。背景圖是去背的圖片,放在 `~/.acp-pet/backgrounds/<id>.png`。

這會改 VS Code 的 `workbench.html`(以及它的檢查碼,所以不會跳出「已損毀」警告)。解除安裝前請先執行「ACP Pet: 把角色從編輯器移除」。VS Code 更新後,擴充套件會問你要不要放回去。

## 設定

在設定裡搜尋 `acpPet`。

- `acpPet.characters`:輪流上場的角色,照順序。`~/.acp-pet/skins` 裡的資料夾也可以用。
- `acpPet.rotateMinutes`:幾分鐘換一次(預設 5)。`0` 代表不換。
- `acpPet.agent`:跑任務用的 agent(預設 `claude`,也可以用 `codex`、`gemini` 等 [acpx](https://github.com/openclaw/acpx) 支援的 agent)。要先安裝並登入。改了之後要重新載入視窗。
- `acpPet.reactToEditor`:關掉對你自己編輯動作的反應。
- `acpPet.permissionTimeoutSec`:權限牌幾秒沒回應就當作「不准」。
- `acpPet.editor.backgroundOpacity`(預設 0.12)和 `acpPet.editor.height`(預設 220):編輯器角色的背景明顯程度和大小。

## 安裝

在 acp-pet repo 裡用 `npm run vscode:package` 打包,再安裝產生的 `.vsix`:

```bash
code --install-extension vscode/acp-pet-vscode-0.1.0.vsix
```

這個安裝檔是在 Windows 上打包的,裡面有 acpx 相依套件的 Windows 專用執行檔,所以請在你要用的作業系統上打包。

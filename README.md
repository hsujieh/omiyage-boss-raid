# OMIYAGE Boss Raid

Artale 工會 **OMIYAGE** 每週打王約時間工具。依 Artale 週期（週二～隔週一）自動開本週、清除舊週；列表可新增多團、進團填空檔與報名。全程免費方案。

- 前端託管：**GitHub Pages**（`https://帳號.github.io/omiyage-boss-raid/`）
- 資料同步：**Firebase Firestore** Spark 免費方案
- 不需購買網域

未設定 Firebase 時會自動進入**本機模式**（資料存在瀏覽器）。

## 功能

- 每週二自動開新週，並預設建立「幾月/幾日到幾月/幾日-一團」；進入網站時刪除上一週資料
- 列表頁查看／新增本週各團（第二團起手動開）
- **進入團內**再填該團空檔（週二～隔週一 × 08:00–24:00）與報名
- 依該團重疊熱力統計熱門時段（僅供參考，不需選定）
- 加入／退出／滿員／刪除團
- 暱稱進入（本機記住）；可選 **LINE LIFF** 自動帶入 LINE 顯示名稱
- 單一工會站點（預設 guild id：`omiyage`，可用 `VITE_GUILD_ID` 覆寫）

## 本機開發

```bash
npm install
cp .env.example .env   # 可先不填，用本機模式
npm run dev
```

## 設定 Firebase（工會共享必要）

1. 到 [Firebase Console](https://console.firebase.google.com/) 建立專案（選 Spark 免費方案）
2. 新增 Web 應用程式，複製設定到專案根目錄 `.env`：

```env
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_GUILD_ID=omiyage
VITE_LIFF_ID=   # 選填，見下方 LINE
```

3. 建立 **Cloud Firestore**
4. 規則可先用：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /guilds/{guildId}/{document=**} {
      allow read, write: if true;
    }
  }
}
```

> Web API Key 本來就會出現在前端；請勿把網站連結隨意公開。

## 設定 LINE（選填，免手動暱稱）

用免費的 [LINE Developers](https://developers.line.biz/) + **LIFF**，自動帶入 LINE 顯示名稱：

1. 建立 Provider → 建立 **LINE Login** 頻道  
2. 在頻道裡新增 **LIFF app**  
   - Size：Full  
   - Endpoint URL：你的網站網址（例如 `https://帳號.github.io/omiyage-boss-raid/`）  
   - Scope：勾選 `profile`  
3. 複製 LIFF ID，寫進 `.env`：`VITE_LIFF_ID=...`  
4. 部署時也把 `VITE_LIFF_ID` 加到 GitHub Actions secrets  

成員用 LINE 內建瀏覽器打開連結即可自動帶名稱；未設定 LIFF 時仍可手動輸入暱稱。

> **本機 `localhost` 無法用 LIFF 登入**（Endpoint 需 HTTPS，且 `redirectUri` 必須符合 Console 設定，否則會 400）。本機開發請用暱稱；要測 LINE 請開正式站或 `https://liff.line.me/{LIFF_ID}`。

## 部署到 GitHub Pages（免費）

### 方式 A：GitHub Actions（建議）

1. 推到 GitHub，**repo 名稱請用 `omiyage-boss-raid`**（與 `vite.config.ts` 的 `base: '/omiyage-boss-raid/'` 一致）
2. **Settings → Pages** → Source 選 **GitHub Actions**
3. 新增 Actions secrets：六個 `VITE_FIREBASE_*`（可選 `VITE_GUILD_ID`、`VITE_LIFF_ID`）
4. 推到 `main` / `master` 後自動上線
5. 網址：`https://你的帳號.github.io/omiyage-boss-raid/`

### 方式 B：本機指令

```bash
npm run deploy
```

## 使用方式

1. 開啟網站（有設 LINE 會自動帶顯示名稱；否則手動輸入暱稱）
2. 點預設「日期-一團」或「新增團」進入
3. **在團內**標記空檔 → 看重疊統計決定何時打王

## 技術

Vue 3 + Vite + TypeScript + Vue Router + Firebase Firestore + LINE LIFF（選用）

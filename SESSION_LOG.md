# Session Log

> Latest update:
> Production is live on `morozoveuroparty.ru`. The active workstream is the companion UX in `vote/acts`: modal sheet, notes, draft ranking state, and responsive layout.

## 2026-03-25

### Compact Vote List Pass

- Added a new compact `acts` render path in `VoteStudio` and switched the tab to use it
- Tightened the mobile ranking rows so they behave more like a dense list than tall cards
- Kept the existing ranking logic intact:
  - same `ranking`
  - same `placed acts`
  - same auto-shift behavior
- Reduced visual weight of the top ranking summary and sticky submit block
- Made search lighter with smaller icon spacing and tighter input padding
- Preserved drag-and-drop for already placed acts
- Local `next build` passed after the refactor

## 2026-03-24

### Latest UX pass

- Reworked `VoteStudio` around an explicit empty ranking state:
  - quick place select is now available directly in the acts list
  - artist sheets no longer pretend that the ranking is filled before the user starts
  - a separate `placed acts` state now tracks which artists were actually assigned by the user
- Added ranking reset with confirmation; notes stay intact
- Added YouTube video action and helper copy in artist sheets
- Lightened rank controls in the modal and in the order screen
- Synced the new ranking semantics into `ActsDirectory`
- Improved `BottomSheet` sizing and close-button hit area again
- Local build passed after this pass

### Что сделали

- перевели заметки на мультивыбор тегов
- несколько раз доработали `BottomSheet`
- упростили карточку артиста внутри `vote`
- уменьшили теги заметок
- расширили поле заметки
- добавили подписи в выборе места
- разделили черновой порядок и реальный личный рейтинг
- выкатили правки на прод

### Последние прод-коммиты

- `3f6b9c5` — `Fix vote sheet labels and rank controls`
- `59beae3` — `Fix draft ranking state and responsive sheet layout`

### Что уже в проде

- сайт отвечает по `https://morozoveuroparty.ru`
- API отвечает по `https://api.morozoveuroparty.ru`
- деплой через Docker Compose стабилен
- основной риск сейчас не в инфраструктуре, а в UX пользовательского сценария

### С чем продолжать завтра

- вручную прогнать `/{roomSlug}/vote/{stageKey}` на ПК
- отдельно прогнать тот же сценарий на телефоне
- добить responsive layout модального окна
- ещё раз проверить логику черновика
- решить, оставляем ли native `select` или заменяем его на кастомный выбор места

## 2026-03-23

### Что делали

- привели карточки артистов к более чистой структуре
- убрали дубли текста
- ослабили overlay на фото
- вернули локальные изображения артистов
- исправляли bottom sheet и заметки
- поправили текст `Об исполнителе`
- выкатили проект в прод на `morozoveuroparty.ru`

### Что уже в проде

- сайт отвечает по HTTPS
- API отвечает по HTTPS
- карточки артистов рендерятся с локальными фото
- acts/vote/live/admin маршруты доступны

### На что смотреть дальше

- заметки на ПК и телефонах
- удобство bottom sheet
- насыщенность биографий артистов
- финальный блок про результат полуфинала

## 2026-03-24

### Vote Flow Pass

- rebuilt `VoteStudio` around a lighter mobile-first ranking flow
- changed the main `acts` tab from tall editorial cards into compact ranking rows
- simplified the `order` tab so it shows only explicitly placed acts instead of duplicating the full acts list
- added drag-and-drop reordering for placed acts with `@dnd-kit`
- added a larger `row` poster mode for faster artist recognition in dense lists
- removed fake occupied labels for untouched places; empty slots now read as free
- kept notes inside the artist card, but exposed note state and note summary directly in the list/order rows
- then simplified the IA one step further:
  - the `acts` tab now contains the working ranking flow directly
  - current placed acts appear first and are reorderable there
  - remaining unplaced acts stay below as the add-to-ranking list
  - the separate `order` tab was effectively removed from the main UX path

### Manual Check Next

- real-phone test for drag-and-drop feel
- dropdown clarity on narrow screens
- whether the compact top stats and tab switcher still feel too tall
- whether the modal needs one more pass on vertical spacing

### 2026-03-24 late pass

- tightened the main vote list to reduce mobile card height
- removed editorial note-summary text from the main ranking rows
- made quick actions denser:
  - smaller select
  - smaller card-entry button
  - compact drag handle in placed rows
- increased row poster presence without keeping the whole row oversized
- split the acts tab visually into:
  - already placed acts
  - still unplaced acts
- kept drag-and-drop inside the main acts flow instead of pushing it behind a separate ranking screen
- follow-up pass:
  - made country read before artist name in the vote rows
  - compressed row typography and action width even further for phone screens

### 2026-03-24 compact ranking pass

- removed the heavy place `select` from the main vote list
- kept drag-and-drop as the main reorder action for already placed acts
- moved precise place picking back into the artist card sheet
- changed unplaced rows into a simpler `add to ranking + tap for details` flow
- moved the flag out of the row poster so it no longer covers artists' faces
- increased left padding in the search field to stop the icon colliding with placeholder text on mobile

### 2026-03-24 artist card cleanup pass

- rebuilt the `vote` artist sheet around a compact mobile-first header:
  - row-style poster instead of a giant card poster
  - country badge, current place chip, artist, and song in a tighter top block
- reworked `BottomSheet` header and safe-area padding:
  - the close button now sits in a proper sticky header row
  - more bottom padding for iPhone browser chrome and longer sheets
- replaced the native place `select` inside the artist sheet with a custom scrollable place picker list
  - current place is visible on the trigger
  - options now show place number, country + flag, artist, and song when occupied
  - free places no longer look like mysterious empty native options
- moved direct links higher in the artist sheet:
  - direct official profile link is shown before notes
  - direct video button is shown only when a real `videoUrl` exists
  - stopped relying on the YouTube search fallback inside this modal
- reduced the notes textarea height on mobile and tightened the search field icon spacing

### 2026-03-24 sheet scroll lock pass

- reworked `BottomSheet` into a bounded mobile sheet with a dedicated inner scroll area
- switched body scroll lock from `overflow: hidden` only to a fixed-body lock that restores the previous page scroll
- added clearer screen padding and a stronger bottom safe-area so the sheet no longer feels cut off against browser chrome

### 2026-03-24 direct video + reachable notes pass

- strengthened `BottomSheet` again:
  - blocks wheel scroll outside the sheet
  - blocks touch overscroll bounce more aggressively
  - adds a more explicit lower edge with border + gradient
- added a new Next route: `frontend/app/api/video-link/route.ts`
  - tries to resolve a direct YouTube watch URL from the artist/song/country query
  - falls back to YouTube search results only if direct parsing fails
- changed `buildActVideoUrl` so artist cards now point to the resolver route instead of raw search results
- repacked the `vote` artist sheet:
  - tighter top summary block
  - compact ranking controls
  - notes/tags moved higher and kept reachable earlier in the scroll
  - direct YouTube CTA shown before the long background/facts section
  - optional official profile kept only as a quieter secondary link

### 2026-03-24 sheet rollback + official YouTube import pass

- relaxed the `BottomSheet` touch lock again after the iPhone regression:
  - removed the `body.touchAction = none` freeze
  - stopped drawing the harsh light borders around the sheet
  - kept the page locked behind the sheet while allowing the inner scroller to breathe again
- imported the official direct YouTube song links from `eurovision_2026_official_youtube_links.xlsx`
  into `backend/backend_core/participants_2026.json`
- extended `backend/backend_core/catalog.js` so every act payload can now expose `videoUrl`
  directly from the backend instead of relying only on runtime search fallback

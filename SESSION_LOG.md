# Session Log

> Latest update:
> Production is live on `morozoveuroparty.ru`. The active workstream is the companion UX in `vote/acts`: modal sheet, notes, draft ranking state, and responsive layout.

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

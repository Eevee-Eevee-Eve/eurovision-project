# Known Issues

> Current focus:
> `vote/acts` UX on real screens. Infrastructure and deploy are stable enough; the main remaining risk is the companion flow itself.

## 2026-04-02 homepage and sheet risks

- The new landing page now gates room actions behind account auth.
  - need a real-user check that this feels helpful rather than blocking
- The separate `join room` card was removed in favor of active-room search.
  - verify this is enough when several temporary rooms are alive at once
- `BottomSheet` close button alignment was corrected again.
  - confirm the round button looks centered and unclipped on small iPhones
- The stronger `Open room` CTA now carries more glow/animation.
  - verify it reads as primary without looking noisy against the hero

## 2026-04-02 single-list vote risks

- The voting page now aims to be one list only.
  - need real-device confirmation that users understand drag-and-drop immediately without the removed page-level tabs
- Search now coexists with drag-and-drop more conservatively.
  - verify that disabling smooth reordering while search is active feels understandable, not broken
- The page-level auth form was removed from `vote`.
  - confirm the new homepage-first auth flow is enough for first-time users
- The artist card still carries precise place controls.
  - verify they feel secondary and not conflicting with the main drag-and-drop path

## 2026-03-25 new room flow risks

- Temporary rooms are new and need a real end-to-end smoke test:
  - create open room
  - create password-protected room
  - unlock room from a second browser/device
  - make sure `vote`, `live`, `players`, and `room` all respect the room password gate
- Room inactivity cleanup needs runtime verification on the deployed server:
  - confirm a temporary room survives while a socket is connected
  - confirm it disappears after the idle timeout when nobody is inside
- `RoomChrome` now performs an access check before rendering child routes.
  - this needs a real UX pass for loading / locked / missing-room states on phone and desktop
- The new landing page and room page were simplified heavily.
  - need a design pass on spacing, copy, and visual hierarchy after real-device review

## 2026-03-26 room-first IA risks

- The new home page now prioritizes `Create room` / `Join room`.
  - need a live check that first-time users really understand the flow without additional explanation
- `RoomChrome` top navigation now hides `Acts` / `Players` from the primary row.
  - make sure no important user path was accidentally made too hard to discover
- `RoomLanding` now behaves more like a session container than a feature hub.
  - needs a phone + desktop pass for hierarchy, spacing, and clarity
- The join-room input accepts full URLs and room slugs.
  - verify odd pasted values and whitespace trimming on real devices

## Актуальные

- Need a real device smoke test for the new `placed acts` model:
  - quick place select from the acts list
  - reset ranking flow
  - modal/list sync after moving one artist onto an occupied slot
- Need a real-device check for the latest mobile ranking split:
  - `add to ranking` from the list
  - drag-and-drop for already placed acts
  - precise place selection inside the artist card
  - custom place picker scrolling and hit targets on iPhone Safari
- The rebuilt artist sheet needs a real-phone check for:
  - background page scroll must stay locked every time, not just most of the time
  - full scroll reachability with browser chrome visible after the lighter touch-lock rollback
  - close button hit area and placement on small iPhones
  - notes/tags visibility before the user reaches the bottom of the sheet
- Direct song links now mostly come from imported official `videoUrl` data, but still need live verification on prod:
  - that the backend serves the imported links for all 35 acts
  - that iPhone opens the resulting YouTube URL naturally
  - that `/api/video-link` fallback is only used when structured data is missing

- В `VoteStudio` ещё нужно руками добить поведение модального окна на разных разрешениях.
- Кастомный список выбора места в карточке ещё нужно проверить на iPhone:
  - длинные строки страны / артиста
  - скролл внутри списка мест
  - работа после первого выбранного места
- Логика черновика только что изменена и требует ручной проверки:
  - место не должно показываться как будто уже выбрано, пока пользователь ничего не делал
  - после первого действия UI должен стабильно переключаться в режим личного рейтинга
- В `vote` и `acts` нужно ещё раз пройтись по адаптиву на реальных устройствах:
  - ширины sheet
  - сетка кнопок
  - поведение textarea
  - перенос длинных названий артистов и групп
- Перед следующим большим UX-проходом стоит ещё раз просмотреть все русские тексты в `VoteStudio` и `ActsDirectory`.

## Контент

- Не у всех артистов сейчас одинаково глубокий набор фактов и биографии.
- Для `final` ещё не заполнен полноценный блок с местом в полуфинале.
- После подтверждения official running order нужно обновить порядок карточек.

## Техдолг

- Вынести state из локального файла в нормальную БД.
- Доделать отдельные admin accounts вместо общей схемы.
- Доделать полноценный backup flow.
- Подумать, не заменить ли native `select` на кастомный sheet/list для выбора места.

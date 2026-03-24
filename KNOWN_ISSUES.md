# Known Issues

> Current focus:
> `vote/acts` UX on real screens. Infrastructure and deploy are stable enough; the main remaining risk is the companion flow itself.

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
  - full scroll reachability with browser chrome visible after the stronger fixed-body lock
  - close button hit area and placement on small iPhones
  - notes/tags visibility before the user reaches the bottom of the sheet
- Direct song links now go through `/api/video-link`, but still need live verification on prod:
  - that the resolver finds the correct performance often enough
  - that iPhone opens the resulting YouTube URL naturally
  - that fallback to YouTube search is acceptable when no direct watch URL can be extracted

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

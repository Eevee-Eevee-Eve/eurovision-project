# Known Issues

> Current focus:
> `vote/acts` UX on real screens. Infrastructure and deploy are stable enough; the main remaining risk is the companion flow itself.

## Актуальные

- Need a real device smoke test for the new `placed acts` model:
  - quick place select from the acts list
  - reset ranking flow
  - modal/list sync after moving one artist onto an occupied slot
- Native `select` is still the weakest UX point in the ranking flow:
  - long option labels
  - browser-specific rendering
  - can still feel heavy on narrow screens
- The new video action currently uses a YouTube search fallback when no dedicated video URL exists yet.

- В `VoteStudio` ещё нужно руками добить поведение модального окна на разных разрешениях.
- Native `select` для выбора места остаётся уязвимым по UX:
  - длинные строки
  - разный рендер в браузерах
  - неудобство на узких экранах
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

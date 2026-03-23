# Known Issues

> Current focus after the three-mode redesign:
> manually QA notes and bottom sheet on real phones, expand artist bios further, and fill final-only semi-result context once official data is available.

## Актуальные

- Нужно вручную добить UX заметок после последних карточных правок и ещё раз проверить на мобильных.
- Bottom sheet уже улучшен, но его надо ещё руками прогнать на телефоне.
- У части артистов биография всё ещё слишком короткая.
- Для `final` ещё не заполнен полноценный блок с местом в полуфинале.
- SMTP не настроен, поэтому recovery flow ограничен.

## Контент

- Не у всех артистов сейчас одинаково глубокий набор фактов.
- Финальный состав 2026 нужно будет обновить, когда он станет официальным.
- После подтверждения running order нужно обновить порядок карточек.

## Техдолг

- Вынести state из локального файла в нормальную БД
- Доделать отдельные admin accounts вместо одной общей схемы
- Добить полноценный post-launch backup flow

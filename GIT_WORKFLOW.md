# Git Workflow

## Зачем это нужно

Чтобы продолжать работу с двух ПК и не терять контекст, держим в репозитории:

- код
- `PROJECT_CONTEXT.md`
- `SESSION_LOG.md`
- `KNOWN_ISSUES.md`
- `README.md`

## Как работать с двух устройств

### На первом ПК

1. Вносишь правки
2. Обновляешь `SESSION_LOG.md`, если менялся контекст
3. Делаешь commit
4. Пушишь в удалённый репозиторий

### На втором ПК

1. Делаешь `git pull`
2. Открываешь:
   - `PROJECT_CONTEXT.md`
   - `SESSION_LOG.md`
   - `KNOWN_ISSUES.md`
3. Пишешь в новом чате, что нужно сначала прочитать эти файлы

## Базовые команды

```bash
git status
git add .
git commit -m "Short clear message"
git pull --rebase
git push
```

## Рекомендуемый ритуал перед началом новой сессии

1. Прочитать `PROJECT_CONTEXT.md`
2. Прочитать последнюю секцию в `SESSION_LOG.md`
3. Проверить `KNOWN_ISSUES.md`


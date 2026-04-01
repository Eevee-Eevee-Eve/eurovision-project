'use client';

import Link from "next/link";
import { ArrowRight, Lock, PlusCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { createTemporaryRoom, fetchRooms } from "../lib/api";
import { FALLBACK_ROOM } from "../lib/rooms";
import type { RoomSummary } from "../lib/types";
import { useLanguage } from "../components/LanguageProvider";

function normalizeRoomInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const withoutOrigin = trimmed.replace(/^https?:\/\/[^/]+/i, "");
  const firstSegment = withoutOrigin
    .split("?")[0]
    .split("#")[0]
    .replace(/^\/+/, "")
    .split("/")[0];

  return firstSegment.trim().toLowerCase();
}

export default function Home() {
  const router = useRouter();
  const { language, getRoomCityLabel, getStageLabel } = useLanguage();
  const [rooms, setRooms] = useState<RoomSummary[]>([FALLBACK_ROOM]);
  const [loadError, setLoadError] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [joinRoomCode, setJoinRoomCode] = useState("");
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState("");
  const [joinError, setJoinError] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const payload = await fetchRooms();
        if (!active) return;
        setRooms(payload.rooms.length ? payload.rooms : [FALLBACK_ROOM]);
        setLoadError("");
      } catch (error) {
        if (!active) return;
        console.error(error);
        setRooms([FALLBACK_ROOM]);
        setLoadError(
          language === "ru"
            ? "Список комнат сейчас недоступен. Ниже всё равно можно создать новую комнату или открыть основную."
            : "The room list is unavailable right now. You can still create a new room or open the main one below.",
        );
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [language]);

  const text = useMemo(
    () =>
      language === "ru"
        ? {
            kicker: "Евровидение у Морозовых 2026",
            title: "Создай комнату или войди в уже существующую.",
            createTitle: "Создать комнату",
            createBody:
              "Запусти новую комнату для друзей. Пароль можно добавить сразу, а можно оставить комнату открытой.",
            createNameLabel: "Название комнаты",
            createNamePlaceholder: "Например: Полуфинал у Морозовых",
            createPasswordLabel: "Пароль комнаты",
            createPasswordPlaceholder: "Необязательно",
            createButton: "Создать комнату",
            createHint:
              "Если в комнате никого нет больше 4 часов, она исчезает автоматически.",
            joinTitle: "Войти в комнату",
            joinBody:
              "Вставь код комнаты или целую ссылку. Если комната закрыта паролем, сайт попросит его уже на следующем шаге.",
            joinLabel: "Код комнаты или ссылка",
            joinPlaceholder: "Например: neon-arena",
            joinButton: "Войти в комнату",
            activeRoomsTitle: "Активные комнаты",
            activeRoomsBody:
              "Это не главный сценарий, а быстрый список уже существующих комнат, если ты знаешь, куда идёшь.",
            currentStage: "Сейчас идёт",
            openRoom: "Открыть комнату",
            temporary: "Временная",
            privateRoom: "С паролем",
            noRooms: "Пока видна только основная комната.",
            whyTitle: "Как это устроено",
            whyItems: [
              "Создаёшь комнату или входишь в уже существующую.",
              "Внутри комнаты открываешь голосование или большой экран результатов.",
              "Хост управляет эфиром отдельно, не мешая гостям.",
            ],
          }
        : {
            kicker: "Morozov Eurovision 2026",
            title: "Create a room or join one that already exists.",
            createTitle: "Create a room",
            createBody:
              "Spin up a room for friends. Add a password if you want privacy, or leave it open.",
            createNameLabel: "Room name",
            createNamePlaceholder: "Example: Semi-final watch party",
            createPasswordLabel: "Room password",
            createPasswordPlaceholder: "Optional",
            createButton: "Create room",
            createHint:
              "If nobody stays in the room for 4 hours, it disappears automatically.",
            joinTitle: "Join a room",
            joinBody:
              "Paste a room code or a full link. If the room is private, the password prompt will appear on the next step.",
            joinLabel: "Room code or link",
            joinPlaceholder: "Example: neon-arena",
            joinButton: "Join room",
            activeRoomsTitle: "Active rooms",
            activeRoomsBody:
              "This is a secondary shortcut for people who already know where they are going.",
            currentStage: "Now playing",
            openRoom: "Open room",
            temporary: "Temporary",
            privateRoom: "Password",
            noRooms: "Only the main room is visible right now.",
            whyTitle: "How it works",
            whyItems: [
              "Create a room or enter one that already exists.",
              "Inside the room, switch between voting and the results screen.",
              "The host controls the live flow separately.",
            ],
          },
    [language],
  );

  async function handleCreateRoom() {
    if (!roomName.trim()) {
      setCreateError(
        language === "ru" ? "Сначала назови комнату." : "Give the room a name first.",
      );
      return;
    }

    setCreatePending(true);
    setCreateError("");

    try {
      const payload = await createTemporaryRoom({
        name: roomName,
        password: roomPassword,
        defaultStage: "semi1",
      });
      router.push(`/${payload.room.slug}`);
    } catch (error) {
      console.error(error);
      setCreateError(error instanceof Error ? error.message : "Unable to create room.");
    } finally {
      setCreatePending(false);
    }
  }

  function handleJoinRoom() {
    const normalized = normalizeRoomInput(joinRoomCode);
    if (!normalized) {
      setJoinError(
        language === "ru"
          ? "Введи код комнаты или ссылку."
          : "Enter a room code or a room link.",
      );
      return;
    }

    setJoinError("");
    router.push(`/${normalized}`);
  }

  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-24 pt-6 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <section className="glass-panel ghost-grid rounded-shell border border-white/10 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2">
              <Sparkles size={15} className="text-arenaPulse" />
              <span className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
                {text.kicker}
              </span>
            </div>
            <LanguageSwitcher />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-start">
            <div className="max-w-4xl">
              <h1 className="display-copy text-3xl font-black tracking-tight md:text-6xl">
                {text.title}
              </h1>
            </div>

            <div className="show-card p-5 md:p-6">
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">
                {text.whyTitle}
              </p>
              <div className="mt-4 grid gap-3">
                {text.whyItems.map((item, index) => (
                  <div key={item} className="show-panel flex items-start gap-3 p-4">
                    <div className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-xs font-semibold text-white">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-7 text-arenaMuted">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="show-card p-5 md:p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaMuted">
                {text.activeRoomsTitle}
              </p>
              <h2 className="display-copy mt-2 text-2xl font-black text-white">
                {text.activeRoomsTitle}
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-arenaMuted">{text.activeRoomsBody}</p>
          </div>

          <div className="mt-5 grid gap-3">
            {rooms.length ? (
              rooms.map((room) => (
                <div key={room.slug} className="show-panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-white">{room.name}</p>
                      <p className="mt-2 text-sm text-arenaMuted">
                        {getRoomCityLabel(room.slug, room.cityLabel)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="show-chip">
                          {text.currentStage}: {getStageLabel(room.defaultStage)}
                        </span>
                        {room.isTemporary ? <span className="show-chip">{text.temporary}</span> : null}
                        {room.passwordRequired ? (
                          <span className="show-chip">
                            <Lock size={12} />
                            {text.privateRoom}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <Link
                      href={`/${room.slug}`}
                      className="arena-button-secondary inline-flex h-10 items-center justify-center px-4 text-xs"
                    >
                      {text.openRoom}
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="show-panel p-4 text-sm text-arenaMuted">{text.noRooms}</div>
            )}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-2">
          <div className="show-card p-5 md:p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
              {text.createTitle}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-arenaMuted">{text.createBody}</p>
            <div className="mt-5 grid gap-3">
              <label className="grid gap-2 text-sm text-arenaMuted">
                <span>{text.createNameLabel}</span>
                <input
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder={text.createNamePlaceholder}
                  className="arena-input"
                />
              </label>
              <label className="grid gap-2 text-sm text-arenaMuted">
                <span>{text.createPasswordLabel}</span>
                <input
                  type="password"
                  value={roomPassword}
                  onChange={(event) => setRoomPassword(event.target.value)}
                  placeholder={text.createPasswordPlaceholder}
                  className="arena-input"
                />
              </label>
              {createError ? (
                <div className="rounded-[1.2rem] bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {createError}
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={createPending}
                className="arena-button-primary inline-flex h-12 items-center justify-center gap-2 px-5 text-sm"
              >
                <PlusCircle size={16} />
                {createPending ? "..." : text.createButton}
              </button>
              <p className="text-xs leading-6 text-arenaMuted">{text.createHint}</p>
            </div>
          </div>

          <div className="show-card p-5 md:p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">
              {text.joinTitle}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-arenaMuted">{text.joinBody}</p>
            <div className="mt-5 grid gap-3">
              <label className="grid gap-2 text-sm text-arenaMuted">
                <span>{text.joinLabel}</span>
                <input
                  value={joinRoomCode}
                  onChange={(event) => setJoinRoomCode(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleJoinRoom();
                    }
                  }}
                  placeholder={text.joinPlaceholder}
                  className="arena-input"
                />
              </label>
              {joinError ? (
                <div className="rounded-[1.2rem] bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
                  {joinError}
                </div>
              ) : null}
              <button
                type="button"
                onClick={handleJoinRoom}
                className="arena-button-secondary inline-flex h-12 items-center justify-center gap-2 px-5 text-sm"
              >
                <ArrowRight size={16} />
                {text.joinButton}
              </button>
              {loadError ? <p className="text-xs leading-6 text-amber-200">{loadError}</p> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

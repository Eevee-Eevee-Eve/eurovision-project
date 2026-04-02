'use client';

import Link from "next/link";
import { ArrowRight, Lock, PlusCircle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AuthCard } from "../components/AuthCard";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { ApiError, createTemporaryRoom, fetchRooms, resolveRoomByName } from "../lib/api";
import { FALLBACK_ROOM } from "../lib/rooms";
import type { RoomSummary } from "../lib/types";
import { useLanguage } from "../components/LanguageProvider";

export default function Home() {
  const router = useRouter();
  const { language, getRoomCityLabel, getStageLabel } = useLanguage();
  const [rooms, setRooms] = useState<RoomSummary[]>([FALLBACK_ROOM]);
  const [loadError, setLoadError] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [joinRoomName, setJoinRoomName] = useState("");
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState("");
  const [joinPending, setJoinPending] = useState(false);
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
            title: "Войди, создай комнату и начни вечер.",
            intro: "Сначала аккаунт, потом комната, потом голосование и результаты. Всё на одном экране.",
            createTitle: "Создать комнату",
            createBody:
              "Придумай имя комнаты, по которому друзья смогут её найти. Пароль можно добавить сразу или оставить комнату открытой.",
            createNameLabel: "Имя комнаты",
            createNamePlaceholder: "Например: Полуфинал у Морозовых",
            createPasswordLabel: "Пароль комнаты",
            createPasswordPlaceholder: "Необязательно",
            createButton: "Создать комнату",
            createHint:
              "Если в комнате никого нет больше 4 часов, она исчезает автоматически.",
            joinTitle: "Войти в комнату",
            joinBody:
              "Введи имя комнаты, в которую тебя пригласили. Если она закрыта паролем, сайт попросит его на следующем шаге.",
            joinLabel: "Имя комнаты",
            joinPlaceholder: "Например: Полуфинал у Морозовых",
            joinHint:
              "Используй то же имя комнаты, которое тебе прислал хост.",
            joinButton: "Войти в комнату",
            activeRoomsTitle: "Активные комнаты",
            currentStage: "Сейчас идёт",
            openRoom: "Открыть комнату",
            temporary: "Временная",
            privateRoom: "С паролем",
            noRooms: "Пока видна только основная комната.",
          }
        : {
            kicker: "Morozov Eurovision 2026",
            title: "Sign in, create a room, and start the night.",
            intro: "One account first, then the room, then voting and results. Everything starts on one screen.",
            createTitle: "Create a room",
            createBody:
              "Choose a room name your friends can find. Add a password if you want privacy, or leave it open.",
            createNameLabel: "Room name",
            createNamePlaceholder: "Example: Morozov semi-final party",
            createPasswordLabel: "Room password",
            createPasswordPlaceholder: "Optional",
            createButton: "Create room",
            createHint:
              "If nobody stays in the room for 4 hours, it disappears automatically.",
            joinTitle: "Join a room",
            joinBody:
              "Enter the room name you were invited to. If the room is private, the password prompt will appear on the next step.",
            joinLabel: "Room name",
            joinPlaceholder: "Example: Morozov semi-final party",
            joinHint:
              "Use the same room name the host shared with you.",
            joinButton: "Join room",
            activeRoomsTitle: "Active rooms",
            currentStage: "Now playing",
            openRoom: "Open room",
            temporary: "Temporary",
            privateRoom: "Password",
            noRooms: "Only the main room is visible right now.",
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
      if (error instanceof ApiError && error.code === "ROOM_NAME_TAKEN") {
        setCreateError(
          language === "ru"
            ? "Комната с таким именем уже существует. Выбери другое название."
            : "A room with this name already exists. Choose a different name.",
        );
      } else {
        setCreateError(error instanceof Error ? error.message : "Unable to create room.");
      }
    } finally {
      setCreatePending(false);
    }
  }

  async function handleJoinRoom() {
    if (!joinRoomName.trim()) {
      setJoinError(
        language === "ru"
          ? "Введи имя комнаты."
          : "Enter the room name.",
      );
      return;
    }

    setJoinPending(true);
    setJoinError("");

    try {
      const payload = await resolveRoomByName(joinRoomName);
      router.push(`/${payload.room.slug}`);
    } catch (error) {
      console.error(error);
      if (error instanceof ApiError && error.code === "ROOM_NOT_FOUND") {
        setJoinError(
          language === "ru"
            ? "Комната с таким именем не найдена. Проверь, как её назвал хост."
            : "No room with this name was found. Check the name shared by the host.",
        );
      } else if (error instanceof ApiError && error.code === "ROOM_NAME_AMBIGUOUS") {
        setJoinError(
          language === "ru"
            ? "Есть несколько комнат с таким именем. Сначала переименуй одну из них."
            : "More than one room has this name. Rename one of the rooms first.",
        );
      } else {
        setJoinError(error instanceof Error ? error.message : "Unable to find the room.");
      }
    } finally {
      setJoinPending(false);
    }
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

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
            <div className="max-w-4xl">
              <h1 className="display-copy text-3xl font-black tracking-tight md:text-5xl">
                {text.title}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-arenaMuted md:text-base">
                {text.intro}
              </p>
            </div>

            <AuthCard />
          </div>
        </section>

        <section className="show-card p-5 md:p-6">
          <div>
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaMuted">
              {text.activeRoomsTitle}
            </p>
            <h2 className="display-copy mt-2 text-2xl font-black text-white">
              {text.activeRoomsTitle}
            </h2>
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
          <div className="show-card home-flow-create p-5 md:p-6">
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
                  className="arena-input home-input-create"
                />
              </label>
              <label className="grid gap-2 text-sm text-arenaMuted">
                <span>{text.createPasswordLabel}</span>
                <input
                  type="password"
                  value={roomPassword}
                  onChange={(event) => setRoomPassword(event.target.value)}
                  placeholder={text.createPasswordPlaceholder}
                  className="arena-input home-input-create"
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

          <div className="show-card home-flow-join p-5 md:p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">
              {text.joinTitle}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-arenaMuted">{text.joinBody}</p>
            <div className="mt-5 grid gap-3">
              <label className="grid gap-2 text-sm text-arenaMuted">
                <span>{text.joinLabel}</span>
                <input
                  value={joinRoomName}
                  onChange={(event) => setJoinRoomName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleJoinRoom();
                    }
                  }}
                  placeholder={text.joinPlaceholder}
                  className="arena-input home-input-join"
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
                disabled={joinPending}
                className="arena-button-join inline-flex h-12 items-center justify-center gap-2 px-5 text-sm"
              >
                <ArrowRight size={16} />
                {joinPending ? "..." : text.joinButton}
              </button>
              <p className="text-xs leading-6 text-arenaMuted">{text.joinHint}</p>
              {loadError ? <p className="text-xs leading-6 text-amber-200">{loadError}</p> : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

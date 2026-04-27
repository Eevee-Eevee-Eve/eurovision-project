'use client';

import Link from "next/link";
import { ArrowRight, Lock, PlusCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "../components/AccountProvider";
import { AuthCard } from "../components/AuthCard";
import { BrandLogo } from "../components/BrandLogo";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { ApiError, createTemporaryRoom, fetchRooms } from "../lib/api";
import { FALLBACK_ROOM } from "../lib/rooms";
import type { RoomSummary } from "../lib/types";
import { useLanguage } from "../components/LanguageProvider";

const AUTH_CARD_ID = "home-auth-card";

export default function Home() {
  const router = useRouter();
  const { account, loading } = useAccount();
  const { language, getDisplayName, getRoomName, getRoomCityLabel, getStageLabel } = useLanguage();
  const [rooms, setRooms] = useState<RoomSummary[]>([FALLBACK_ROOM]);
  const [loadError, setLoadError] = useState("");
  const [roomSearch, setRoomSearch] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [createPending, setCreatePending] = useState(false);
  const [createError, setCreateError] = useState("");

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
            ? "Список комнат сейчас недоступен. Ниже всё равно можно создать новую комнату."
            : "The room list is unavailable right now. You can still create a new room below.",
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
            titleLoggedOut: "Сначала войди в аккаунт",
            introLoggedOut:
              "Аккаунт нужен один раз: после входа ты сможешь открыть активную комнату или создать свою.",
            titleLoggedIn: "Выбирай комнату и начинай вечер",
            introLoggedIn:
              "Самый быстрый вход теперь через список активных комнат. Если нужна новая комната для друзей, создай её ниже.",
            accountReady: "Аккаунт активен",
            accountReadyText:
              "Теперь можно открыть любую активную комнату или запустить новую для своей компании.",
            manageAccount: "Профиль",
            activeRoomsTitle: "Активные комнаты",
            activeRoomsText:
              "Найди свою комнату по имени. Если комната закрыта паролем, сайт спросит его уже на следующем шаге.",
            roomSearchLabel: "Поиск по активным комнатам",
            roomSearchPlaceholder: "Поиск по имени комнаты",
            roomSearchEmpty: "По этому запросу пока нет активных комнат.",
            currentStage: "Сейчас идёт",
            openRoom: "Открыть комнату",
            signInFirstShort: "Сначала войди",
            signInToEnterHint:
              "Войти или создать комнату можно сразу после входа в аккаунт.",
            createTitle: "Создать комнату",
            createBodyReady:
              "Придумай имя комнаты для друзей. Если нужно, сразу защити её паролем.",
            createBodyLocked:
              "Создание комнаты откроется сразу после входа в аккаунт.",
            createNameLabel: "Имя комнаты",
            createNamePlaceholder: "Например: Полуфинал у Морозовых",
            createPasswordLabel: "Пароль комнаты",
            createPasswordPlaceholder: "Необязательно",
            createButton: "Создать комнату",
            createNeedAuth: "Сначала войди в аккаунт",
            createHint:
              "Если в комнате никого нет больше 4 часов, она исчезает автоматически.",
            temporary: "Временная",
            privateRoom: "С паролем",
            noRooms: "Пока активна только основная комната.",
            loadAccount: "Проверяем аккаунт...",
          }
        : {
            kicker: "Morozov Eurovision 2026",
            titleLoggedOut: "Sign in first",
            introLoggedOut:
              "You only need one account. After that, you can open an active room or create your own.",
            titleLoggedIn: "Pick a room and start the night",
            introLoggedIn:
              "The fastest way in is now the active room list. If you need a new room for friends, create it below.",
            accountReady: "Account ready",
            accountReadyText:
              "You can now open any active room or create a fresh one for your group.",
            manageAccount: "Profile",
            activeRoomsTitle: "Active rooms",
            activeRoomsText:
              "Find your room by name. If the room is private, the password prompt appears on the next step.",
            roomSearchLabel: "Search active rooms",
            roomSearchPlaceholder: "Search by room name",
            roomSearchEmpty: "No active rooms match this search.",
            currentStage: "Now playing",
            openRoom: "Open room",
            signInFirstShort: "Sign in first",
            signInToEnterHint:
              "Joining or creating a room unlocks right after you sign in.",
            createTitle: "Create a room",
            createBodyReady:
              "Choose a room name your friends can recognize. Add a password if you want privacy.",
            createBodyLocked:
              "Room creation unlocks as soon as you sign in.",
            createNameLabel: "Room name",
            createNamePlaceholder: "Example: Morozov semi-final party",
            createPasswordLabel: "Room password",
            createPasswordPlaceholder: "Optional",
            createButton: "Create room",
            createNeedAuth: "Sign in first",
            createHint:
              "If nobody stays in the room for 4 hours, it disappears automatically.",
            temporary: "Temporary",
            privateRoom: "Password",
            noRooms: "Only the main room is active right now.",
            loadAccount: "Checking your account...",
          },
    [language],
  );

  const filteredRooms = useMemo(() => {
    const query = roomSearch.trim().toLowerCase();
    if (!query) {
      return rooms;
    }

    return rooms.filter((room) => {
      const haystack = [
        room.name,
        getRoomName(room.slug, room.name),
        getRoomCityLabel(room.slug, room.cityLabel),
        getStageLabel(room.defaultStage),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [getRoomCityLabel, getRoomName, getStageLabel, roomSearch, rooms]);

  function scrollToAuthCard() {
    document.getElementById(AUTH_CARD_ID)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  async function handleCreateRoom() {
    if (!account) {
      scrollToAuthCard();
      return;
    }

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

  const showAuthFirst = !loading && !account;

  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-24 pt-6 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-6xl gap-6">
        <section className="glass-panel ghost-grid rounded-shell border border-white/10 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <BrandLogo variant="hero" />
            <LanguageSwitcher />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
            <div className="max-w-4xl">
              <h1 className="display-copy text-3xl font-black tracking-tight md:text-5xl">
                {showAuthFirst ? text.titleLoggedOut : text.titleLoggedIn}
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-arenaMuted md:text-base">
                {showAuthFirst ? text.introLoggedOut : text.introLoggedIn}
              </p>
            </div>

            <div id={AUTH_CARD_ID}>
              {loading ? (
                <section className="show-card p-5 md:p-6">
                  <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
                    {text.kicker}
                  </p>
                  <h3 className="display-copy mt-2 text-2xl font-black md:text-4xl">
                    {text.loadAccount}
                  </h3>
                </section>
              ) : account ? (
                <section className="show-card p-5 md:p-6">
                  <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
                    {text.accountReady}
                  </p>
                  <h3 className="display-copy mt-2 text-2xl font-black md:text-4xl">
                    {getDisplayName(account.publicName)}
                  </h3>
                  <p className="mt-3 text-sm text-arenaMuted">{text.accountReadyText}</p>
                  <div className="mt-5 flex flex-wrap gap-3">
                    <Link
                      href="/account"
                      className="arena-button-secondary inline-flex h-12 items-center justify-center px-5 text-sm"
                    >
                      {text.manageAccount}
                    </Link>
                  </div>
                </section>
              ) : (
                <AuthCard initialMode="login" />
              )}
            </div>
          </div>
        </section>

        <section className="show-card p-5 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-3xl">
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaMuted">
                {text.activeRoomsTitle}
              </p>
              <h2 className="display-copy mt-2 text-2xl font-black text-white">
                {text.activeRoomsTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-arenaMuted">{text.activeRoomsText}</p>
            </div>
            <label className="grid min-w-[min(100%,22rem)] gap-2 text-sm text-arenaMuted">
              <span>{text.roomSearchLabel}</span>
              <div className="relative">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-arenaMuted"
                />
                <input
                  value={roomSearch}
                  onChange={(event) => setRoomSearch(event.target.value)}
                  placeholder={text.roomSearchPlaceholder}
                  className="arena-input arena-search-input"
                />
              </div>
            </label>
          </div>

          <div className="mt-5 grid gap-3">
            {filteredRooms.length ? (
              filteredRooms.map((room) => (
                <div key={room.slug} className="show-panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-white">{getRoomName(room.slug, room.name)}</p>
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

                    {account ? (
                      <Link
                        href={`/${room.slug}`}
                        className="arena-button-room inline-flex h-11 items-center justify-center gap-2 px-5 text-xs"
                      >
                        <ArrowRight size={15} />
                        {text.openRoom}
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={scrollToAuthCard}
                        className="arena-button-room inline-flex h-11 items-center justify-center gap-2 px-5 text-xs opacity-85"
                      >
                        <Lock size={15} />
                        {text.signInFirstShort}
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="show-panel p-4 text-sm text-arenaMuted">
                {roomSearch.trim() ? text.roomSearchEmpty : text.noRooms}
              </div>
            )}
          </div>

          {!account ? (
            <p className="mt-4 text-xs leading-6 text-arenaMuted">{text.signInToEnterHint}</p>
          ) : null}
          {loadError ? <p className="mt-3 text-xs leading-6 text-amber-200">{loadError}</p> : null}
        </section>

        <section className="grid gap-4 xl:grid-cols-1">
          <div className={`show-card home-flow-create p-5 md:p-6 ${!account ? "opacity-90" : ""}`}>
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
              {text.createTitle}
            </p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-arenaMuted">
              {account ? text.createBodyReady : text.createBodyLocked}
            </p>

            {account ? (
              <div className="mt-5 grid gap-3 md:max-w-2xl">
                <label className="grid gap-2 text-sm text-arenaMuted">
                  <span>{text.createNameLabel}</span>
                  <input
                    value={roomName}
                    onChange={(event) => setRoomName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleCreateRoom();
                      }
                    }}
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
                  onClick={() => void handleCreateRoom()}
                  disabled={createPending}
                  className="arena-button-primary inline-flex h-12 items-center justify-center gap-2 px-5 text-sm"
                >
                  <PlusCircle size={16} />
                  {createPending ? "..." : text.createButton}
                </button>
                <p className="text-xs leading-6 text-arenaMuted">{text.createHint}</p>
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={scrollToAuthCard}
                  className="arena-button-primary inline-flex h-12 items-center justify-center gap-2 px-5 text-sm"
                >
                  <Lock size={16} />
                  {text.createNeedAuth}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

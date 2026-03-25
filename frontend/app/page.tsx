'use client';

import Link from "next/link";
import { Lock, MonitorPlay, PlusCircle, Radio, Sparkles, Vote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import Leaderboard from "../components/Leaderboard";
import { useLanguage } from "../components/LanguageProvider";
import { createTemporaryRoom, fetchRooms } from "../lib/api";
import { FALLBACK_ROOM } from "../lib/rooms";
import type { RoomSummary } from "../lib/types";

export default function Home() {
  const router = useRouter();
  const { language, getRoomCityLabel } = useLanguage();
  const [rooms, setRooms] = useState<RoomSummary[]>([FALLBACK_ROOM]);
  const [defaultRoomSlug, setDefaultRoomSlug] = useState(FALLBACK_ROOM.slug);
  const [loadError, setLoadError] = useState("");
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
        setDefaultRoomSlug(payload.defaultRoom || FALLBACK_ROOM.slug);
        setLoadError("");
      } catch (error) {
        if (!active) return;
        console.error(error);
        setRooms([FALLBACK_ROOM]);
        setDefaultRoomSlug(FALLBACK_ROOM.slug);
        setLoadError(
          language === "ru"
            ? "Комнаты сейчас недоступны, поэтому показываю основную комнату по умолчанию."
            : "Rooms are unavailable right now, so the main room is shown by default.",
        );
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [language]);

  const defaultRoom = useMemo(
    () => rooms.find((room) => room.slug === defaultRoomSlug) || FALLBACK_ROOM,
    [defaultRoomSlug, rooms],
  );

  const text = language === "ru"
    ? {
        kicker: "Евровидение у Морозовых 2026",
        title: "Красивый экран вечеринки, личный бюллетень и общий reveal в одной системе",
        intro:
          "С телефона голосуешь и оставляешь заметки. На большом экране смотришь движение мест и общую таблицу. Хост управляет этапами отдельно.",
        primaryCta: "Перейти к голосованию",
        secondaryCta: "Открыть результаты",
        whatTitle: "Как это устроено",
        whatBody: "Стартовая ведёт в два главных режима: личное голосование и экран результатов. Всё остальное остаётся вспомогательным слоем.",
        createTitle: "Создать временную комнату",
        createBody: "Своя комната для друзей. Пароль можно поставить, а можно оставить комнату открытой.",
        nameLabel: "Название комнаты",
        namePlaceholder: "Например: Полуфинал у Морозовых",
        passwordLabel: "Пароль комнаты",
        passwordPlaceholder: "Необязательно",
        createCta: "Создать комнату",
        createHint: "Если в комнате никого нет больше 4 часов, она исчезает автоматически.",
        roomsTitle: "Комнаты",
        openRoom: "Открыть",
        goVote: "Голосование",
        goResults: "Результаты",
        temporary: "Временная",
        privateRoom: "С паролем",
        leaderboardTitle: "Таблица друзей",
        badges: [
          {
            icon: Vote,
            title: "Голосование",
            text: "Основной личный сценарий с телефона.",
          },
          {
            icon: MonitorPlay,
            title: "Результаты",
            text: "Общий экран для reveal и движения таблицы.",
          },
          {
            icon: Radio,
            title: "Админка",
            text: "Отдельный backstage для хоста.",
          },
        ],
      }
    : {
        kicker: "Morozov Eurovision 2026",
        title: "A polished party screen, a personal ballot, and a shared reveal in one system",
        intro:
          "Phones are for voting and notes. The big screen is for rank movement and room results. The host controls the flow separately.",
        primaryCta: "Open voting",
        secondaryCta: "Open results",
        whatTitle: "How it works",
        whatBody: "The landing page leads into two primary modes: personal voting and the shared results screen. Everything else stays secondary.",
        createTitle: "Create a temporary room",
        createBody: "Spin up a room for friends. Add a password if you want privacy, or leave it open.",
        nameLabel: "Room name",
        namePlaceholder: "Example: Semi-final watch party",
        passwordLabel: "Room password",
        passwordPlaceholder: "Optional",
        createCta: "Create room",
        createHint: "Temporary rooms disappear automatically after 4 hours with nobody inside.",
        roomsTitle: "Rooms",
        openRoom: "Open",
        goVote: "Vote",
        goResults: "Results",
        temporary: "Temporary",
        privateRoom: "Password",
        leaderboardTitle: "Friends leaderboard",
        badges: [
          {
            icon: Vote,
            title: "Voting",
            text: "The main personal flow on your phone.",
          },
          {
            icon: MonitorPlay,
            title: "Results",
            text: "The shared reveal screen for the room.",
          },
          {
            icon: Radio,
            title: "Admin",
            text: "A separate backstage surface for the host.",
          },
        ],
      };

  async function handleCreateRoom() {
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

  return (
    <main className="min-h-screen bg-arena-grid px-4 pb-24 pt-6 text-arenaText md:px-8">
      <div className="mx-auto grid max-w-7xl gap-6">
        <section className="glass-panel ghost-grid rounded-shell border border-white/10 p-6 md:p-8">
          <div className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr] xl:items-end">
            <div className="max-w-4xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="label-copy text-[11px] uppercase tracking-[0.35em] text-arenaPulse">{text.kicker}</p>
                <LanguageSwitcher />
              </div>
              <h1 className="display-copy mt-4 max-w-4xl text-4xl font-black tracking-tight md:text-7xl">
                {text.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base text-arenaText/90 md:text-xl">
                {text.intro}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/${defaultRoom.slug}/vote/${defaultRoom.defaultStage}`}
                  className="arena-button-primary inline-flex h-14 items-center justify-center px-8 text-sm"
                >
                  {text.primaryCta}
                </Link>
                <Link
                  href={`/${defaultRoom.slug}/live/${defaultRoom.defaultStage}`}
                  className="arena-button-secondary inline-flex h-14 items-center justify-center px-6 text-sm"
                >
                  {text.secondaryCta}
                </Link>
              </div>
              {loadError ? <p className="mt-4 text-sm text-amber-200">{loadError}</p> : null}
            </div>

            <div className="show-card p-5 md:p-6">
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{text.whatTitle}</p>
              <p className="mt-3 text-sm leading-7 text-arenaMuted">{text.whatBody}</p>
              <div className="mt-5 grid gap-3">
                {text.badges.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="show-panel p-4">
                      <div className="flex items-center gap-3 text-white">
                        <Icon size={16} />
                        <span className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">{item.title}</span>
                      </div>
                      <p className="mt-3 text-sm text-arenaMuted">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="show-card p-5 md:p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.createTitle}</p>
            <p className="mt-3 max-w-xl text-sm leading-7 text-arenaMuted">{text.createBody}</p>
            <div className="mt-5 grid gap-3">
              <label className="grid gap-2 text-sm text-arenaMuted">
                <span>{text.nameLabel}</span>
                <input
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder={text.namePlaceholder}
                  className="arena-input"
                />
              </label>
              <label className="grid gap-2 text-sm text-arenaMuted">
                <span>{text.passwordLabel}</span>
                <input
                  type="password"
                  value={roomPassword}
                  onChange={(event) => setRoomPassword(event.target.value)}
                  placeholder={text.passwordPlaceholder}
                  className="arena-input"
                />
              </label>
              {createError ? <div className="rounded-[1.2rem] bg-rose-400/10 px-4 py-3 text-sm text-rose-100">{createError}</div> : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  disabled={createPending}
                  className="arena-button-primary inline-flex h-12 items-center justify-center gap-2 px-5 text-sm"
                >
                  <PlusCircle size={16} />
                  {createPending ? "..." : text.createCta}
                </button>
              </div>
              <p className="text-xs leading-6 text-arenaMuted">{text.createHint}</p>
            </div>
          </div>

          <div className="show-card p-5 md:p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">{text.roomsTitle}</p>
                <h2 className="display-copy mt-2 text-2xl font-black">{text.roomsTitle}</h2>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              {rooms.map((room) => (
                <div key={room.slug} className="show-panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xl font-semibold text-white">{room.name}</p>
                      <p className="mt-2 text-sm text-arenaMuted">{getRoomCityLabel(room.slug, room.cityLabel)}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="show-chip">{room.defaultStage}</span>
                        {room.isTemporary ? <span className="show-chip">{text.temporary}</span> : null}
                        {room.passwordRequired ? (
                          <span className="show-chip">
                            <Lock size={12} />
                            {text.privateRoom}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/${room.slug}`} className="arena-button-secondary inline-flex h-10 items-center justify-center px-4 text-xs">
                        {text.openRoom}
                      </Link>
                      <Link href={`/${room.slug}/vote/${room.defaultStage}`} className="arena-button-secondary inline-flex h-10 items-center justify-center px-4 text-xs">
                        {text.goVote}
                      </Link>
                      <Link href={`/${room.slug}/live/${room.defaultStage}`} className="arena-button-secondary inline-flex h-10 items-center justify-center px-4 text-xs">
                        {text.goResults}
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[0.86fr_1.14fr]">
          <div className="show-card p-5 md:p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">{text.leaderboardTitle}</p>
            <p className="mt-3 text-sm leading-7 text-arenaMuted">
              {language === "ru"
                ? "Это уже не главный вход, а спокойный вторичный слой: кто из друзей точнее всего угадывает сезон."
                : "This is a quieter secondary layer: who is predicting the season best so far."}
            </p>
          </div>
          <Leaderboard roomSlug={defaultRoom.slug} />
        </section>
      </div>
    </main>
  );
}

'use client';

import Link from "next/link";
import { ArrowRight, Copy, MonitorPlay, NotebookPen, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchRoom } from "../lib/api";
import type { RoomDetails } from "../lib/types";
import { useLanguage } from "./LanguageProvider";

export function RoomLanding({ roomSlug }: { roomSlug: string }) {
  const { getStageLabel, language } = useLanguage();
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [error, setError] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [roomUrl, setRoomUrl] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const roomPayload = await fetchRoom(roomSlug);
        if (!active) return;
        setRoom(roomPayload);
        setError(false);
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setError(true);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [roomSlug]);

  useEffect(() => {
    setRoomUrl(`${window.location.origin}/${roomSlug}`);
  }, [roomSlug]);

  if (error) {
    return (
      <div className="rounded-[1.8rem] bg-rose-400/10 p-5 text-sm text-rose-100">
        {language === "ru"
          ? "Сейчас не удалось загрузить комнату."
          : "Unable to load the room right now."}
      </div>
    );
  }

  const defaultStage = room?.defaultStage || "semi1";
  const showStatus = room?.showState?.statusText;
  const roomName = room?.name || roomSlug;
  const text = language === "ru"
    ? {
        kicker: "Комната",
        title: "Комната готова. Дальше — голосование или общий экран результатов.",
        description:
          "Здесь начинается ваша сессия: на телефоне вы собираете личный бюллетень, а на большом экране следите за reveal и движением мест.",
        currentStage: "Сейчас идёт",
        roomStatus: "Статус эфира",
        statusFallback: "Комната готова к началу вечера.",
        vote: "Голосование",
        voteText: "Личный бюллетень на телефоне: расставить артистов, оставить заметки и отправить порядок.",
        results: "Результаты",
        resultsText: "Общий экран для очков, движения мест и reveal вашей компании.",
        open: "Открыть",
        roomLink: "Пригласить друзей",
        roomLinkText: "Скопируй ссылку и отправь друзьям, чтобы все вошли в ту же комнату.",
        copy: "Скопировать ссылку",
        copied: "Скопировано",
        copyError: "Не удалось скопировать",
        roomName: "Имя комнаты",
        roomDetails: "О комнате",
        roomDetailsText: "В комнате остаются только два главных режима: личное голосование и общий экран результатов.",
        hostTools: "Для хоста",
        hostText: "Пульт остаётся за кулисами и не мешает гостям.",
        admin: "Открыть пульт",
        temporary: "Временная комната",
        privateRoom: "С паролем",
        roomExpires:
          "Если в этой комнате никого не будет больше 4 часов, она исчезнет автоматически.",
        roomPrivateText: "Гостей попросят ввести пароль уже на следующем шаге.",
      }
    : {
        kicker: "Room",
        title: "The room is ready. From here, people choose voting or the shared results screen.",
        description:
          "This is the start of your session: phones stay focused on personal ballots, while the big screen follows reveals and leaderboard movement.",
        currentStage: "Now playing",
        roomStatus: "Live status",
        statusFallback: "The room is ready for the night to begin.",
        vote: "Voting",
        voteText: "The personal phone ballot: rank acts, keep notes, and submit a final order.",
        results: "Results",
        resultsText: "The shared screen for points, movement, and your room reveal.",
        open: "Open",
        roomLink: "Invite friends",
        roomLinkText: "Copy the link and send it around so everyone enters the same room.",
        copy: "Copy link",
        copied: "Copied",
        copyError: "Unable to copy",
        roomName: "Room name",
        roomDetails: "About the room",
        roomDetailsText: "Inside the room, only two guest-facing modes stay in the spotlight: personal voting and the shared results screen.",
        hostTools: "For the host",
        hostText: "The control room stays backstage and out of the guest flow.",
        admin: "Open control room",
        temporary: "Temporary room",
        privateRoom: "Password",
        roomExpires:
          "If nobody stays in this room for more than 4 hours, it disappears automatically.",
        roomPrivateText: "Guests will be asked for the password on the next step.",
      };

  async function handleCopyRoomLink() {
    try {
      await navigator.clipboard.writeText(roomUrl || `/${roomSlug}`);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch (copyError) {
      console.error(copyError);
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="show-card room-lobby-hero p-5 md:p-7">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
            {text.kicker}
          </p>
          <h2 className="display-copy mt-3 text-3xl font-black md:text-6xl">
            {roomName}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-arenaMuted md:text-base">
            {text.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
              {text.currentStage}: {getStageLabel(defaultStage)}
            </span>
            {room?.isTemporary ? (
              <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                {text.temporary}
              </span>
            ) : null}
            {room?.passwordRequired ? (
              <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                {text.privateRoom}
              </span>
            ) : null}
          </div>

          <div className="mt-6 grid gap-3 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="show-panel room-lobby-status p-5">
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">
                {text.roomStatus}
              </p>
              <p className="mt-4 text-base leading-7 text-white">{showStatus || text.statusFallback}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
            <Link
              href={`/${roomSlug}/vote/${defaultStage}`}
              className="show-panel room-lobby-action room-lobby-vote p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
            >
              <div className="inline-flex rounded-full bg-white/5 p-3 text-arenaPulse">
                <NotebookPen size={20} />
              </div>
              <p className="display-copy mt-5 text-2xl font-black text-white">{text.vote}</p>
              <p className="mt-3 text-sm leading-7 text-arenaMuted">{text.voteText}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-white">
                <span>{text.open}</span>
                <ArrowRight size={15} />
              </div>
            </Link>

            <Link
              href={`/${roomSlug}/live/${defaultStage}`}
              className="show-panel room-lobby-action room-lobby-results p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
            >
              <div className="inline-flex rounded-full bg-white/5 p-3 text-arenaBeam">
                <MonitorPlay size={20} />
              </div>
              <p className="display-copy mt-5 text-2xl font-black text-white">{text.results}</p>
              <p className="mt-3 text-sm leading-7 text-arenaMuted">{text.resultsText}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-white">
                <span>{text.open}</span>
                <ArrowRight size={15} />
              </div>
            </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="show-card room-lobby-invite p-5 md:p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
              {text.roomLink}
            </p>
            <p className="mt-3 text-sm leading-7 text-arenaMuted">{text.roomLinkText}</p>
            <div className="mt-4 show-panel-muted p-4">
              <p className="label-copy text-[11px] uppercase tracking-[0.26em] text-arenaMuted">
                {text.roomName}
              </p>
              <p className="mt-2 text-base font-semibold text-white">{roomName}</p>
            </div>
            <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/90">
              {roomUrl || `/${roomSlug}`}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCopyRoomLink}
                className="arena-button-secondary inline-flex h-11 items-center justify-center gap-2 px-4 text-sm"
              >
                <Copy size={16} />
                {copyState === "copied"
                  ? text.copied
                  : copyState === "error"
                    ? text.copyError
                    : text.copy}
              </button>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="show-card p-5 md:p-6">
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">
                {text.roomDetails}
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-arenaMuted">{text.roomDetailsText}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {room?.isTemporary ? (
                  <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                    {text.temporary}
                  </span>
                ) : null}
                {room?.passwordRequired ? (
                  <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                    {text.privateRoom}
                  </span>
                ) : null}
              </div>
              {room?.isTemporary ? (
                <p className="mt-4 text-sm leading-7 text-arenaMuted">{text.roomExpires}</p>
              ) : null}
              {room?.passwordRequired ? (
                <p className="mt-3 text-sm leading-7 text-arenaMuted">{text.roomPrivateText}</p>
              ) : null}
            </div>

            <div className="show-panel-muted p-4">
              <p className="label-copy text-[11px] uppercase tracking-[0.28em] text-arenaMuted">
                {text.hostTools}
              </p>
              <div className="mt-4 flex items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-white/5 p-2 text-arenaMuted">
                    <Radio size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-white">{text.admin}</p>
                    <p className="mt-1 text-sm text-arenaMuted">{text.hostText}</p>
                  </div>
                </div>
                <Link
                  href={`/admin?room=${roomSlug}`}
                  className="arena-button-secondary inline-flex h-11 items-center justify-center px-4 text-sm"
                >
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

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
  const text = language === "ru"
    ? {
        kicker: "Комната",
        title: "Сначала все попадают в комнату. Уже внутри — голосование и результаты.",
        description:
          "Эта страница больше не должна быть хабом из семи равнозначных режимов. Комната — это контейнер вашей сессии: отсюда вы либо открываете личный бюллетень, либо общий экран результатов.",
        currentStage: "Текущий этап",
        roomStatus: "Статус комнаты",
        statusFallback: "Комната готова к следующему reveal.",
        vote: "Голосование",
        voteText: "Личный бюллетень на телефоне: расставить артистов, оставить заметки и отправить порядок.",
        results: "Результаты",
        resultsText: "Общий экран для очков, движения мест и reveal вашей компании.",
        open: "Открыть",
        roomLink: "Ссылка в комнату",
        roomLinkText: "Скопируй ссылку и отправь друзьям, чтобы они вошли в ту же сессию.",
        copy: "Скопировать ссылку",
        copied: "Скопировано",
        copyError: "Не удалось скопировать",
        roomCode: "Код комнаты",
        hostTools: "Для хоста",
        hostText: "Пульт и служебные настройки остаются backstage и не мешают гостям.",
        admin: "Открыть админку",
        temporary: "Временная комната",
        privateRoom: "С паролем",
        roomExpires:
          "Если в этой комнате никого не будет больше 4 часов, она исчезнет автоматически.",
      }
    : {
        kicker: "Room",
        title: "Everyone enters the room first. Inside it, they choose voting or results.",
        description:
          "This page should not feel like a hub of seven equal routes. A room is the container for your session: from here, people either open the personal ballot or the shared results screen.",
        currentStage: "Current stage",
        roomStatus: "Room status",
        statusFallback: "The room is ready for the next reveal.",
        vote: "Voting",
        voteText: "The personal phone ballot: rank acts, keep notes, and submit a final order.",
        results: "Results",
        resultsText: "The shared screen for points, movement, and your room reveal.",
        open: "Open",
        roomLink: "Room link",
        roomLinkText: "Copy the link and send it to friends so they join the same session.",
        copy: "Copy link",
        copied: "Copied",
        copyError: "Unable to copy",
        roomCode: "Room code",
        hostTools: "For the host",
        hostText: "The control room stays backstage and does not compete with the guest flow.",
        admin: "Open admin",
        temporary: "Temporary room",
        privateRoom: "Password",
        roomExpires:
          "If nobody stays in this room for more than 4 hours, it disappears automatically.",
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
      <section className="grid gap-4 xl:grid-cols-[1.06fr_0.94fr]">
        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
            {text.kicker}
          </p>
          <h2 className="display-copy mt-3 text-3xl font-black md:text-6xl">
            {room?.name || roomSlug}
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-arenaMuted md:text-base">
            {text.description}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaBeam">
              {text.currentStage}: {getStageLabel(defaultStage)}
            </span>
            <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
              {text.roomCode}: {roomSlug}
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

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Link
              href={`/${roomSlug}/vote/${defaultStage}`}
              className="show-panel p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
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
              className="show-panel p-5 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
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

        <div className="grid gap-4">
          <div className="show-card p-5 md:p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">
              {text.roomStatus}
            </p>
            <p className="mt-4 text-base leading-7 text-white">{showStatus || text.statusFallback}</p>
          </div>

          <div className="show-card p-5 md:p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
              {text.roomLink}
            </p>
            <p className="mt-3 text-sm leading-7 text-arenaMuted">{text.roomLinkText}</p>
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
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="show-card p-5 md:p-6">
          <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaMuted">
            {text.hostTools}
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-arenaMuted">{text.hostText}</p>
          <div className="mt-5">
            <Link
              href={`/admin?room=${roomSlug}`}
              className="show-panel flex items-center justify-between gap-4 p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08]"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-white/5 p-2 text-arenaMuted">
                  <Radio size={16} />
                </div>
                <div>
                  <p className="font-semibold text-white">{text.admin}</p>
                  <p className="mt-1 text-sm text-arenaMuted">{text.hostText}</p>
                </div>
              </div>
              <ArrowRight size={16} className="text-arenaMuted" />
            </Link>
          </div>
        </div>

        {room?.isTemporary ? (
          <div className="show-card p-5 md:p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">
              {text.temporary}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-arenaMuted">{text.roomExpires}</p>
          </div>
        ) : (
          <div className="show-card p-5 md:p-6">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaBeam">
              {text.roomCode}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-arenaMuted">
              {roomSlug}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

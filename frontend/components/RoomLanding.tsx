'use client';

import Link from "next/link";
import { ArrowRight, Copy, MonitorPlay, NotebookPen, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { deleteTemporaryRoom, fetchActs, fetchRoom } from "../lib/api";
import { useDeviceTier } from "../lib/device";
import { resolveMediaUrl } from "../lib/media";
import type { ActEntry, RoomDetails } from "../lib/types";
import { useLanguage } from "./LanguageProvider";

export function RoomLanding({ roomSlug }: { roomSlug: string }) {
  const router = useRouter();
  const { language, getRoomName } = useLanguage();
  const { isPhone } = useDeviceTier();
  const [room, setRoom] = useState<RoomDetails | null>(null);
  const [stagePreviewActs, setStagePreviewActs] = useState<ActEntry[]>([]);
  const [error, setError] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [roomUrl, setRoomUrl] = useState("");

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const roomPayload = await fetchRoom(roomSlug);
        if (!active) return;
        setRoom(roomPayload);
        setError(false);

        try {
          const actsPayload = await fetchActs(roomSlug, roomPayload.defaultStage || "semi1");
          if (!active) return;
          setStagePreviewActs(actsPayload.acts.filter((act) => act.photoUrl).slice(0, 3));
        } catch (actsError) {
          if (!active) return;
          console.error(actsError);
          setStagePreviewActs([]);
        }
      } catch (loadError) {
        if (!active) return;
        console.error(loadError);
        setError(true);
        setStagePreviewActs([]);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [roomSlug]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setRoomUrl(`${window.location.origin}/${roomSlug}`);
    }
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
  const roomName = getRoomName(roomSlug, room?.name || roomSlug);
  const previewActs = stagePreviewActs.slice(0, isPhone ? 2 : 3);

  const text = language === "ru"
    ? {
        kicker: "Комната",
        title: isPhone ? "Комната готова" : "Комната готова. Дальше — голосование или общий экран результатов.",
        description: isPhone
          ? "Открой голосование на телефоне или результаты на большом экране."
          : "Здесь начинается ваша сессия: на телефоне вы собираете личный выбор, а на большом экране следите за reveal и движением мест.",
        vote: "Голосование",
        voteText: "Личный выбор на телефоне: расставить артистов, оставить заметки и сохранить порядок.",
        results: "Результаты",
        resultsText: "Общий экран для очков, движения мест и reveal вашей компании.",
        open: "Открыть",
        roomLink: "Пригласить друзей",
        roomLinkText: "Скопируй ссылку и отправь друзьям, чтобы все вошли в ту же комнату.",
        copy: "Скопировать ссылку",
        copied: "Скопировано",
        copyError: "Не удалось скопировать",
        roomName: "Имя комнаты",
        temporary: "Временная комната",
        privateRoom: "С паролем",
        roomExpires:
          "Если в этой комнате никого не будет больше 4 часов, она исчезнет автоматически.",
        roomPrivateText: "Гостей попросят ввести пароль уже на следующем шаге.",
      }
    : {
        kicker: "Room",
        title: isPhone ? "Room ready" : "The room is ready. Next step: voting or the shared results screen.",
        description: isPhone
          ? "Choose what to open next: the phone ballot or the shared results view."
          : "This is the start of your session: phones stay focused on personal choices, while the big screen follows reveals and leaderboard movement.",
        vote: "Voting",
        voteText: "Personal phone flow: rank acts, keep notes, and save a final order.",
        results: "Results",
        resultsText: "The shared screen for points, movement, and your room reveal.",
        open: "Open",
        roomLink: "Invite friends",
        roomLinkText: "Copy the link and send it around so everyone enters the same room.",
        copy: "Copy link",
        copied: "Copied",
        copyError: "Unable to copy",
        roomName: "Room name",
        privateRoom: "Password",
        roomPrivateText: "Guests will be asked for the password on the next step.",
      };

  const voteCardText = isPhone
    ? (language === "ru"
        ? "Перетаскивай артистов, открывай карточки и сохраняй свой порядок."
        : "Drag acts, open their cards, and save your final order.")
    : text.voteText;

  const resultsCardText = isPhone
    ? (language === "ru"
        ? "Открой общий экран с очками и движением мест."
        : "Open the shared screen for points and leaderboard movement.")
    : text.resultsText;

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

  const deleteRoomText = language === "ru" ? "Удалить комнату" : "Delete room";
  const deleteRoomConfirm = language === "ru"
    ? "Удалить эту комнату? Данные голосования в ней тоже удалятся."
    : "Delete this room? Its voting data will be removed too.";
  const deleteRoomErrorText = language === "ru"
    ? "Не удалось удалить комнату."
    : "Unable to delete room.";

  async function handleDeleteRoom() {
    if (!room?.canManage || deletePending) return;
    if (!window.confirm(deleteRoomConfirm)) return;

    setDeletePending(true);
    setDeleteError("");
    try {
      await deleteTemporaryRoom(roomSlug);
      router.push("/");
    } catch (deleteRoomError) {
      console.error(deleteRoomError);
      setDeleteError(deleteRoomErrorText);
      setDeletePending(false);
    }
  }

  const invitePanel = (
    <div className="show-card room-lobby-invite p-5 md:p-6">
      <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
        {text.roomLink}
      </p>
      <div className="mt-3 grid gap-4 xl:grid-cols-[minmax(0,0.58fr)_minmax(0,1fr)_auto] xl:items-center">
        <p className="text-sm leading-7 text-arenaMuted xl:mt-0 xl:max-w-[30rem]">
          {text.roomLinkText}
        </p>
        <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white/90">
          {roomUrl || `/${roomSlug}`}
        </div>
        <div className="flex flex-wrap items-center gap-3 xl:justify-end">
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
      {room?.passwordRequired ? (
        <div className="mt-4 show-panel-muted p-4">
          <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
            {text.privateRoom}
          </span>
          <p className="mt-4 text-sm leading-7 text-arenaMuted">{text.roomPrivateText}</p>
        </div>
      ) : null}
      {room?.canManage ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
          {deleteError ? <p className="text-sm text-rose-100">{deleteError}</p> : <span />}
          <button
            type="button"
            onClick={() => void handleDeleteRoom()}
            disabled={deletePending}
            className="arena-button-danger inline-flex h-11 items-center justify-center gap-2 px-4 text-sm"
          >
            <Trash2 size={16} />
            {deletePending ? "..." : deleteRoomText}
          </button>
        </div>
      ) : null}
    </div>
  );

  const actionCards = (
    <div className="grid gap-3 md:grid-cols-2">
      <Link
        href={`/${roomSlug}/vote/${defaultStage}`}
        className="show-panel room-lobby-action room-lobby-vote p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08] md:p-5"
      >
        <div className="inline-flex rounded-full bg-white/5 p-2.5 text-arenaPulse md:p-3">
          <NotebookPen size={isPhone ? 16 : 20} />
        </div>
        <p className={`display-copy mt-4 font-black text-white ${isPhone ? "text-[1.7rem] leading-none" : "text-xl md:mt-5 md:text-2xl"}`}>
          {text.vote}
        </p>
        <p className={`mt-2 text-arenaMuted ${isPhone ? "text-sm leading-6" : "line-clamp-3 text-xs leading-6 md:mt-3 md:text-sm md:leading-7"}`}>
          {voteCardText}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-white md:mt-4 md:text-sm">
          <span>{text.open}</span>
          <ArrowRight size={15} />
        </div>
      </Link>

      <Link
        href={`/${roomSlug}/live/${defaultStage}`}
        className="show-panel room-lobby-action room-lobby-results p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.08] md:p-5"
      >
        <div className="inline-flex rounded-full bg-white/5 p-2.5 text-arenaBeam md:p-3">
          <MonitorPlay size={isPhone ? 16 : 20} />
        </div>
        <p className={`display-copy mt-4 font-black text-white ${isPhone ? "text-[1.7rem] leading-none" : "text-xl md:mt-5 md:text-2xl"}`}>
          {text.results}
        </p>
        <p className={`mt-2 text-arenaMuted ${isPhone ? "text-sm leading-6" : "line-clamp-3 text-xs leading-6 md:mt-3 md:text-sm md:leading-7"}`}>
          {resultsCardText}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-white md:mt-4 md:text-sm">
          <span>{text.open}</span>
          <ArrowRight size={15} />
        </div>
      </Link>
    </div>
  );

  return (
    <div className="grid gap-5 room-lobby-page">
      {isPhone ? (
        <section className="grid gap-4">
            <div className="show-card room-lobby-hero p-5">
              <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
                {text.kicker}
              </p>
            <h2 className="room-lobby-title display-copy mt-3 text-2xl font-black md:text-3xl">{roomName}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-arenaMuted">{text.description}</p>

            <div className="mt-4 flex flex-wrap gap-2">
              {room?.passwordRequired ? (
                <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                  {text.privateRoom}
                </span>
              ) : null}
            </div>

            {previewActs.length ? (
              <div className="mt-5 grid grid-cols-2 gap-2">
                {previewActs.map((act) => {
                  const photoUrl = resolveMediaUrl(act.photoUrl);
                  const flagUrl = resolveMediaUrl(act.flagUrl);
                  if (!photoUrl) return null;

                  return (
                    <div key={act.code} className="room-lobby-stage-card min-h-[8.5rem]">
                      <img
                        src={photoUrl}
                        alt={`${act.artist} — ${act.song}`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="room-lobby-stage-overlay">
                        <div className="flex items-center gap-2">
                          <div className="h-5 w-5 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/10">
                            <img
                              src={flagUrl || undefined}
                              alt={act.country}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <p className="text-xs font-semibold text-white">{act.country}</p>
                        </div>
                        <p className="mt-1 line-clamp-1 text-[11px] text-white/70">{act.artist}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-5">{actionCards}</div>
          </div>

          {invitePanel}
        </section>
      ) : (
        <section className="grid gap-4">
          <div className="show-card room-lobby-hero p-5 md:p-7 xl:p-8">
            <p className="label-copy text-[11px] uppercase tracking-[0.32em] text-arenaPulse">
              {text.kicker}
            </p>
            <div className="mt-4 grid gap-8 xl:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] xl:items-end">
              <div className="max-w-3xl">
                <h2 className="room-lobby-title display-copy text-3xl font-black md:text-6xl">{roomName}</h2>
                <p className="mt-4 text-sm leading-7 text-arenaMuted md:text-base">
                  {text.description}
                </p>
                {room?.passwordRequired ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="show-chip text-[11px] uppercase tracking-[0.22em] text-arenaMuted">
                      {text.privateRoom}
                    </span>
                  </div>
                ) : null}
              </div>

              <div className="room-lobby-stage-grid room-lobby-stage-grid-desktop">
                {previewActs.length ? (
                  previewActs.map((act, index) => {
                    const photoUrl = resolveMediaUrl(act.photoUrl);
                    const flagUrl = resolveMediaUrl(act.flagUrl);
                    if (!photoUrl) return null;

                    return (
                      <div
                        key={act.code}
                        className={`room-lobby-stage-card ${index === 0 ? "room-lobby-stage-card-main" : ""}`}
                      >
                        <img
                          src={photoUrl}
                          alt={`${act.artist} — ${act.song}`}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                        <div className="room-lobby-stage-overlay">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/10">
                              <img
                                src={flagUrl || undefined}
                                alt={act.country}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                            <p className="text-sm font-semibold text-white">{act.country}</p>
                          </div>
                          <p className="mt-1 text-xs text-white/70">{act.artist}</p>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <>
                    <div className="room-lobby-stage-card room-lobby-stage-card-main room-lobby-stage-fallback" />
                    <div className="room-lobby-stage-card room-lobby-stage-fallback" />
                    <div className="room-lobby-stage-card room-lobby-stage-fallback" />
                  </>
                )}
              </div>
            </div>

            <div className="mt-6">{actionCards}</div>
          </div>

          {invitePanel}
        </section>
      )}
    </div>
  );
}

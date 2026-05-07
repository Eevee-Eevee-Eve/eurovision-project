'use client';

import { ExternalLink, PlayCircle } from "lucide-react";
import { useState } from "react";
import { resolveActImageUrls } from "../lib/media";
import type { ActEntry } from "../lib/types";
import { buildActVideoUrl } from "../lib/vote-utils";
import { ActPoster } from "./ActPoster";
import { ArtistAboutPanel, ArtistCountryBadge } from "./ArtistSheetPanels";
import { BottomSheet } from "./BottomSheet";
import { ImageLightbox } from "./ImageLightbox";
import { useLanguage } from "./LanguageProvider";

export function ArtistProfileModal({
  act,
  open,
  onClose,
}: {
  act: ActEntry | null;
  open: boolean;
  onClose: () => void;
}) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const { getActBlurb, getActFacts, getCountryName, language } = useLanguage();

  if (!act) {
    return null;
  }

  const imageUrls = resolveActImageUrls(act.photoUrl);
  const countryName = getCountryName(act.code, act.country);
  const videoUrl = buildActVideoUrl(act);
  const copy = language === "ru"
    ? {
        about: "О профиле",
        close: "Закрыть",
        openPhoto: "Увеличить фото",
        official: "Официальная карточка",
        video: "Видео",
      }
    : {
        about: "Profile",
        close: "Close",
        openPhoto: "Open photo",
        official: "Official profile",
        video: "Video",
      };

  return (
    <>
      <BottomSheet
        open={open}
        onClose={() => {
          setLightboxOpen(false);
          onClose();
        }}
      >
        <div className="grid gap-4 md:gap-5">
          <div className="grid gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] md:items-end">
            <ActPoster act={act} mode="hero" onPhotoOpen={() => setLightboxOpen(true)} />
            <div className="min-w-0">
              <ArtistCountryBadge countryName={countryName} flagUrl={act.flagUrl} className="max-w-full" />
              <h3 className="display-copy mt-3 overflow-hidden break-words text-[2.1rem] font-black leading-[0.92] text-white md:text-[3.6rem]">
                {act.artist}
              </h3>
              <p className="mt-2 break-words text-base leading-7 text-arenaMuted md:text-lg">{act.song}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {act.profileUrl ? (
                  <a
                    href={act.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="arena-button-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm"
                  >
                    <ExternalLink size={15} />
                    {copy.official}
                  </a>
                ) : null}
                {videoUrl ? (
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="arena-button-secondary inline-flex min-h-11 items-center justify-center gap-2 px-4 text-sm"
                  >
                    <PlayCircle size={15} />
                    {copy.video}
                  </a>
                ) : null}
              </div>
            </div>
          </div>

          <ArtistAboutPanel
            act={act}
            title={copy.about}
            facts={getActFacts(act)}
            fallbackBlurb={getActBlurb(act)}
          />
        </div>
      </BottomSheet>

      <ImageLightbox
        src={lightboxOpen ? imageUrls.full : null}
        alt={`${act.artist} photo`}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}

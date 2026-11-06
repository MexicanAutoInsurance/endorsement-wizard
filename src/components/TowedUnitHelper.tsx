import { useEffect, useState } from "react";
import { TOWED_SEPARATE_UNITS_HINT } from "../types";

/**
 * Illustration assets live in `src/assets/towed/` so Jordan can drop in
 * replacement SVGs later without rewriting this component — see that folder’s README.
 */
import boatTrailerUrl from "../assets/towed/boat-trailer.svg?url";
import boatOutboardUrl from "../assets/towed/boat-trailer-outboard.svg?url";
import dinghyUrl from "../assets/towed/dinghy.svg?url";
import trailerAtvUrl from "../assets/towed/trailer-atv.svg?url";
import camperUrl from "../assets/towed/camper.svg?url";
import utilityTrailerUrl from "../assets/towed/utility-trailer.svg?url";
import carTrailerUrl from "../assets/towed/car-trailer.svg?url";

interface TowExample {
  id: string;
  title: string;
  caption: string;
  src: string;
}

const EXAMPLES: TowExample[] = [
  {
    id: "boat-trailer",
    title: "Boat on trailer = 2+ units",
    caption: "List the trailer AND the boat separately — never one “boat rig” line.",
    src: boatTrailerUrl,
  },
  {
    id: "outboard",
    title: "Add outboard = 3rd unit",
    caption: "Trailer + boat + outboard motor each get their own entry.",
    src: boatOutboardUrl,
  },
  {
    id: "dinghy",
    title: "Dinghy is another unit",
    caption: "A dinghy on the boat is listed separately from the main vessel.",
    src: dinghyUrl,
  },
  {
    id: "atv",
    title: "Trailer + ATV",
    caption: "Utility trailer and cargo/ATV as applicable.",
    src: trailerAtvUrl,
  },
  {
    id: "camper",
    title: "Slide-in camper",
    caption: "Camper / shell in or on the vehicle.",
    src: camperUrl,
  },
  {
    id: "trailer",
    title: "Trailer",
    caption: "Empty or loaded utility / cargo trailer.",
    src: utilityTrailerUrl,
  },
  {
    id: "car",
    title: "Car on trailer",
    caption: "Another vehicle hauled on a trailer.",
    src: carTrailerUrl,
  },
];

const CYCLE_MS = 3500;

/** Staff wizard now; reuse on future client public links (no waive UI there). */
export function TowedUnitHelper() {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % EXAMPLES.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [open]);

  const current = EXAMPLES[index];

  return (
    <div className="tow-helper">
      <button
        type="button"
        className="tow-helper-trigger"
        aria-expanded={open}
        aria-controls="tow-helper-panel"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="tow-helper-icon" aria-hidden="true">
          ?
        </span>
        What is a towed unit?
      </button>

      {open ? (
        <div
          id="tow-helper-panel"
          className="tow-helper-panel"
          role="region"
          aria-label="Examples of towed units"
        >
          <div className="tow-helper-stage">
            <img
              key={current.id}
              className="tow-svg"
              src={current.src}
              alt={current.title}
              width={420}
              height={184}
            />
            <div className="tow-helper-caption">
              <strong>{current.title}</strong>
              <span>{current.caption}</span>
            </div>
          </div>
          <div className="tow-helper-dots" role="tablist" aria-label="Example slides">
            {EXAMPLES.map((ex, i) => (
              <button
                key={ex.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                className={`tow-dot ${i === index ? "active" : ""}`}
                onClick={() => setIndex(i)}
                title={ex.title}
              />
            ))}
          </div>
          <p className="tow-helper-note">{TOWED_SEPARATE_UNITS_HINT}</p>
          <p className="tow-helper-note">
            Anything towed <em>by</em> or <em>on</em> the insured vehicle must be listed on the
            Mexican policy (at least for liability / $0 value).
          </p>
          <button
            type="button"
            className="btn btn-ghost tow-helper-close"
            onClick={() => setOpen(false)}
          >
            Close
          </button>
        </div>
      ) : null}
    </div>
  );
}

#!/usr/bin/env python3
"""Audit long pauses in actual clean-output audio using final/preview SRT context.

This tool reports review candidates; it never changes media or removes silence.
Stdout is bounded JSON. Diagnostics go to stderr. Exit codes: 0 completed,
1 completed with unaccepted findings in --strict mode, 2 usage/input/tool error.
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _common import db_series, extract_wav_from_media, read_wav_mono  # noqa: E402
from parse_srt import parse_srt, validate_cue_timing  # noqa: E402

DEFAULT_THRESHOLDS = {
    "continuation": 0.7,
    "related_sentence": 1.0,
    "ordinary": 1.2,
    "section": 1.5,
}
CONNECTIVES = re.compile(
    r"^(and|but|because|so|then|this|that|these|those|it|we|you|the)\b", re.I
)


def find_silences(
    samples: list[int], sr: int, *, silence_db: float, min_silence: float
) -> list[tuple[float, float]]:
    series = db_series(samples, sr, win_s=0.02)
    silences: list[tuple[float, float]] = []
    start: float | None = None
    window = 0.02
    for timestamp, db in series:
        if db < silence_db:
            if start is None:
                start = timestamp
        elif start is not None:
            if timestamp - start >= min_silence:
                silences.append((start, timestamp))
            start = None
    if start is not None and series:
        end = series[-1][0] + window
        if end - start >= min_silence:
            silences.append((start, end))
    return silences


def text_context(before: str, after: str) -> str:
    before = before.strip()
    after = re.sub(r"<[^>]+>", "", after).strip()
    if not re.search(r"[.!?][\"')\]]?$", before):
        return "continuation"
    if CONNECTIVES.search(after):
        return "related_sentence"
    return "ordinary"


def plan_context(plan: dict | None, gap_start: float, gap_end: float) -> str | None:
    if not plan:
        return None
    midpoint = (gap_start + gap_end) / 2
    nearest: tuple[float, str] | None = None
    mapping = {
        "repair": "continuation",
        "continuation": "continuation",
        "sentence": "related_sentence",
        "section": "section",
    }
    for segment in plan.get("segments", []):
        seam = segment.get("output_end")
        intent = segment.get("join")
        if seam is None or intent not in mapping:
            continue
        distance = abs(float(seam) - midpoint)
        # Captions can straddle a rendered seam; keep matching local and deterministic.
        if float(seam) < gap_start - 0.35 or float(seam) > gap_end + 0.35:
            continue
        if nearest is None or distance < nearest[0]:
            nearest = (distance, mapping[str(intent)])
    return nearest[1] if nearest else None


def load_exemptions(path: Path | None, plan: dict | None) -> list[dict]:
    exemptions: list[dict] = []
    if path:
        data = json.loads(path.read_text(encoding="utf-8"))
        entries = data if isinstance(data, list) else data.get("accepted_pauses", [])
        if not isinstance(entries, list):
            raise ValueError("accepted_pauses must be a list")
        exemptions.extend(entries)
    if plan:
        entries = plan.get("accepted_pauses", [])
        if isinstance(entries, list):
            exemptions.extend(entries)
        for segment in plan.get("segments", []):
            pause = segment.get("pause")
            if not isinstance(pause, dict) or not pause.get("accepted"):
                continue
            if pause.get("intent") != "retained":
                continue
            exemptions.append(
                {
                    "at": segment.get("output_end"),
                    "tolerance": pause.get("tolerance", 0.5),
                    "reason": pause.get("reason", "reviewed retained join pause"),
                }
            )
    normalized: list[dict] = []
    for item in exemptions:
        if not isinstance(item, dict):
            raise ValueError("pause exemption must be an object")
        if item.get("at") is not None:
            at = float(item["at"])
            tolerance = float(item.get("tolerance", 0.25))
            normalized.append({**item, "start": at - tolerance, "end": at + tolerance})
        else:
            start = float(item["start"])
            end = float(item["end"])
            if end <= start:
                raise ValueError("pause exemption end must be after start")
            normalized.append({**item, "start": start, "end": end})
    return normalized


def accepted_by(start: float, end: float, exemptions: list[dict]) -> dict | None:
    midpoint = (start + end) / 2
    for exemption in exemptions:
        if float(exemption["start"]) - 0.02 <= midpoint <= float(exemption["end"]) + 0.02:
            return exemption
    return None


def audit(
    silences: list[tuple[float, float]],
    cues: list[dict],
    *,
    thresholds: dict[str, float],
    exemptions: list[dict],
    plan: dict | None = None,
) -> list[dict]:
    findings: list[dict] = []

    # Same-cue silence is an internal breath/think candidate, never presumed to be
    # cut-adjacent debris. Keep it unless review decides it exceeds the cadence.
    for cue in cues:
        for silence_start, silence_end in silences:
            start = max(silence_start, float(cue["start"]))
            end = min(silence_end, float(cue["end"]))
            if start <= float(cue["start"]) + 0.06 or end >= float(cue["end"]) - 0.06:
                continue
            duration = end - start
            threshold = thresholds["continuation"]
            if duration + 1e-9 < threshold:
                continue
            exemption = accepted_by(start, end, exemptions)
            findings.append(
                {
                    "kind": "internal",
                    "context": "continuation",
                    "start": round(start, 3),
                    "end": round(end, 3),
                    "duration_s": round(duration, 3),
                    "threshold_s": threshold,
                    "cue": cue.get("i"),
                    "before_text": cue["text"][:120],
                    "after_text": cue["text"][-120:],
                    "accepted": exemption is not None,
                    "acceptance_reason": exemption.get("reason") if exemption else None,
                    "action": "listen; keep natural breath unless cadence is actually slow",
                }
            )

    for before, after in zip(cues, cues[1:]):
        gap_start = float(before["end"])
        gap_end = float(after["start"])
        gap_duration = gap_end - gap_start
        if gap_duration <= 0:
            continue
        context = plan_context(plan, gap_start, gap_end) or text_context(
            before["text"], after["text"]
        )
        threshold = thresholds[context]
        # SRT timing remains the speech guide even when room noise prevents the
        # audio detector from calling the whole interval silence. Audio overlap is
        # supporting evidence, not a prerequisite for an inter-cue review candidate.
        if gap_duration + 1e-9 < threshold:
            continue
        silence_overlap = sum(
            max(0.0, min(silence_end, gap_end) - max(silence_start, gap_start))
            for silence_start, silence_end in silences
        )
        exemption = accepted_by(gap_start, gap_end, exemptions)
        findings.append(
            {
                "kind": "inter_cue",
                "context": context,
                "start": round(gap_start, 3),
                "end": round(gap_end, 3),
                "duration_s": round(gap_duration, 3),
                "detected_silence_s": round(min(gap_duration, silence_overlap), 3),
                "threshold_s": threshold,
                "before_cue": before.get("i"),
                "after_cue": after.get("i"),
                "before_text": before["text"][-120:],
                "after_text": after["text"][:120],
                "accepted": exemption is not None,
                "acceptance_reason": exemption.get("reason") if exemption else None,
                "action": "listen on clean timeline; shorten only if flow improves",
            }
        )
    findings.sort(key=lambda item: (item["start"], item["kind"]))
    return findings


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--media", type=Path, required=True, help="Rendered preview/master or PCM WAV")
    ap.add_argument("--srt", type=Path, required=True, help="Final or clean-preview SRT")
    ap.add_argument("--plan", type=Path, help="Optional edit-plan.json for semantic joins/exemptions")
    ap.add_argument("--exemptions", type=Path, help="Optional JSON accepted pause ranges on output timeline")
    ap.add_argument("--silence-db", type=float, default=-42.0)
    ap.add_argument("--min-silence", type=float, default=0.18)
    ap.add_argument("--continuation-max", type=float, default=0.7)
    ap.add_argument("--related-max", type=float, default=1.0)
    ap.add_argument("--ordinary-max", type=float, default=1.2)
    ap.add_argument("--section-max", type=float, default=1.5)
    ap.add_argument("--max-findings", type=int, default=100, help="Bound JSON findings (1-1000)")
    ap.add_argument("--strict", action="store_true", help="Exit 1 if unaccepted candidates remain")
    args = ap.parse_args()

    if not args.media.is_file() or not args.srt.is_file():
        print("error: --media and --srt must be existing files", file=sys.stderr)
        return 2
    if args.plan and not args.plan.is_file():
        print(f"error: plan not found: {args.plan}", file=sys.stderr)
        return 2
    if args.exemptions and not args.exemptions.is_file():
        print(f"error: exemptions not found: {args.exemptions}", file=sys.stderr)
        return 2
    if not 1 <= args.max_findings <= 1000:
        print("error: --max-findings must be between 1 and 1000", file=sys.stderr)
        return 2
    thresholds = {
        "continuation": args.continuation_max,
        "related_sentence": args.related_max,
        "ordinary": args.ordinary_max,
        "section": args.section_max,
    }
    if any(value <= 0 for value in thresholds.values()):
        print("error: pause thresholds must be positive", file=sys.stderr)
        return 2

    try:
        cues = parse_srt(args.srt.read_text(encoding="utf-8", errors="replace"))
        if not cues:
            raise ValueError("no SRT cues parsed")
        validate_cue_timing(cues)
        plan = json.loads(args.plan.read_text(encoding="utf-8")) if args.plan else None
        exemptions = load_exemptions(args.exemptions, plan)
        with tempfile.TemporaryDirectory(prefix="video-pause-audit-") as tmp:
            wav = Path(tmp) / "audio.wav"
            if args.media.suffix.lower() == ".wav":
                shutil.copyfile(args.media, wav)
            else:
                extract_wav_from_media(args.media, wav)
            sr, samples = read_wav_mono(wav)
        silences = find_silences(
            samples, sr, silence_db=args.silence_db, min_silence=args.min_silence
        )
        findings = audit(
            silences, cues, thresholds=thresholds, exemptions=exemptions, plan=plan
        )
    except Exception as exc:  # noqa: BLE001
        print(f"error: {exc}", file=sys.stderr)
        return 2

    unaccepted = sum(not item["accepted"] for item in findings)
    payload = {
        "media": str(args.media),
        "srt": str(args.srt),
        "policy": "review-only; no silence is removed",
        "thresholds_s": thresholds,
        "silence_regions": len(silences),
        "finding_count": len(findings),
        "unaccepted_count": unaccepted,
        "truncated": len(findings) > args.max_findings,
        "findings": findings[: args.max_findings],
    }
    json.dump(payload, sys.stdout, indent=2)
    sys.stdout.write("\n")
    print(
        f"pause audit: {len(findings)} candidates, {unaccepted} unaccepted; listen on clean output",
        file=sys.stderr,
    )
    if args.strict and unaccepted:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

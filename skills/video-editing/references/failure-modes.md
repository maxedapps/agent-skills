# Failure modes and fixes

## TOC
- Join artifacts
- Edge / performance continuity
- Face PiP / crop
- Editorial mistakes
- Caption pitfalls
- Tutorial graphics
- Render / deliverable pitfalls

## Join artifacts

| Symptom | Likely cause | Fix |
|---|---|---|
| `want it to, to. Because` | In-point too early inside stump | Later in-point via energy |
| `review s- in here` | Mid-syllable cut | Move to micro-gap |
| `re- code` / `y- year` | Bad proportional split | Energy snap |
| `to again, to again` | Left repeated lead-in | End first range before lead-in |
| Click/pop | Cut on transient | Nudge ±30–80ms |

## Edge / performance continuity

| Symptom | Likely cause | Fix |
|---|---|---|
| Pause then sudden jump mid-thought | Soft pad on repair/continuation join | Set semantic `join`, use `out: surgical` / `in: tight`, then listen to the assembled seam |
| Mouth/hands start, then cut away | Out-point after prep for deleted attempt | Out earlier at phoneme decay; re-render and listen to the assembled seam |
| Face continues a discarded sentence energy | Same | Tighten; re-check face joins |
| Robot pacing everywhere | Candidate thresholds used as delete targets | Restore natural internal breaths and short sentence/section pauses |
| Authored class changes unexpectedly | Source gap treated as semantic truth or `--force` used | Restore explicit `join`/edges; rerun classifier without `--force` |
| `tighten_edges` reports ambiguous late energy | Energy cannot identify breath/prep semantically | Set the endpoint manually after listening |

## Cadence audit

| Symptom | Likely cause | Fix |
|---|---|---|
| Long same-cue silence flagged | Internal breath/think exceeds continuation review default | Listen on actual clean output; keep if natural, otherwise shorten deliberately |
| Related sentences drag | Inter-cue pause around/above 1.0 s | Review flow and allow a jump cut; never auto-delete all silence |
| Normal/section breaks feel breathless | Review thresholds were mistaken for targets | Restore a short natural pause; document reviewed exceptions |
| Audit context is wrong | Stale SRT or missing semantic plan | Use matching final/preview SRT and pass final `edit-plan.json` |
| Accepted pause still fails strict mode | Exception uses the wrong timeline | Rebuild source exception through the plan or pass output-time exemptions |
| Join WAV contains deleted material | Continuous source interval was auditioned | Use rendered output mode or disjoint source mode in `extract_joins.py` |

## Face PiP / crop

| Symptom | Likely cause | Fix |
|---|---|---|
| Lots of empty space on one side | Single-frame oversized crop | Multi-frame percentile crop; re-center |
| Hands always clipped hard | Crop too tight | Slightly widen using contact sheet |
| Subject tiny in PiP | Crop too wide | Tighten to person-dominant framing |
| Lip sync drift | Bad audio offset | Re-correlate; verify second window |
| Slow multi-hour face render | Random seeks on huge camera file | Sequential window extract then cut |

## Editorial mistakes

| Symptom | Fix |
|---|---|
| Missing teaching beat | Restore keep range |
| Duplicate intros remain | Real-take start too early |
| Illogical jump | Keep bridge sentence |
| Frustration aside remains | Exclude that range |

## Caption pitfalls

| Mistake | Do instead |
|---|---|
| Re-ASR clean cut every iteration | Cut source SRT through keep-list |
| Run editing/render steps for a captions-only request | Transcribe and validate the unedited source; deliver requested text formats only |
| Trust cut-SRT alone for seam phonetics | Energy + join WAVs; optional one final ASR |
| Ship an edited video without final SRT | Editing deliverables require MP4 + SRT |
| Copy/re-encode source video for transcript-only work | Deliver TXT only unless the user requests other artifacts |
| Hand-maintain SRT and VTT separately | Generate VTT from validated SRT only |

## Tutorial graphics

| Symptom | Likely cause | Fix |
|---|---|---|
| Box drifts onto unrelated content | Weak/missing target detections | Sample faster, add keyframes, or fade out on confidence loss |
| Tracker follows its own border | Tracking composited frames | Track clean source frames, then render overlays |
| Screenshot rectangle is offset | Player chrome/letterboxing coordinates | Map to native video pixels and store normalized top-left coordinates |
| Wrong text instance highlighted | OCR selected by string only | Combine text, confidence, and proximity to prior rectangle |
| Font looks wrong | Silent substitution or wrong variable-font weight | Require font path + named variation; fail if unavailable |
| Border covers target despite 1px gap | Stroke-center geometry ignored | Expand centerline by gap plus half border width |
| Long render wasted | Full source rendered before approval | Approve entry/hold/track/exit on the requested short clip first |
| Audio missing or duration off | Incorrect stream map/trim | Map optional source audio, re-encode frame-accurately, verify with `ffprobe` |

## Render / deliverable pitfalls

| Mistake | Do instead |
|---|---|
| Stream-copy cuts | Re-encode trim/concat |
| Deliver 4K master by default | Export optimized **2K** final unless asked otherwise |
| Leave waveforms/sample frames in project root | Keep under `work/`; delete on finish |
| Hand user face-track / window mp4s | Cleanup; only `deliverables/` |
| Overlapping keeps | Fix list; builder should reject |
| No duration check | Final duration ≈ plan kept duration |

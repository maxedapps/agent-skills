# Failure modes and fixes

## TOC
- Join artifacts
- Edge / performance continuity
- Face PiP / crop
- Editorial mistakes
- Caption pitfalls
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
| Pause then sudden jump mid-thought | Soft pad on surgical join | `out: surgical` + `tighten_edges.py` |
| Mouth/hands start, then cut away | Out-point after prep for deleted attempt | Out earlier at phoneme decay; re-listen join WAV |
| Face continues a discarded sentence energy | Same | Tighten; re-check face joins |
| Robot pacing everywhere | Over-tightened section boundaries | Allow `section` breaths |
| classify_joins wrong on long think inside one idea | Gap heuristic only | Manually set `out`/`in` tags |

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
| Trust cut-SRT alone for seam phonetics | Energy + join WAVs; optional one final ASR |
| Ship video without final SRT | Deliverables require mp4 + srt |
| Hand-maintain SRT and VTT separately | Generate VTT from final SRT only |

## Render / deliverable pitfalls

| Mistake | Do instead |
|---|---|
| Stream-copy cuts | Re-encode trim/concat |
| Deliver 4K master by default | Export optimized **2K** final unless asked otherwise |
| Leave waveforms/sample frames in project root | Keep under `work/`; delete on finish |
| Hand user face-track / window mp4s | Cleanup; only `deliverables/` |
| Overlapping keeps | Fix list; builder should reject |
| No duration check | Final duration ≈ plan kept duration |

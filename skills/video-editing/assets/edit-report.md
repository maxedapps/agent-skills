# Edit report — `REPLACE_SOURCE`

## Deliverables
- Video: `deliverables/REPLACE_FINAL_MP4` (2K unless noted)
- SRT: `deliverables/REPLACE_FINAL_SRT`
- VTT: `REPLACE_VTT_OR_none`
- TXT: `REPLACE_TXT_OR_none`

## Result
- Source duration: `REPLACE_SRC_DUR`
- Final duration: `REPLACE_FINAL_DUR`
- Removed: `REPLACE_REMOVED`
- Keep segments: `REPLACE_SEGMENTS`
- Face PiP: `REPLACE_YES_NO` (offset `REPLACE_OFFSET`, crop `REPLACE_CROP`)

## Editorial summary
- Real take start (source): `REPLACE_REAL_TAKE_START`
- Major drops: REPLACE_MAJOR_DROPS
- Join/cadence intent: REPLACE_JOIN_CADENCE_NOTES
- Edge hygiene notes: REPLACE_EDGE_NOTES
- Intentional retained pauses/exemptions: REPLACE_ACCEPTED_PAUSES_OR_none

## Validation
- Preview/final transcript read: yes/no
- `scan_flubs` hard findings: `REPLACE_FLUB_COUNT`
- Assembled seams listened (every actual cut): `REPLACE_JOIN_COUNT` / yes/no
- Cut-adjacent orphan breath/prep findings: `REPLACE_EDGE_FINDINGS_OR_none`
- Clean-output pause audit media + SRT: `REPLACE_MEDIA_AND_SRT`
- Pause candidates: internal `REPLACE_INTERNAL_COUNT`; inter-cue `REPLACE_INTER_COUNT`; unaccepted `REPLACE_UNACCEPTED_COUNT`
- Natural internal breaths preserved / section cadence not breathless: yes/no
- Temps cleaned: yes/no

## Residual risks
- REPLACE_RISKS

## Reproduce (lean)
```bash
# keep-list + plan retained only if present under work/edit/
python3 .agents/skills/video-editing/scripts/build_filter.py ...
bash .agents/skills/video-editing/scripts/export_final_video.sh \
  --input work/edit/master-4k.mp4 \
  --output deliverables/REPLACE_FINAL_MP4
```

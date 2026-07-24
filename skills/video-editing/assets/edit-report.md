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
- Edge policy notes: REPLACE_EDGE_NOTES

## Validation
- Preview/final transcript read: yes/no
- `scan_flubs` hard findings: `REPLACE_FLUB_COUNT`
- Surgical join spot-checks: REPLACE_JOINS
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

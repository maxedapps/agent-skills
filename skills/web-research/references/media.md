# Media research guidance

Read this before analyzing video/audio or extracting visual frames.

## Focus the analysis

Use an available media-capable retrieval or analysis tool. Always pass the user's specific question or instruction so transcript and visual analysis focus on the relevant subject instead of producing only a generic summary.

Record the media URL/file, relevant timestamps, and whether evidence came from transcript, audio, frames, or inference.

## Visual evidence

Use timestamped frames when:

- the answer depends on something shown rather than spoken
- the transcript is missing or ambiguous
- the user asks about an object, screen, slide, gesture, or visual transition
- exact wording, UI state, or layout needs confirmation

Use a timestamp range with several evenly spaced frames when the approximate segment is known but the exact moment is not. Sample the whole video only when no narrower location is available.

## Sufficiency and failure recovery

- Vague answer: rerun with a sharper question and narrower segment.
- Transcript/visual conflict: report the conflict and inspect the relevant frames.
- Exact moment unknown: search transcript cues, then inspect a bounded timestamp range.
- Tool cannot access the media: look for an official transcript, captions, show notes, or another authorized source and state the limitation.
- Do not infer unseen visual details from transcript text alone.

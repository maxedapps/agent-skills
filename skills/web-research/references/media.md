# Media Research Reference

Use this reference before YouTube/local video analysis or frame extraction.

## Video rule

For YouTube and local video, always pass the user's specific question via `prompt`. This focuses transcript and visual analysis on the actual task.

```typescript
fetch_content({
  url: "https://youtube.com/watch?v=abc",
  prompt: "What tools does the speaker recommend for debugging build failures?"
})
```

```typescript
fetch_content({
  url: "/path/to/recording.mp4",
  prompt: "What error message appears on screen before the app crashes?"
})
```

## Visual frames

Use `timestamp` and/or `frames` when visual evidence matters, the transcript is insufficient, or the user asks about something shown on screen.

```typescript
fetch_content({ url: "https://youtube.com/watch?v=abc", timestamp: "23:41" })
fetch_content({ url: "https://youtube.com/watch?v=abc", timestamp: "23:41-25:00", frames: 4 })
```

Use a timestamp range when you know the approximate area but not the exact moment.

## Failure recovery

- Video answer is vague → rerun with a sharper `prompt`.
- Visual details matter → use `timestamp` / `frames` for visual confirmation.
- Exact moment unknown → use a timestamp range with multiple frames.

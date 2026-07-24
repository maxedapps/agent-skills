# Decision rules — content, cadence, and edges

## Mental model

```text
[false starts…][successful performance with local repairs]
```

A keep-list selects successful performances; it is not a silence-removal list.
Decide separately:

1. content that stays;
2. semantic outgoing `join`: `repair`, `continuation`, `sentence`, or `section`;
3. cadence/pause intent;
4. `in`/`out` edge hygiene at an actual cut.

Source-gap duration is only an advisory clue. Deleted material may be long even when
the assembled continuation should be tight.

## Keep / drop

**Drop:** pre-take setup, superseded false starts, abandoned lines, frustration/asides,
lone resets, weaker duplicates, and explicit discards.

**Keep:** successful completion, required teaching bridges, stylistic `uh`/`um` or
rhetorical repeats that sound natural, and short breaths inside uninterrupted speech.

## Semantic join and cadence

Set `join` on the outgoing keep:

| `join` | Meaning | Candidate clean-timeline review threshold |
|---|---|---:|
| `repair` | Removed restart/flub; one thought continues | about 0.7 s |
| `continuation` | Related clause continues | about 0.7 s |
| `sentence` | Closely related sentence | about 1.0 s |
| `section` | Real topic/section transition | about 1.5 s |

Ordinary untagged sentence gaps become review candidates around 1.2 s. These are
practical listening defaults, not auto-delete limits. Shorter can still sound wrong;
longer can be intentional. Prefer smooth flow and allow jump cuts, but never compress
every boundary into breathless pacing.

Use `pause: {"intent":"retained","accepted":true,"reason":"..."}` only after
listening to an intentional outgoing pause. Record reviewed internal source-timeline
exceptions in top-level `accepted_pauses`. `build_filter.py` maps those into the
final plan for `audit_pauses.py`.

## Edge hygiene at every actual cut

`in`/`out` describe the physical cut, not semantics:

| Tag | Policy |
|---|---|
| `out: surgical` | End after the last desired phoneme/release; no orphaned breath or prep for deleted material |
| `out: soft` | Keep a short natural release, then cut cleanly |
| `out: section` | Preserve section cadence, but still remove cut-adjacent prep belonging to a discarded attempt |
| `in: tight` | Land on the first desired attack after a surgical outgoing cut |
| `in: natural` | Keep a slight clean lead-in |

Distinguish:

- **internal breath:** between desired words in uninterrupted kept speech—normally keep;
- **cut-adjacent orphan:** breath, mouth noise, gesture, or speech preparation immediately
  before jumping to another range—remove from every actual cut.

Anti-pattern:

```text
[desired speech][quiet][prep for discarded try] CUT → another take
```

`tighten_edges.py` uses energy only to flag/trim conservative endpoint candidates. It
does not recognize breaths semantically; long/ambiguous late energy stays unresolved.
Listen to every changed and unresolved assembled seam.

## Pads and verification

`build_filter.py` resolves class pads from `_common.py`. Reviewed per-keep numeric
`pad_in`/`pad_out` overrides class and global fallback values and is retained in the
edit plan. Avoid large global padding.

Final cadence approval must use actual clean-output audio with final/preview SRT:

1. render;
2. extract assembled seams from the rendered media/edit plan;
3. listen to every seam, not a continuous source interval containing deleted material;
4. run `audit_pauses.py` for same-cue/internal and inter-cue candidates;
5. listen and shorten only where flow improves; document accepted exceptions.

## Face crop summary

Person-dominant, multi-frame percentile crop, modest hand room. See `face-pip.md`.

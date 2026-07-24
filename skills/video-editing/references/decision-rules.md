# Decision rules — content + edges

## TOC
- Mental model
- Drop / keep
- Edge classes (critical)
- Real take
- Pauses
- Face crop summary

## Mental model

```text
[false starts…][REAL TAKE with local flubs…]
```

Keep-list of **successful performances**, not silence removal.

Axes:
1. What content stays
2. How edges land (no aborted prep)

## Always DROP

- Before real take
- False start intros superseded later
- Abandoned lines when restart follows
- Frustration / off-mic asides
- Lone reset tokens
- Weaker duplicate questions
- Explicit discards (`Nah.`)

## Always KEEP

- Successful completion after stump/restart
- Bridge lines needed for teaching continuity

## Usually KEEP (style)

- `uh`/`um`, rhetorical repeats, short breaths **inside finished thoughts**

## Edge classes (critical)

Set on each keep (`classify_joins.py` helps; override when wrong):

| `out` | Meaning | Tail policy |
|---|---|---|
| `surgical` | Mid-phrase fix / tight continuation after removed restart | End on last good phoneme (+ tiny release). **No** trailing breath into next attempt |
| `soft` | Normal sentence boundary | Short natural release |
| `section` | Topic change | Allow a real breath |

| `in` | Meaning |
|---|---|
| `tight` | Land on first good attack (after surgical previous) |
| `natural` | Slight lead-in OK |

### Anti-pattern

```text
[good ending][silence][mouth/hands start next try] CUT → other take
```

Fix: pull `end` earlier (`tighten_edges.py` + manual check).

### Pads

`build_filter.py` applies small pads from tags (`PAD_IN`/`PAD_OUT` in `_common.py`). Do not use large global `pad_out`.

## Real take

First intro that continues into the full unique body without starting over.

## Pauses

| Kind | Action |
|---|---|
| In deleted ranges | Gone |
| Long thinks between ideas | Exclude |
| Inside finished thought | Keep |
| Prep before cut to other take | **Remove** |
| Section boundary | Short breath OK |

## Face crop summary

Person-dominant, multi-frame percentile crop, modest hand room. See `face-pip.md`.

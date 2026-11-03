# 0001 A real Squarespace site is the oracle, watched as a black box

Date: 2026-11-03 · Status: accepted

```
oracle: halibut-keyboard-jlhd.squarespace.com      ours: app/
  published CSS, block boxes, editor DOM  ──read──►  fixtures/, traces/
  one gesture, then undo                  ──diff──►  same end state?
```

## Context

We want an editor that behaves like Fluid Engine, 1:1. The only public engineering source is the 2022 post [Developing Fluid Engine](https://engineering.squarespace.com/blog/2022/developing-fluid-engine). It explains row stretch, the guardrails and the normalization before a drag, and leaves most details out. Guessing the rest would drift.

## Decision

A Squarespace trial site is the oracle. We read what it publishes and what its editor puts in the DOM, through a cmux browser tab, and compare our editor against it with three gates ([0002](0002-three-gates.md)).

We copy behaviour, never code. No Squarespace JavaScript, stylesheets, fonts or images go into this repo. Fixtures in git hold section CSS only, which is ids and grid numbers. Raw pages stay in `fixtures/raw/`, which git ignores.

On the trial site we read state, do one gesture, read state and undo. Saving the trial site happens only in milestone steps that say so, starting with M1.

## Considered

- **Build from the blog post and help pages alone.** Rejected: 22 items have no public answer.
- **Deobfuscate the editor's JavaScript.** Rejected: copying a product's code is a licence and terms risk, and it would tie us to one build.

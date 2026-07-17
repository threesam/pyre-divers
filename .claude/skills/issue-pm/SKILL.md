---
name: issue-pm
description: Use when working in a repo where ideas, decisions, and future work must be tracked as GitHub issues — the agent acts as an automated project manager, opening context-rich issues the moment threads appear and keeping them in sync as work progresses.
---

# issue-pm — the agent as project manager

chat context evaporates. issues don't. the repo's issue tracker is the durable
memory of everything decided but not yet done — so the human never has to
re-explain a thread, and any future session (or person) can pick up mid-story.

## when to open an issue

open one, without being asked, whenever:

- a feature is deferred ("we'll add it when it's there").
- a decision creates follow-up work owned by a human (rename this, buy that,
  log into the thing).
- a workaround ships that has a known better version (document the upgrade
  path in the issue, not in a comment).
- an idea worth keeping surfaces mid-conversation — including content ideas.
  a blog-post seed is an issue with the receipts and a rough draft in it.
- work is blocked on credentials, scopes, or access only the human can grant.

one thread, one issue. don't bundle.

## anatomy of an issue

- **title:** terse, prefixed by domain (`rss:`, `ci:`, `domain:`), states the
  action not the wish.
- **context:** everything a cold reader needs — what happened, why it's not
  done, exact identifiers (uuids, branch names, file paths, prices, dates).
  write it so the chat transcript is never required.
- **done when:** the observable end state, not a task list.
- **receipts:** for content-seed issues, include the raw material — numbers,
  failures, reversals, quotes — and a rough draft the owner can rewrite.
  polish is theirs; preservation is yours.
- **voice:** write issues in the repo owner's register, not corporate PM-ese.

## keeping them in sync

- reference issues in commit messages when work advances them; close with the
  commit that finishes them (`closes #N`).
- when a contract changes (an api shape, an endpoint, a name), update every
  open issue the change touches — stale issues are worse than none.
- when a blocked issue unblocks (credentials granted, dependency shipped),
  say so on the issue and act.
- at natural pauses, reconcile: does the tracker reflect reality? anything
  done-but-open, open-but-abandoned, discussed-but-untracked?

## what not to do

- don't open issues for work you're doing right now — do it.
- don't paste chat logs; distill.
- don't let the tracker become a wish list. every issue is either actionable
  or closed.

#!/usr/bin/env bash
#
# Copy approved rules and specs from the Obsidian vault into this repo.
#
# The vault is authoritative; rules/ and specs/ here are byte-identical
# snapshots. Run this after a spec is approved in the vault, then review
# the diff and commit.
#
#   ./scripts/handoff.sh              # copy, then verify
#   ./scripts/handoff.sh --check      # verify only, change nothing
#
# Override the vault location with VAULT=/some/path ./scripts/handoff.sh

set -euo pipefail

VAULT="${VAULT:-$HOME/Documents/Files/Work/shipwright-dev/obsidian.md/shipwright-dev/penta-project}"
REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CHECK_ONLY=false
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=true

if [[ ! -d "$VAULT" ]]; then
  echo "Vault not found: $VAULT" >&2
  echo "Set VAULT=/path/to/penta-project and try again." >&2
  exit 1
fi

if [[ "$CHECK_ONLY" == false ]]; then
  echo "Copying from $VAULT"
  mkdir -p "$REPO/specs/mechanics" "$REPO/specs/modules" "$REPO/specs/phases" "$REPO/rules/games"

  # Mirror, deleting repo-side files the vault no longer has, so a renamed
  # or removed spec doesn't linger here pretending to be current.
  rsync -a --delete "$VAULT/specs/"      "$REPO/specs/"
  rsync -a --delete "$VAULT/game-rule/games/" "$REPO/rules/games/"
  cp "$VAULT/game-rule/penta.md" "$REPO/rules/penta.md"
fi

echo "Verifying..."
fail=0
diff -r "$VAULT/specs"            "$REPO/specs"       || fail=1
diff -r "$VAULT/game-rule/games"  "$REPO/rules/games" || fail=1
diff    "$VAULT/game-rule/penta.md" "$REPO/rules/penta.md" || fail=1

if [[ $fail -ne 0 ]]; then
  echo
  echo "DRIFT: repo copies differ from the vault (see diff above)."
  echo "Fix in the vault, never here, then re-run." >&2
  exit 1
fi

echo "OK — rules/ and specs/ are identical to the vault."
[[ "$CHECK_ONLY" == false ]] && echo "Review 'git status' and commit."
exit 0

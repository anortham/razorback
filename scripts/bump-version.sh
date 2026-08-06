#!/usr/bin/env bash
#
# bump-version.sh — bump version numbers across all declared files,
# with drift detection and repo-wide audit for missed files.
#
# Usage:
#   bump-version.sh <new-version>       Bump all declared files to new version
#   bump-version.sh --check             Report current versions (detect drift)
#   bump-version.sh --check <version>   Also require the agreed version to equal <version>
#   bump-version.sh --audit             Check + grep repo for old version strings
#   bump-version.sh --release [version] Publish the GitHub release for tag v<version>
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG="$REPO_ROOT/.version-bump.json"

if [[ ! -f "$CONFIG" ]]; then
  echo "error: .version-bump.json not found at $CONFIG" >&2
  exit 1
fi

# --- helpers ---

# Convert a dotted field path to a jq path: "plugins.0.version" -> .plugins[0].version
jq_path() {
  echo "$1" | sed -E 's/\.([0-9]+)/[\1]/g' | sed 's/^/./' | sed 's/\.\././g'
}

# Read a dotted field path from a JSON file.
# Handles both simple ("version") and nested ("plugins.0.version") paths.
read_json_field() {
  local file="$1" field="$2"
  jq -r "$(jq_path "$field")" "$file"
}

# Write a dotted field path in a JSON file, preserving formatting.
write_json_field() {
  local file="$1" field="$2" value="$3"
  local tmp="${file}.tmp"
  jq "$(jq_path "$field") = \"$value\"" "$file" > "$tmp" && mv "$tmp" "$file"
}

# Read the list of declared files from config.
# Outputs lines of "path<TAB>field"
declared_files() {
  jq -r '.files[] | "\(.path)\t\(.field)"' "$CONFIG"
}

# Read the audit exclude patterns from config.
audit_excludes() {
  jq -r '.audit.exclude[]' "$CONFIG" 2>/dev/null
}

# Read the commit-subject patterns that release notes drop (extended regex).
release_excluded_subjects() {
  jq -r '.release.excludeSubjects[]?' "$CONFIG" 2>/dev/null
}

# The agreed version across declared files, or empty when they disagree.
agreed_version() {
  local versions
  versions=$(
    while IFS=$'\t' read -r path field; do
      local fullpath="$REPO_ROOT/$path"
      [[ -f "$fullpath" ]] && read_json_field "$fullpath" "$field"
    done < <(declared_files) | sort -u
  )
  [[ $(printf '%s\n' "$versions" | wc -l | tr -d ' ') -eq 1 ]] && printf '%s\n' "$versions"
}

# --- commands ---

cmd_check() {
  local expected="${1:-}"
  local has_drift=0
  local versions=()

  echo "Version check:"
  echo ""

  while IFS=$'\t' read -r path field; do
    local fullpath="$REPO_ROOT/$path"
    if [[ ! -f "$fullpath" ]]; then
      printf "  %-45s  MISSING\n" "$path ($field)"
      has_drift=1
      continue
    fi
    local ver
    ver=$(read_json_field "$fullpath" "$field")
    printf "  %-45s  %s\n" "$path ($field)" "$ver"
    versions+=("$ver")
  done < <(declared_files)

  echo ""

  # Check if all versions match
  local unique
  unique=$(printf '%s\n' "${versions[@]}" | sort -u | wc -l | tr -d ' ')
  if [[ "$unique" -gt 1 ]]; then
    echo "DRIFT DETECTED — versions are not in sync:"
    printf '%s\n' "${versions[@]}" | sort | uniq -c | sort -rn | while read -r count ver; do
      echo "  $ver ($count files)"
    done
    has_drift=1
  else
    echo "All declared files are in sync at ${versions[0]}"
  fi

  # Mutual agreement cannot catch manifests that went stale together. When an
  # expected version is supplied (release tags pass one), the agreed version is
  # compared against that external truth.
  if [[ -n "$expected" && "$has_drift" -eq 0 ]]; then
    if [[ "${versions[0]}" != "$expected" ]]; then
      echo "VERSION MISMATCH — declared files are at ${versions[0]}, expected $expected"
      has_drift=1
    else
      echo "Declared version matches expected $expected"
    fi
  fi

  return $has_drift
}

cmd_audit() {
  # First run check. Drift in the declared manifests is a hard failure: remember
  # it and propagate it as the audit's exit status (CI gates on --audit).
  local check_status=0
  cmd_check || check_status=$?
  echo ""

  # Determine the current version (most common across declared files)
  local current_version
  current_version=$(
    while IFS=$'\t' read -r path field; do
      local fullpath="$REPO_ROOT/$path"
      [[ -f "$fullpath" ]] && read_json_field "$fullpath" "$field"
    done < <(declared_files) | sort | uniq -c | sort -rn | head -1 | awk '{print $2}'
  )

  if [[ -z "$current_version" ]]; then
    echo "error: could not determine current version" >&2
    return 1
  fi

  echo "Audit: scanning repo for version string '$current_version'..."
  echo ""

  # Build grep exclude args
  local -a exclude_args=()
  while IFS= read -r pattern; do
    exclude_args+=("--exclude=$pattern" "--exclude-dir=$pattern")
  done < <(audit_excludes)

  # Also always exclude binary files and .git
  exclude_args+=("--exclude-dir=.git" "--exclude-dir=node_modules" "--binary-files=without-match")

  # Get list of declared paths for comparison
  local -a declared_paths=()
  while IFS=$'\t' read -r path _field; do
    declared_paths+=("$path")
  done < <(declared_files)

  # Grep for the version string
  local found_undeclared=0
  while IFS= read -r match; do
    local match_file
    match_file=$(echo "$match" | cut -d: -f1)
    # Make path relative to repo root
    local rel_path="${match_file#$REPO_ROOT/}"

    # Check if this file is in the declared list
    local is_declared=0
    for dp in "${declared_paths[@]}"; do
      if [[ "$rel_path" == "$dp" ]]; then
        is_declared=1
        break
      fi
    done

    if [[ "$is_declared" -eq 0 ]]; then
      if [[ "$found_undeclared" -eq 0 ]]; then
        echo "UNDECLARED files containing '$current_version':"
        found_undeclared=1
      fi
      echo "  $match"
    fi
  done < <(grep -rn "${exclude_args[@]}" -F "$current_version" "$REPO_ROOT" 2>/dev/null || true)

  if [[ "$found_undeclared" -eq 0 ]]; then
    echo "No undeclared files contain the version string. All clear."
  else
    echo ""
    echo "Review the above files — if they should be bumped, add them to .version-bump.json"
    echo "If they should be skipped, add them to the audit.exclude list."
  fi

  # Undeclared references are advisory (prose may legitimately mention the
  # version); only declared-manifest drift fails the audit.
  return $check_status
}

cmd_bump() {
  local new_version="$1"

  # Validate semver-ish format
  if ! echo "$new_version" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+'; then
    echo "error: '$new_version' doesn't look like a version (expected X.Y.Z)" >&2
    exit 1
  fi

  echo "Bumping all declared files to $new_version..."
  echo ""

  while IFS=$'\t' read -r path field; do
    local fullpath="$REPO_ROOT/$path"
    if [[ ! -f "$fullpath" ]]; then
      echo "  SKIP (missing): $path"
      continue
    fi
    local old_ver
    old_ver=$(read_json_field "$fullpath" "$field")
    write_json_field "$fullpath" "$field" "$new_version"
    printf "  %-45s  %s -> %s\n" "$path ($field)" "$old_ver" "$new_version"
  done < <(declared_files)

  echo ""
  echo "Done. Running audit to check for missed files..."
  echo ""
  cmd_audit
}

# --- release ---

git_in_repo() {
  git -C "$REPO_ROOT" rev-parse --git-dir >/dev/null 2>&1
}

# Prove the tagged commit itself declares the version being released. Checking
# the working tree instead would pass for whatever is checked out right now,
# which says nothing about an older tag being back-filled.
verify_tag_manifests() {
  local tag="$1" version="$2" mismatch=0

  echo "Manifest check at $tag:"
  echo ""
  while IFS=$'\t' read -r path field; do
    local blob ver
    if ! blob=$(git -C "$REPO_ROOT" show "$tag:$path" 2>/dev/null); then
      printf "  %-45s  MISSING\n" "$path ($field)"
      mismatch=1
      continue
    fi
    ver=$(printf '%s' "$blob" | jq -r "$(jq_path "$field")")
    printf "  %-45s  %s\n" "$path ($field)" "$ver"
    if [[ "$ver" != "$version" ]]; then
      mismatch=1
    fi
  done < <(declared_files)

  echo ""
  return $mismatch
}

# Commit trailers carry session and authorship metadata that release notes drop.
strip_trailers() {
  grep -vE '^(Claude-Session|Co-Authored-By|Co-authored-by|Signed-off-by|Change-Id): ' || true
}

# Drop leading and trailing blank lines, keep interior ones.
trim_blank_lines() {
  awk '
    /^[[:space:]]*$/ { pending++; next }
    { while (started && pending-- > 0) print ""; pending = 0; started = 1; print }
  '
}

release_title() {
  local version="$1" subject="$2" prefix="release: $version "
  if [[ "$subject" == "$prefix"* ]]; then
    echo "v$version — ${subject#"$prefix"}"
  else
    echo "v$version"
  fi
}

# Body of the tagged commit, minus its subject line and trailers.
release_prose() {
  local tag="$1"
  git -C "$REPO_ROOT" log -1 --pretty=format:'%b' "$tag^{commit}" | strip_trailers | trim_blank_lines
}

# One bullet per non-merge commit since the previous tag, oldest first, skipping
# the release commit itself and any subject the config excludes.
release_bullets() {
  local tag="$1" version="$2"
  local previous range
  previous=$(git -C "$REPO_ROOT" describe --tags --abbrev=0 "$tag^" 2>/dev/null || true)
  if [[ -n "$previous" ]]; then
    range="$previous..$tag"
  else
    range="$tag"
  fi

  local filter_re
  filter_re=$(release_excluded_subjects | paste -sd '|' -)

  git -C "$REPO_ROOT" log --no-merges --reverse --pretty=format:'%s' "$range" | while IFS= read -r subject; do
    if [[ "$subject" == "release: $version"* ]]; then
      continue
    fi
    if [[ -n "$filter_re" ]] && echo "$subject" | grep -qE "$filter_re"; then
      continue
    fi
    echo "- $subject"
  done
}

release_notes() {
  local tag="$1" version="$2"
  local prose bullets
  prose=$(release_prose "$tag")
  bullets=$(release_bullets "$tag" "$version")

  if [[ -n "$prose" && -n "$bullets" ]]; then
    printf '%s\n\n## Changes\n\n%s\n' "$prose" "$bullets"
  elif [[ -n "$prose" ]]; then
    printf '%s\n' "$prose"
  elif [[ -n "$bullets" ]]; then
    printf '%s\n' "$bullets"
  else
    printf '%s\n' "- $(git -C "$REPO_ROOT" log -1 --pretty=format:'%s' "$tag^{commit}")"
  fi
}

cmd_release() {
  local version="" notes_override="" dry_run=0

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run) dry_run=1 ;;
      --notes-file)
        shift
        notes_override="${1:-}"
        if [[ -z "$notes_override" ]]; then
          echo "error: --notes-file needs a path" >&2
          exit 1
        fi
        ;;
      --*)
        echo "error: unknown --release flag '$1'" >&2
        exit 1
        ;;
      *)
        version="$1"
        ;;
    esac
    shift
  done

  if ! git_in_repo; then
    echo "error: --release needs a git repository at $REPO_ROOT" >&2
    exit 1
  fi

  if [[ -z "$version" ]]; then
    version=$(agreed_version)
    if [[ -z "$version" ]]; then
      echo "error: declared manifests disagree — run --check and fix the drift first" >&2
      exit 1
    fi
  fi

  local tag="v$version"

  if ! git -C "$REPO_ROOT" rev-parse -q --verify "refs/tags/$tag" >/dev/null; then
    echo "error: tag $tag does not exist locally" >&2
    echo "  create it with: git tag -a $tag -m 'release: $version'" >&2
    exit 1
  fi

  if ! verify_tag_manifests "$tag" "$version"; then
    echo "error: $tag does not declare version $version — release aborted" >&2
    exit 1
  fi

  local subject title notes_file
  subject=$(git -C "$REPO_ROOT" log -1 --pretty=format:'%s' "$tag^{commit}")
  title=$(release_title "$version" "$subject")

  if [[ -n "$notes_override" ]]; then
    if [[ ! -f "$notes_override" ]]; then
      echo "error: notes file not found: $notes_override" >&2
      exit 1
    fi
    notes_file="$notes_override"
  else
    notes_file=$(mktemp "${TMPDIR:-/tmp}/razorback-release-XXXXXX.md")
    release_notes "$tag" "$version" > "$notes_file"
  fi

  if [[ "$dry_run" -eq 1 ]]; then
    echo "DRY RUN — nothing published."
    echo ""
    echo "  tag:    $tag"
    echo "  title:  $title"
    echo ""
    echo "--- notes ---"
    cat "$notes_file"
    echo "--- end notes ---"
    echo ""
    echo "Publish-only checks skipped: clean tree, gh auth, pushed tag, existing release."
    [[ -z "$notes_override" ]] && rm -f "$notes_file"
    return 0
  fi

  if [[ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]]; then
    echo "error: working tree is dirty — commit or stash before releasing" >&2
    exit 1
  fi

  if ! command -v gh >/dev/null 2>&1; then
    echo "error: gh CLI not found — install it or create the release by hand" >&2
    exit 1
  fi

  if ! gh auth status >/dev/null 2>&1; then
    echo "error: gh is not authenticated — run 'gh auth login'" >&2
    exit 1
  fi

  if [[ -z "$(git -C "$REPO_ROOT" ls-remote --tags origin "refs/tags/$tag" 2>/dev/null)" ]]; then
    echo "error: tag $tag is not on origin" >&2
    echo "  push it with: git push origin $tag" >&2
    exit 1
  fi

  if (cd "$REPO_ROOT" && gh release view "$tag" >/dev/null 2>&1); then
    echo "error: release $tag already exists — edit it with 'gh release edit $tag'" >&2
    exit 1
  fi

  # Back-filled releases must not steal the Latest badge from a newer tag.
  local newest latest_flag
  newest=$(git -C "$REPO_ROOT" tag --sort=-v:refname | head -1)
  if [[ "$newest" == "$tag" ]]; then
    latest_flag="--latest"
  else
    latest_flag="--latest=false"
  fi

  echo "Publishing $tag as \"$title\"..."
  (cd "$REPO_ROOT" && gh release create "$tag" --verify-tag --title "$title" \
    --notes-file "$notes_file" "$latest_flag")

  [[ -z "$notes_override" ]] && rm -f "$notes_file"
}

# --- main ---

case "${1:-}" in
  --check)
    cmd_check "${2:-}"
    ;;
  --audit)
    cmd_audit
    ;;
  --release)
    shift
    cmd_release "$@"
    ;;
  --help|-h|"")
    echo "Usage: bump-version.sh <new-version> | --check [expected-version] | --audit"
    echo "       bump-version.sh --release [version] [--dry-run] [--notes-file PATH]"
    echo ""
    echo "  <new-version>       Bump all declared files to the given version"
    echo "  --check             Show current versions, detect drift"
    echo "  --check <version>   Also require the agreed version to equal <version>"
    echo "  --audit             Check + scan repo for undeclared version references"
    echo "  --release           Publish the GitHub release for tag v<version>"
    echo "                      (defaults to the agreed manifest version)"
    echo "    --dry-run         Print the title and notes, publish nothing"
    echo "    --notes-file PATH Publish hand-written notes instead of generated ones"
    echo ""
    echo "Release order: bump -> commit -> git tag -a vX.Y.Z -> git push --follow-tags"
    echo "               -> bump-version.sh --release"
    exit 0
    ;;
  --*)
    echo "error: unknown flag '$1'" >&2
    exit 1
    ;;
  *)
    cmd_bump "$1"
    ;;
esac

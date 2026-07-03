#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CALLER_PWD="$PWD"

OUTPUT_PATH=""
FORMAT=""
REF="HEAD"
ALLOW_DIRTY=0
KEEP_STAGE=0
STAGE_DIR=""

ARCHIVE_PATHS=(
  ".codex-plugin/plugin.json"
  "assets"
  "skills"
  "README.md"
  "LICENSE"
)

usage() {
  cat <<'EOF'
Usage: package-codex-plugin.sh --output PATH [--format zip|tar.gz] [--ref REF] [--allow-dirty] [--keep-stage]

Build a rootless Codex-only plugin archive from committed git content.

Required:
  --output PATH       Write the archive to PATH

Optional:
  --format FORMAT     Archive format: zip or tar.gz
  --ref REF           Git ref to package (default: HEAD)
  --allow-dirty       Allow packaging when the worktree is dirty
  --keep-stage        Extract the final archive to a temp directory and keep it
  --help              Show this help text
EOF
}

die() {
  echo "error: $*" >&2
  exit 1
}

make_abs_path() {
  local value="$1"
  if [[ "$value" = /* ]]; then
    printf '%s\n' "$value"
    return
  fi
  printf '%s/%s\n' "$CALLER_PWD" "$value"
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || die "required command not found: $1"
}

path_exists_in_ref() {
  local ref="$1"
  local git_path="$2"
  git -C "$REPO_ROOT" cat-file -e "${ref}:${git_path}" 2>/dev/null
}

tree_has_entries_in_ref() {
  local ref="$1"
  local git_path="$2"
  [[ -n "$(git -C "$REPO_ROOT" ls-tree -r --name-only "$ref" -- "$git_path")" ]]
}

compute_sha256() {
  local file_path="$1"
  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$file_path" | awk '{print $1}'
    return
  fi
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file_path" | awk '{print $1}'
    return
  fi
  if command -v openssl >/dev/null 2>&1; then
    openssl dgst -sha256 -r "$file_path" | awk '{print $1}'
    return
  fi
  die "no SHA-256 tool found (tried shasum, sha256sum, openssl)"
}

extract_stage() {
  local format="$1"
  local archive_path="$2"
  STAGE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/razorback-codex-plugin-stage.XXXXXX")"

  case "$format" in
    zip)
      require_command unzip
      unzip -q "$archive_path" -d "$STAGE_DIR"
      ;;
    tar.gz)
      require_command tar
      tar -xzf "$archive_path" -C "$STAGE_DIR"
      ;;
    *)
      die "unsupported stage extraction format: $format"
      ;;
  esac
}

cleanup() {
  if [[ "$KEEP_STAGE" -eq 0 && -n "$STAGE_DIR" && -d "$STAGE_DIR" ]]; then
    rm -rf "$STAGE_DIR"
  fi
}

trap cleanup EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --output)
      [[ $# -ge 2 ]] || die "--output requires a path"
      OUTPUT_PATH="$(make_abs_path "$2")"
      shift 2
      ;;
    --format)
      [[ $# -ge 2 ]] || die "--format requires zip or tar.gz"
      FORMAT="$2"
      shift 2
      ;;
    --ref)
      [[ $# -ge 2 ]] || die "--ref requires a git ref"
      REF="$2"
      shift 2
      ;;
    --allow-dirty)
      ALLOW_DIRTY=1
      shift
      ;;
    --keep-stage)
      KEEP_STAGE=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

[[ -n "$OUTPUT_PATH" ]] || die "--output is required"

if [[ -z "$FORMAT" ]]; then
  case "$OUTPUT_PATH" in
    *.tar.gz|*.tgz)
      FORMAT="tar.gz"
      ;;
    *)
      FORMAT="zip"
      ;;
  esac
fi

case "$FORMAT" in
  zip|tar.gz)
    ;;
  *)
    die "unsupported format: $FORMAT (expected zip or tar.gz)"
    ;;
esac

require_command git

[[ -d "$REPO_ROOT/.git" || -f "$REPO_ROOT/.git" ]] || die "not a git worktree: $REPO_ROOT"

git -C "$REPO_ROOT" rev-parse --verify "${REF}^{commit}" >/dev/null 2>&1 || die "unknown ref: $REF"

if [[ "$ALLOW_DIRTY" -eq 0 && -n "$(git -C "$REPO_ROOT" status --porcelain --untracked-files=all)" ]]; then
  die "working tree is dirty; re-run with --allow-dirty to package committed content from $REF"
fi

path_exists_in_ref "$REF" ".codex-plugin/plugin.json" || die ".codex-plugin/plugin.json is missing at $REF"
path_exists_in_ref "$REF" "assets/razorback-small.svg" || die "assets/razorback-small.svg is missing at $REF"
path_exists_in_ref "$REF" "assets/app-icon.png" || die "assets/app-icon.png is missing at $REF"
path_exists_in_ref "$REF" "README.md" || die "README.md is missing at $REF"
path_exists_in_ref "$REF" "LICENSE" || die "LICENSE is missing at $REF"
tree_has_entries_in_ref "$REF" "skills" || die "skills/ is empty or missing at $REF"

mkdir -p "$(dirname "$OUTPUT_PATH")"
rm -f "$OUTPUT_PATH"

ARCHIVE_MTIME="$(git -C "$REPO_ROOT" show -s --format=%cI "$REF")"

# `git archive --mtime` normalizes entry timestamps for reproducible output but
# was only added in git 2.32. Probe support (capturing the help text so the
# non-zero exit of `-h` under `set -o pipefail` does not abort the script) and
# fall back gracefully on older git — the archive still carries the commit
# timestamp from ARCHIVE_MTIME's source, just un-normalized.
archive_args=(--format="$FORMAT" --output="$OUTPUT_PATH")
archive_help="$(git -C "$REPO_ROOT" archive -h 2>&1 || true)"
if printf '%s\n' "$archive_help" | grep -q -- '--mtime'; then
  archive_args+=(--mtime="$ARCHIVE_MTIME")
else
  echo "warning: this git lacks 'git archive --mtime' (needs git >= 2.32); archive timestamps will not be normalized" >&2
fi

git -C "$REPO_ROOT" archive "${archive_args[@]}" "$REF" "${ARCHIVE_PATHS[@]}"

if [[ "$KEEP_STAGE" -eq 1 ]]; then
  extract_stage "$FORMAT" "$OUTPUT_PATH"
fi

SHA256="$(compute_sha256 "$OUTPUT_PATH")"

printf 'Archive: %s\n' "$OUTPUT_PATH"
printf 'Format: %s\n' "$FORMAT"
printf 'SHA-256: %s\n' "$SHA256"

if [[ "$KEEP_STAGE" -eq 1 ]]; then
  printf 'Stage: %s\n' "$STAGE_DIR"
fi

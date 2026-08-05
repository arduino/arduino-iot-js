#!/usr/bin/env bash
# Resolve "other" licenses by fetching the license info from the NPM registry.
# Usage: ./scripts/resolve-missing-licenses.sh
# Dependencies: bash 4+, curl, jq
set -euo pipefail

# ── Spinner ──────────────────────────────────────────────────────────────────

_spin_frames=('⠋' '⠙' '⠹' '⠸' '⠼' '⠴' '⠦' '⠧' '⠇' '⠏')
_spin_i=0

spinner_tick() {
  local msg=$1
  printf '\r  %s %s' "${_spin_frames[$((_spin_i % ${#_spin_frames[@]}))]}" "$msg"
  _spin_i=$((_spin_i + 1))
}

spinner_clear() { printf '\r\033[K'; }

# Runs a command in the background, shows a spinner, then captures its output.
# Usage: with_spinner <msg> <output_var> -- <cmd> [args...]
with_spinner() {
  local msg=$1 outvar=$2
  shift 3  # skip msg, outvar, and '--'
  local tmpfile
  tmpfile=$(mktemp)
  "$@" >"$tmpfile" 2>/dev/null &
  local pid=$!
  while kill -0 "$pid" 2>/dev/null; do
    spinner_tick "$msg"
    sleep 0.08
  done
  wait "$pid"
  spinner_clear
  printf -v "$outvar" '%s' "$(cat "$tmpfile")"
  rm -f "$tmpfile"
}

# ── Collect files ─────────────────────────────────────────────────────────────

mapfile -t files < <(grep -rl '^license: other' .licenses/ 2>/dev/null | sort)
total=${#files[@]}

if (( total == 0 )); then
  echo "No files to process."
  exit 0
fi

echo "Found $total file(s) with unresolved 'other' license."
echo ""

count=0
updated=0
failed=0

# ── Process each file ─────────────────────────────────────────────────────────

for file in "${files[@]}"; do
  count=$((count + 1))

  package_name=$(grep -m1 '^name: ' "$file" | sed 's/^name: //' | tr -d '\r"' || true)
  if [ -z "$package_name" ] || [ "$package_name" = "null" ]; then
    echo "  ✗ [$count/$total] $file — no valid package name, skipping"
    failed=$((failed + 1))
    continue
  fi

  version=$(grep -m1 '^version: ' "$file" | sed 's/^version: //' | tr -d '\r"' || true)
  if [ -z "$version" ] || [ "$version" = "null" ]; then
    echo "  ✗ [$count/$total] $package_name — no valid version, skipping"
    failed=$((failed + 1))
    continue
  fi

  registry_url="https://registry.npmjs.org/$package_name/$version"

  with_spinner "[$count/$total] Fetching $package_name@$version ..." registry_data \
    -- curl --max-time 10 -s "$registry_url"

  if ! printf '%s' "$registry_data" | jq -e . >/dev/null 2>&1; then
    echo "  ✗ [$count/$total] $package_name@$version — failed to fetch registry data"
    failed=$((failed + 1))
    continue
  fi

  got_license=$(printf '%s' "$registry_data" | jq -r '
    .license |
    if type == "string" then .
    elif type == "object" then .type
    elif type == "array" then (.[0].type // .[0])
    else empty end
  ' 2>/dev/null || true)

  if [ -n "$got_license" ] && [ "$got_license" != "null" ]; then
    norm_license=$(printf '%s' "$got_license" | tr '[:upper:]' '[:lower:]')
    # Portable in-place sed: write to tmp then move (avoids macOS/Linux sed -i differences).
    # Use | as delimiter since license strings can contain /.
    local_tmp=$(mktemp)
    sed "s|^license: other$|license: ${norm_license}|" "$file" > "$local_tmp"
    mv "$local_tmp" "$file"
    echo "  ✓ [$count/$total] $package_name@$version → $norm_license"
    updated=$((updated + 1))
  else
    echo "  ✗ [$count/$total] $package_name@$version — could not resolve license from registry"
    failed=$((failed + 1))
  fi
done

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
echo "Done. Updated: $updated  |  Failed: $failed  |  Total: $total"

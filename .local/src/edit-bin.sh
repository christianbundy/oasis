#!/bin/sh
if [ -z "${1}" ]; then
  echo "Usage: new-bin <name>"
  exit 1
fi

new_bin_path=~/.local/bin/${1}

"$VISUAL" "$new_bin_path"

if [ -f "$new_bin_path" ]; then
  chmod +x "$new_bin_path"
fi

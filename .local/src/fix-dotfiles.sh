#!/bin/sh

echo "shfmt"
#shellcheck disable=SC2046
shfmt -s -w $(git ls-files | grep -E '(Dockerfile|sh|zsh(rc)?|bash(rc)?)$')

echo "prettier"
for f in $(git ls-files); do
  if [ -f "$f" ]; then
    echo "$f"
  fi
done | xargs npx prettier --write --ignore-unknown

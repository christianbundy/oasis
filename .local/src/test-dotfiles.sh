#!/bin/sh

cd "$HOME" || exit 1
docker build .
hash="$(docker build -q .)"

echo "docker -> zsh"
docker run "$hash" zsh .zshrc || exit 1

echo "docker -> bash"
docker run "$hash" bash .bashrc || exit 1

echo "docker -> script"

docker run -it "$hash" zsh -i -c '
  set -e

  ls --tree
  command-exists $(git config --get core.pager)
  git init
  echo hi > foo-bar-file

  set +e
  git add foo-bar-file 2>/dev/null
  set -e

  git diff --staged --stat | grep foo-bar-file && exit 1
  git allow foo-bar-file
  git add foo-bar-file
  git diff --staged --stat | grep foo-bar-file || exit 1
  git diff --staged
' || exit 1

echo "shfmt"
#shellcheck disable=SC2046
shfmt -s -d $(git ls-files | grep -E '(Dockerfile|sh|zsh(rc)?|bash(rc)?)$') || exit 1

echo "shellcheck"
git ls-files | grep -E '\.(sh|bash(rc)?)$' | xargs -L1 shellcheck

echo "prettier"
for f in $(git ls-files); do
  if [ -f "$f" ]; then
    echo "$f"
  fi
done | xargs npx prettier --check --ignore-unknown

# was going to use `file` but `file -E` is unsupported :(
echo "check permissions / symlinks"
#shellcheck disable=SC2046
for f in $(git ls-files); do
  if [ ! -d "$f" ]; then
    if ! cat "$f" 1>/dev/null 2>&1; then
      exec cat "$f"
    fi
  fi
done

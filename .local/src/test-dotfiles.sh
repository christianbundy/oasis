#!/bin/sh

cd "$HOME" || exit 1
docker build .
hash="$(docker build -q .)"

echo "docker -> zsh"
docker run "$hash" zsh .zshrc || exit 1

echo "docker -> bash"
docker run "$hash" bash .bashrc || exit 1

echo "shfmt"
#shellcheck disable=SC2046
shfmt -s -d $(git ls-files | grep -E '(Dockerfile|sh|zsh(rc)?|bash(rc)?)$') || exit 1

echo "shellcheck"
git ls-files | grep -E '\.(sh|bash(rc)?)$' | xargs -L1 shellcheck

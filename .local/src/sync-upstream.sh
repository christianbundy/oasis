#!/bin/sh

remote="$(git remote show | head -n 1)"
git fetch "$remote"

branch="$(git remote show "$remote" | grep 'HEAD branch:' | awk '{ print $3 }')"
git checkout "$branch"

git pull "$remote" "$branch"

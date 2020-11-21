#!/bin/sh

# 'git pull origin master' is cool, but what if you're on a detached head?
# what if you don't know if the repo uses 'origin'?
# what if it doesn't use 'master'?
#
# git knows your remote and branch name, let it help!

remote="$(git remote show | head -n 1)"
git fetch "$remote"

branch="$(git remote show "$remote" | grep 'HEAD branch:' | awk '{ print $3 }')"
git checkout "$branch"

git pull "$remote" "$branch"

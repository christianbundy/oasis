#!/bin/sh
if [ "$1" = install ] || [ "$1" = upgrade ]; then
  brew_command="$1"
  shift # remove brew_command from $@
  original brew "$brew_command" --build-from-source "$@"
else
  original brew "$@"
fi

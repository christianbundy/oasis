#!/usr/bin/env zsh

app="$(print -l /System/Applications/*.app /Applications/* /System/Library/CoreServices/*.app | fzf)"

[[ -n ${app} ]] && open "${app}"

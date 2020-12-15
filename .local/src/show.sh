#!/bin/sh

if [ -f "$1" ]; then
  exec bat --force-colorization "$1";
fi

if [ -d "$1" ]; then
  exec exa -1 --color=always "$1";
fi

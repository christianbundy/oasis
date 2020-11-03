#!/bin/sh

command -v bat >/dev/null 2>&1 && exec bat "$@"
command -v batcat >/dev/null 2>&1  && exec batcat "$@"
exec original cat "$@"

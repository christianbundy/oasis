#!/bin/sh

if command-exists bat; then
  exec bat "$@"
elif command-exists batcat; then
  exec batcat "$@"
else
  exec original cat "$@"
fi

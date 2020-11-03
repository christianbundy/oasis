#!/bin/zsh
# Print documents with ISO 8601 dates
exec print -l ~/Documents/* <0-9999 >- <0-12 >- <0-31 >.md

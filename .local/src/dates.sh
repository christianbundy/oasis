#!/bin/sh
# Print documents with ISO 8601 dates
exec fd '^[0-9][0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9].md$' ~/Documents

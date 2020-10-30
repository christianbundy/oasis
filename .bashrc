[ -f ~/.fzf.bash ] && source ~/.fzf.bash

# starship
eval "$(starship init bash)"

# zoxide
eval "$(zoxide init bash)"

# See `.local/bin/original`
ORIGINAL_PATH="$PATH"
PATH="${HOME}/.local/bin:$ORIGINAL_PATH"
VISUAL="$(which vim)"

export \
  ORIGINAL_PATH \
  VISUAL

[ -f ~/.fzf.bash ] && source ~/.fzf.bash

# starship
eval "$(starship init bash)"

# zoxide
eval "$(zoxide init bash)"

# See `.local/bin/original`
export ORIGINAL_PATH="$PATH"
export PATH="$(print -l ~)/.local/bin:$PATH"
export VISUAL="$(which vim)"

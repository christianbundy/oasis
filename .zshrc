# Vim key-bindings
bindkey -v

# Rust utils
alias cat='bat'
alias ls='exa'

# starship
eval "$(starship init zsh)"

# zoxide
eval "$(zoxide init zsh)"

# Case-insensitive (APFS) -- Zsh
# <http://zsh.sourceforge.net/Doc/Release/Completion-System.html>
zstyle ':completion:*' matcher-list '' 'm:{a-zA-Z}={A-Za-z}'

# Case-insensitive (APFS) -- Zoxide
# <https://github.com/ajeetdsouza/zoxide/issues/114>
export _ZO_RESOLVE_SYMLINKS=1


# zsh plugins
if type brew &>/dev/null; then
  brew_prefix="$(brew --prefix)"

  zsh_plugins=(
    syntax-highlighting
    autosuggestions
  )

  for plugin in $zsh_plugins; do
    plugin_path=${brew_prefix}/share/zsh-${plugin}/zsh-${plugin}.zsh
    if [[ -f $plugin_path ]]; then
      source $plugin_path
    fi
  done

  FPATH=${brew_prefix}/share/zsh-completions:$FPATH

  autoload -Uz compinit
  compinit
fi

# Print all documents with ISO-8601 dates.
alias dates="print -l ~/Documents/*<0-99>-<0-12>-<0-31>.md"

# Edit file with today's date.
alias today="vim /Users/christianbundy/Documents/$(date '+%Y-%m-%d').md"
alias yesterday='vim $(dates | tail -n 1)'
alias journal='cat $(dates)'

export NON_LOCAL_PATH="$PATH"
export PATH="$(print -l ~)/.local/bin:$PATH"

export VISUAL="$(which vim)"

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

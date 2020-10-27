# Vim key-bindings
bindkey -v

# Rust utils
alias cat='bat'
alias ls='exa'

# starship
eval "$(starship init zsh)"

# zoxide
eval "$(zoxide init zsh)"

# case-insensitive (APFS)
# https://github.com/ajeetdsouza/zoxide/issues/114
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

alias today="vim /Users/christianbundy/Documents/$(date '+%Y-%m-%d').md"
export PATH="/usr/local/sbin:$PATH"

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

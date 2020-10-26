# Vim key-bindings
bindkey -v

# Rust utils
alias cat='bat'
alias ls='exa'

# starship
eval "$(starship init zsh)"

# zsh plugins
if type brew &>/dev/null; then
  brew_prefix="$(brew --prefix)"
  source ${brew_prefix}/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
  source ${brew_prefix}/share/zsh-autosuggestions/zsh-autosuggestions.zsh
  FPATH=${brew_prefix}/share/zsh-completions:$FPATH

  autoload -Uz compinit
  compinit
fi

alias today="vim /Users/christianbundy/Documents/$(date '+%Y-%m-%d').md"
export PATH="/usr/local/sbin:$PATH"


[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

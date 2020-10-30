#!/usr/bin/env zsh

# Vim key-bindings
bindkey -v

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


# See `.local/bin/original`
export ORIGINAL_PATH="$PATH"
export PATH="$(print -l ~)/.local/bin:$ORIGINAL_PATH"
export VISUAL="$(which vim)"

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

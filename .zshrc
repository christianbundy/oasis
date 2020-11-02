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
zsh_plugins=(
  syntax-highlighting
  autosuggestions
)

for plugin in $zsh_plugins; do
  source ${HOME}/.config/zsh/${plugin}/zsh-${plugin}.zsh
done

FPATH=${HOME}/.config/zsh/completions/src:$FPATH

package_manager=error

package_manager_list=(
  pacman
  brew
  apt
)

for p in $package_manager_list; do
  if $(command -v $p &> /dev/null); then
    package_manager="$p"
    break
  fi
done

case $package_manager in
    pacman)
      source /usr/share/fzf/completion.zsh
      source /usr/share/fzf/key-bindings.zsh
    ;;

    brew)
      source /usr/local/opt/fzf/shell/completion.zsh
      source /usr/local/opt/fzf/shell/key-bindings.zsh
    ;;
esac

# See `.local/bin/original`
export ORIGINAL_PATH="$PATH"

export PATH="$(print -l ~)/.local/bin:$ORIGINAL_PATH"
export VISUAL="$(which vim)"
export package_manager

autoload -Uz compinit
compinit

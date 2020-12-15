#!/usr/bin/env zsh

# Save history
HISTFILE=~/.histfile
HISTSIZE=10000
SAVEHIST=100000
setopt hist_ignore_all_dups
setopt hist_ignore_space

export FZF_DEFAULT_OPTS='--no-height --no-reverse'

# Vim key-bindings
bindkey -v

export PATH="${HOME}/.cargo/bin:$PATH"

# See `.local/bin/original`
export ORIGINAL_PATH="$PATH"
export PATH="$(print -l ~)/.local/bin:$ORIGINAL_PATH"

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

autoload -Uz compinit
compinit

# zsh plugins
zsh_plugins=(
  fzf-tab/fzf-tab.plugin
  syntax-highlighting/zsh-syntax-highlighting
  autosuggestions/zsh-autosuggestions
)

for plugin in $zsh_plugins; do
  source ${HOME}/.config/zsh/${plugin}.zsh
done

FPATH=${HOME}/.config/zsh/completions/src:$FPATH

package_manager=false

package_manager_list=(
  pacman
  brew
  apt
)

for p in $package_manager_list; do
  if command-exists "$p"; then
    package_manager="$p"
    break
  fi
done

export EMAIL="christianbundy@fraction.io"

case $package_manager in
pacman)
  source /usr/share/fzf/completion.zsh
  source /usr/share/fzf/key-bindings.zsh
  ;;

brew)
  source /usr/local/opt/fzf/shell/completion.zsh
  source /usr/local/opt/fzf/shell/key-bindings.zsh
  export EMAIL="christian@truework.com"
  ;;
apt)
  source /usr/share/doc/fzf/examples/completion.zsh
  source /usr/share/doc/fzf/examples/key-bindings.zsh
  ;;
esac

alias shit='zsh -c "$history[$[HISTCMD-1]]"'

export VISUAL="$(which vim)"
export package_manager
alias dc='docker-compose'
alias g='g'
alias e='vim'


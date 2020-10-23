# Customize to your needs...
# if [ -z "$ORIGINAL_TERM" ]; then
#   export ORIGINAL_TERM="$TERM"
# else 
#   export TERM="$ORIGINAL_TERM"
#   unset ORIGINAL_TERM
# fi
# 
# if [ -z "$TMUX" ]; then
#   exec tmux new-session -A -s main
# fi
# 
# if [ -z "$RANGER_LEVEL" ]; then
#   exec ranger
# fi
#alias cd="echo RANGER"
#alias vim="echo RANGER"
#alias ls="echo RANGER"

# Vim key-bindings
bindkey -v

# Rust utils
alias cat='bat'
alias ls='exa'

# starship
eval "$(starship init zsh)"
source /usr/local/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh 
source /usr/local/share/zsh-autosuggestions/zsh-autosuggestions.zsh 

alias today="vim /Users/christianbundy/Documents/$(date '+%Y-%m-%d').md"
export PATH="/usr/local/sbin:$PATH"

[ -f ~/.fzf.zsh ] && source ~/.fzf.zsh

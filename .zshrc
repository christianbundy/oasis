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

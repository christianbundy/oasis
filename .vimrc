source $VIMRUNTIME/defaults.vim

set number
set expandtab
set autoindent expandtab
set shiftwidth=2 softtabstop=2 tabstop=2
colorscheme industry

set clipboard=unnamed

set rtp+=/usr/local/opt/fzf

nnoremap gd :YcmCompleter GoTo<CR>
nnoremap gr :YcmCompleter GoToReferences<CR>

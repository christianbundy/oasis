# ~/

My interest in dotfiles is highly correlated with how recently I've had
to set up a new computer. My activity will fluctuate with interest, so
I'm aiming to document the project enough that my future self won't just
start with a clean slate (again) instead of following the installation
instructions.

In the past I've been very excited about tools like Stow and Homesick,
but my interest has turned toward solutions that are more boring and
simple. In particular, I'm inspired by Drew DeVault's configuration that
he documented [in a blog post][0]. I've used this as the foundation for
my new setup, but have also been experimenting with small extensions
(like `.gitallow`) that are _highly_ experimental.

## Getting started

### Try before you ~~buy~~ install

If you have Docker, it's easy to try out my dotfiles:

```sh
git clone https://github.com/christianbundy/dotfiles.git christianbundy-dotfiles
cd christianbundy-dotfiles
docker build -t christianbundy-dotfiles .
docker run christianbundy-dotfiles
```

### Install

If you want to install these dotfiles to your home directory:

```sh
cd ~
git init
git remote add origin https://github.com/christianbundy/dotfiles.git
git pull --set-upstream origin master
git submodule update --init --recursive --depth 1
```

## License

AGPL-3.0-only

[0]: https://drewdevault.com/2019/12/30/dotfiles.html

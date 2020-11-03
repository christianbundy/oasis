FROM debian:bullseye

RUN apt-get update && apt-get install -y \
  bat \
  ca-certificates \
  cargo \
  exa \
  fzf \
  git \
  libssl-dev \
  nodejs \
  pkg-config \
  python3 \
  vim \
  zsh

RUN adduser christian --shell /bin/zsh --disabled-password --gecos ""

USER christian
WORKDIR /home/christian

RUN cargo install \
  starship \
  zoxide

COPY --chown=christian . .

CMD ["/bin/zsh"]

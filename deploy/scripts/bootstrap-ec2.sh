#!/usr/bin/env bash
# First-time EC2 setup (Amazon Linux 2023 or Ubuntu 22.04+).
# Run as root or with sudo on a fresh t3.small instance.
set -euo pipefail

step="${1:-all}"

install_docker() {
  if command -v docker >/dev/null 2>&1; then
    echo "Docker already installed."
    return
  fi

  if [ -f /etc/os-release ] && grep -qi 'amazon' /etc/os-release; then
    dnf update -y
    dnf install -y docker git
    systemctl enable --now docker
  else
    apt-get update -y
    apt-get install -y ca-certificates curl git
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
      > /etc/apt/sources.list.d/docker.list
    apt-get update -y
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable --now docker
  fi

  usermod -aG docker "${SUDO_USER:-ec2-user}" 2>/dev/null || true
  echo "Docker installed. Log out and back in for group membership."
}

install_node() {
  if command -v node >/dev/null 2>&1; then
    echo "Node already installed: $(node -v)"
    return
  fi

  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs 2>/dev/null || dnf install -y nodejs 2>/dev/null || {
    echo "Install Node 20 manually for local frontend builds."
  }
}

setup_certbot() {
  mkdir -p /opt/hopehub/deploy/certbot/www /opt/hopehub/deploy/certbot/conf
  echo "Request certificates after DNS points to this host:"
  echo "  certbot certonly --webroot -w /opt/hopehub/deploy/certbot/www -d api.hopehub.in -d hopehub.in -d mind.hopehub.in -d admin.hopehub.in -d doctor.hopehub.in -d ops.hopehub.in"
}

case "$step" in
  docker) install_docker ;;
  node) install_node ;;
  certbot) setup_certbot ;;
  all)
    install_docker
    install_node
    setup_certbot
    ;;
  *)
    echo "Usage: $0 [docker|node|certbot|all]"
    exit 1
    ;;
esac

echo "Bootstrap step '$step' done."

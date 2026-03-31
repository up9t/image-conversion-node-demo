FROM node:25-trixie AS base
FROM node:25-trixie-slim AS base-slim
FROM debian:trixie AS debian-base

ARG NINJA_VERSION=v1.13.2
ARG MESON_VERSION=1.10.2
ARG LIBVIPS_VERSION=v8.18.1


# Install meson and ninja
FROM debian-base AS install-tool
ARG NINJA_VERSION
ARG MESON_VERSION
WORKDIR /build
# Install dependencies
RUN apt-get update && \
    apt-get install -y curl python3 git build-essential pkg-config && \
    rm -rf /var/lib/apt/lists/*
# Install ninja
RUN git clone --branch=${NINJA_VERSION} --depth=1 https://github.com/ninja-build/ninja.git && \
    cd ninja && \
    ./configure.py --bootstrap && \
    chmod +x ninja && \
    mv ninja /usr/local/bin/ninja
# Install meson
RUN git clone --branch=${MESON_VERSION} --depth=1 https://github.com/mesonbuild/meson.git && \
    cd meson && \
    ./packaging/create_zipapp.py --outfile meson.pyz --interpreter '/usr/bin/env python3' && \
    chmod +x meson.pyz && \
    mv meson.pyz /usr/local/bin/meson


# Install node modules and build
FROM base AS builder
WORKDIR /app
COPY ./package*.json .
RUN npm ci
COPY . .
# Rebuild sharp
RUN npm explore sharp -- npm run build
# Remove line below if you don't need npm run build for your project
RUN npm run build


# Download libvips
FROM base AS download-vips
ARG LIBVIPS_VERSION
WORKDIR /downloads
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl git
RUN git clone --branch=${LIBVIPS_VERSION} --depth=1 https://github.com/libvips/libvips.git


# Build libvips
FROM base AS build-vips 
WORKDIR /libvips
# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 build-essential pkg-config libglib2.0-dev libexpat1-dev libheif-dev \
    liblcms2-dev libjpeg-dev libpng-dev libwebp-dev libexif-dev \
    libde265-dev libx265-dev
# Copy build tools from install-tool stage
COPY --from=install-tool /usr/local/bin/ninja /usr/local/bin/ninja
COPY --from=install-tool /usr/local/bin/meson /usr/local/bin/meson
COPY --from=download-vips /downloads/libvips .
# Build libvips
RUN meson setup build --prefix /usr/local && \
    cd build && \
    meson compile && \
    meson test && \
    meson install && \
    ldconfig


# Run
FROM base-slim AS runner
WORKDIR /app
# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libglib2.0-0 libexpat1 libheif1 liblcms2-2 libjpeg62-turbo \
    libpng16-16 libwebp7 libexif12
COPY --from=build-vips /usr/local /usr/local
RUN ldconfig
COPY --from=builder /app .
USER node
ENTRYPOINT ["npm"]
CMD ["start"]
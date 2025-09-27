# syntax=docker/dockerfile:1.6
ARG BASE_IMAGE=ubuntu:22.04
ARG LLAMA_CPP_COMMIT=72b24d96c6888c609d562779a23787304ae4609c

FROM ${BASE_IMAGE} AS builder
ARG LLAMA_CPP_COMMIT
ARG LLAMA_CPP_REPO=https://github.com/ggml-org/llama.cpp.git

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    build-essential \
    cmake \
    git \
    python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt
RUN git clone --filter=blob:none ${LLAMA_CPP_REPO} llama.cpp \
  && cd llama.cpp \
  && git checkout ${LLAMA_CPP_COMMIT} \
  && cmake -S . -B build \
    -DLLAMA_BUILD_SERVER=ON \
    -DLLAMA_BUILD_TESTS=OFF \
    -DLLAMA_BUILD_EXAMPLES=OFF \
    -DLLAMA_NATIVE=ON \
  && cmake --build build --config Release -j "$(nproc)"

FROM ${BASE_IMAGE} AS runtime
ARG LLAMA_CPP_COMMIT
ENV LLAMA_CPP_COMMIT=${LLAMA_CPP_COMMIT}

RUN apt-get update \
  && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    libstdc++6 \
    libatomic1 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /opt/llama.cpp
COPY --from=builder /opt/llama.cpp/build/bin/ ./bin/
COPY --from=builder /opt/llama.cpp/examples/server/ ./examples/server/
COPY docker/llama-server-entrypoint.sh /opt/entrypoint.sh
RUN chmod +x /opt/entrypoint.sh

EXPOSE 8080
ENV LLAMA_SERVER_HOST=0.0.0.0 \
    LLAMA_SERVER_PORT=8080 \
    LLAMA_SERVER_EXTRA_ARGS=""
ENTRYPOINT ["/opt/entrypoint.sh"]
CMD []

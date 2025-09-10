# Build stage
FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go-service/ .
RUN go build -o service .

# Runtime stage
FROM alpine:3.20
WORKDIR /app
COPY --from=build /src/service ./service
EXPOSE 8080
CMD ["./service"]

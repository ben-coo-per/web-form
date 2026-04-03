FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache sqlite
COPY . .
RUN mkdir -p /data
EXPOSE 3000
CMD ["node", "server.js"]

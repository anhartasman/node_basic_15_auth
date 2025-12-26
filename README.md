# Node.js Auth App with Docker

## Production Build

To build and run in production:

```bash
docker build -t nodejs-complete-guide .
docker compose up
docker compose down
```

## Logging

```bash
docker logs -f nodejs-dev
```

you can change `nodejs-dev` to any other container name

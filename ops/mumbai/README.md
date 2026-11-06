# ETHGlobal Mumbai demo instance

A second MiniKlaim on the VPS for the hackathon demo: same code as branch
`ethglobal-mumbai`, its own database copy and subdomain, flags on. Production
(www.miniklaim.fun) is not touched.

Why a copy and not a zone inside production: `DEMO_TIME_SCALE` speeds up the
whole game clock, which must never happen to real players, and every Celo
contract address is zero here so the demo cannot settle anything on chain.

## One-time setup (needs 0xj4an's go for each write)

1. DNS: `mumbai.miniklaim.fun` A record to the VPS (`198.105.177.194`).
2. Caddy (`/home/0xj4an/docker/infra/caddy/Caddyfile`), next to the
   production block, then `caddy validate` and `caddy reload`:

   ```
   mumbai.miniklaim.fun {
       reverse_proxy miniklaim-mumbai:3000 {
           lb_try_duration 20s
           lb_try_interval 250ms
       }
   }
   ```

3. Database copy (read from production, write only to the new database):

   ```sh
   createdb miniklaim_mumbai
   pg_dump "$PROD_DATABASE_URL" --no-owner | psql "$MUMBAI_DATABASE_URL"
   ```

4. `.env.miniklaim-mumbai` from `env.example`, then migrate and start:

   ```sh
   docker compose -f ops/mumbai/docker-compose.mumbai.yml run --rm --no-deps miniklaim-mumbai npm run db:migrate
   docker compose -f ops/mumbai/docker-compose.mumbai.yml up -d --build
   ```

5. Queue the demo zone for Arkiv:

   ```sh
   docker exec miniklaim-mumbai npm run arkiv:backfill -- --zone=87608b0b0ffffff
   ```

6. ENS: 0xj4an opens `https://mumbai.miniklaim.fun/mumbai/ens-setup` with
   the wallet that owns miniklaim.eth, sends the steps in order, then sets
   `ENS_RESOLVER_ADDRESS` and restarts `miniklaim-mumbai-sync`.

## Checking it

```sh
curl -s https://mumbai.miniklaim.fun/api/health | jq .mirrors
docker logs -t --tail 50 miniklaim-mumbai-sync
```

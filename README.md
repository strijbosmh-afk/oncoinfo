# OncoInfo

OncoInfo is een Vite/React-app voor oncologische geneesmiddeleninformatie. De
frontend draait op Vercel. Database, authenticatie, opslag en Edge Functions
draaien op een eigen Supabase-project.

## Lokaal ontwikkelen

Vereisten:

- Node.js 22
- npm
- Supabase CLI voor database- en Edge Function-werk

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Vul in `.env.local` de publieke browserconfiguratie van het bedoelde
Supabase-project in:

```dotenv
VITE_SUPABASE_PROJECT_ID=
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

## Controles

```sh
npm run build
npm test
npm run lint
```

## Vercel

Het Vercel-project is gekoppeld aan de GitHub-repository. Productiedeployments
komen van `main`.

Stel deze variabelen in voor Production, Preview en Development:

- `VITE_SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

`vercel.json` stuurt alle browserroutes naar `index.html`, zodat directe links
zoals `/drugs/:id` en `/reset-password` werken.

## Supabase

Koppel de CLI aan het eigen project:

```sh
supabase link --project-ref <project-ref>
supabase db push
supabase functions deploy
```

De Edge Functions gebruiken daarnaast deze secrets:

- `AI_GATEWAY_API_KEY`
- `APP_URL` (`https://www.oncoinfo.be`)
- `ONCOINFO_API_KEY`
- `RESEND_API_KEY`

`SUPABASE_URL`, `SUPABASE_ANON_KEY` en `SUPABASE_SERVICE_ROLE_KEY` worden door
Supabase beschikbaar gesteld.

## Productiedomein

- Canoniek: `https://www.oncoinfo.be`
- Redirect: `https://oncoinfo.be` → `https://www.oncoinfo.be`

Wijzig DNS pas nadat alle bestaande web-, e-mail- en verificatierecords naar de
actieve DNS-provider zijn overgenomen.

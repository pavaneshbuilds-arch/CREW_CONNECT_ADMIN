# Crew Connect Admin

Web console for platform operators. Talks to [CREW_CONNECT_API](../CREW_CONNECT_API) at `/api/v1`.

## Screens

- Sign in (email + password)
- Dashboard
- Crew list + verification (approve / reject / suspend)
- Profile edit requests
- Organizers
- Bookings (mark no-show, add a replacement, or assign crew into an open paid slot)
- Coupons (create / edit / deactivate, usage limits and discount cap)
- Crew rates + supervisor staffing ranges
- Audit + activity logs
- Team management (`super_admin` only)

## Run

The API must already be running on port `4000`.

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Vite proxies `/api` and `/uploads` to the API so you do not need CORS setup in development.

Default seed login (from the API `prisma/seed.js`):

- Email: `admin@crewconnect.local`
- Password: `ChangeMe123!`

## Production

Set `VITE_API_BASE_URL` to the public API origin (see `.env.example`), then:

```bash
npm run build
```

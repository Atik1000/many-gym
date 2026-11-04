Admin panel for **manygym**, backed by the Many Gym API at `https://v0.manygym.com/api/v1`.

## API

| | |
|---|---|
| Reference for all 149 endpoints | [`docs/api/README.md`](docs/api/README.md) |
| Contract gaps worth knowing | [`docs/api/known-issues.md`](docs/api/known-issues.md) |
| Auth issues for the API owners | [`docs/api/for-the-backend-team.md`](docs/api/for-the-backend-team.md) |
| Which endpoints are wired, and why | [`docs/api/coverage.md`](docs/api/coverage.md) — `npm run check:api` |
| Postman collection (v3) | [`postman/README.md`](postman/README.md) |
| OpenAPI document | [`postman/spec/manygym-openapi.json`](postman/spec/manygym-openapi.json) |

The client lives in `lib/api/`: `endpoints.ts` and `types.ts` are generated from the schema, `http.ts` holds the
fetch core and token store, and `adapters.ts` maps the wire format onto the models the screens use. Point the app
at another server with `NEXT_PUBLIC_MANYGYM_API_BASE`.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

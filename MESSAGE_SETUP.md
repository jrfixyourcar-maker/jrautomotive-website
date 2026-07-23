# Website message form setup

The Contact page posts enquiries to the Cloudflare Pages Function at `/api/message`.

Before deployment, configure these values in the `jrautomotive-pages` project under **Settings → Variables and Secrets**:

- `TURNSTILE_SITE_KEY` — variable
- `TURNSTILE_SECRET_KEY` — encrypted secret
- `CF_ACCOUNT_ID` — variable
- `CF_EMAIL_API_TOKEN` — encrypted secret with Email Sending permission
- `MESSAGE_FROM_EMAIL` — variable using a sender on `jrautomotive.nz`
- `MESSAGE_TO_EMAIL` — variable containing the verified workshop destination email

Cloudflare setup required:

1. Create a Turnstile widget restricted to `jrautomotive.nz`.
2. Enable Email Routing and verify the destination workshop email.
3. Onboard `jrautomotive.nz` under Cloudflare Email Service.
4. Create an API token with Email Sending permission.
5. Add the variables and encrypted secrets above to preview and production as required.
6. Redeploy the Pages project after adding the configuration.

Do not put API tokens or Turnstile secret keys in HTML, JavaScript, Git, `.env`, or `.dev.vars` files that will be committed.

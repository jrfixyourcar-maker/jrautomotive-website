# Website message form setup

The Contact page posts enquiries to the Cloudflare Worker at `/api/message`.

After the Worker deployment, configure these values in the `jrautomotive-pages` project under **Settings → Variables and Secrets**:

- `TURNSTILE_SITE_KEY` — variable
- `TURNSTILE_SECRET_KEY` — encrypted secret
- `MESSAGE_FROM_EMAIL` — configured in `wrangler.jsonc`
- `MESSAGE_TO_EMAIL` — configured in `wrangler.jsonc`
- `EMAIL` — restricted email binding configured in `wrangler.jsonc`

Cloudflare setup required:

1. Create a Turnstile widget restricted to `jrautomotive.nz`.
2. Enable Email Routing and verify the destination workshop email.
3. Add the restricted `send_email` binding for the verified workshop destination.
4. Add the Turnstile variable and encrypted secret to the Worker.
5. Redeploy the Worker after adding the configuration.

Do not put Turnstile secret keys in HTML, JavaScript, Git, `.env`, or `.dev.vars` files that will be committed.

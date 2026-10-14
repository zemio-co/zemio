---
"@zemio/web": patch
---

Stop requiring environment variables the web app never reads.

`MICROSOFT_TENANT_ID` was required at startup but unused: sign-in goes through
the multi-tenant Microsoft authority, and each user's tenant is recorded from
their login. `SUPERUSER_ID` was optional and read by nothing. Both can be
removed from every environment. The tRPC client also no longer checks
`VERCEL_URL`, since Zemio is not deployed on Vercel.

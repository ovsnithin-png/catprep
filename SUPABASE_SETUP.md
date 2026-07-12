# Supabase setup for CAT OS

Follow these steps to enable cloud sync and image storage using Supabase.

1. Create a Supabase project at https://app.supabase.com.
2. In the SQL editor, run the SQL in `supabase/schema.sql` to create the `cat_app_state` table and RLS policy.
3. Create a Storage bucket named `cat-images`.
   - Recommended: set the bucket to PRIVATE so that files are not publicly accessible.
   - We store files under a per-user path: `<userId>/<filename>` so server checks can enforce ownership.
   - After creating the bucket, make sure it's private and **do not** enable public access.
4. In your Vercel project, set these environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon (client) key
   - `SUPABASE_SERVICE_ROLE_KEY` — your Supabase service_role key (server-only secret)

Important server-side notes:
- The app includes server API routes that use the `SUPABASE_SERVICE_ROLE_KEY` to upload files and generate signed URLs. **Do not** expose the service role key to clients. Set it only in Vercel's Environment Variables (Production scope).
- Before running migrations or uploads, ensure `SUPABASE_SERVICE_ROLE_KEY` is present in your deployed environment.

Migration & deployment steps:
1. Run the SQL in `supabase/schema.sql` in the Supabase SQL editor to create the `cat_app_state` table and RLS policy.
2. Create the `cat-images` bucket and keep it private.
3. Deploy this app to Vercel and set the three env vars above in your Vercel project settings.
4. Once deployed, sign in with a user account and open Settings → click "Migrate local images to Supabase" to move any data-URL images into the private bucket. The server will store `supabase://<path>` markers in state and the client will request short-lived signed URLs to display images.

Notes on security and sizing:
- Server uploads reject non-image data and enforce a 5MB max size per file. Adjust limits in `src/lib/supabaseAdmin.ts` if needed.
- The server verifies the user's JWT for upload, migrate and signed-url requests so only the owner can operate on their files.

See `supabase/schema.sql` for the table definition and RLS policy to paste into Supabase SQL editor.

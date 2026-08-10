# Jbad Editing — Supabase-ready website

This is a static website designed for GitHub Pages (or another static host) with Supabase as the backend.

## What is included

- Modern/minimal Jbad Editing landing page
- Services, portfolio, pricing and contact sections
- Editor sign-up and login
- Public editor directory
- Public editor showcase posts
- Image/video uploads to Supabase Storage
- Editors can edit their profile
- Editors can publish and delete their own work
- Row Level Security (RLS) policies
- 50 MB maximum portfolio upload size
- No service-role key in the frontend

## 1. Create your free Supabase project

Create a project at https://supabase.com/

For a simple starter site, the free plan is enough.

## 2. Create the database

Open your Supabase project:

**SQL Editor → New query**

Paste the entire contents of `supabase.sql` and run it.

The SQL creates:

- `profiles`
- `editor_posts`
- authentication profile trigger
- RLS policies
- `portfolio` storage bucket
- storage security policies

## 3. Get your public Supabase keys

In Supabase open:

**Project Settings → API**

Copy:

- Project URL
- Publishable key (or legacy anon key)

Open `supabase-config.js` and replace:

`PASTE_YOUR_SUPABASE_PROJECT_URL_HERE`

and

`PASTE_YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY_HERE`

Only use the public/publishable/anon key.

**NEVER use the `service_role` or secret key in this website.**

## 4. Authentication email settings

Supabase Auth may require email confirmation depending on your project's settings.

For development you can use the default email confirmation setup. Users should verify their email before logging in.

## 5. Put the website online for free

You can upload these files to a GitHub repository and enable GitHub Pages.

Keep all of these files together:

- index.html
- styles.css
- app.js
- supabase-config.js

The browser loads Supabase's JavaScript client from a public CDN.

## 6. Contact email

In `index.html`, replace:

`YOUR-EMAIL@example.com`

with the email address you want clients to use.

## 7. Optional admin account

The SQL includes an `admin` role for future moderation features.

After you create your first account, find its user UUID in Supabase Authentication and run:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR-AUTH-USER-UUID';
```

The current website does not expose admin-only controls yet; the role is included so a moderation system can be added safely later.

## Important production notes

This starter version is intentionally simple:

- Portfolio files are publicly readable because they are meant to be advertised publicly.
- Users can only upload into their own storage folder.
- Users can only edit/delete their own profile/posts.
- Videos are capped at 50 MB.
- Do not store private client files here unless you change the storage policies to use private buckets and signed URLs.
- Do not put secret API keys in frontend files.

## GitHub Pages

After pushing the files to GitHub:

1. Open the repository.
2. Go to Settings → Pages.
3. Choose **Deploy from a branch**.
4. Select your main branch and `/ (root)`.
5. Save.
6. GitHub will give you a `github.io` address.

Your Supabase URL/key are designed to be public frontend configuration values. The database/storage security comes from the RLS policies, not from hiding the public key.


## If the buttons do nothing when testing on your Mac

Do not open `index.html` by double-clicking it as a `file://` page. The site uses JavaScript modules, which browsers can restrict when loaded directly from disk.

Use one of these instead:

- Put the files on GitHub Pages (recommended).
- Or, for local testing, run a simple local web server from the website folder.

If the site is on GitHub Pages and the Join button still does nothing, open the browser console and look for a red error. The updated app now logs JavaScript errors there.

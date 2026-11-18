# Put Fight Camp on your iPhone (free)

The app is a website that installs to your home screen. It's hosted free on GitHub Pages. Your data never goes to GitHub; it stays on your phone.

## 1. Put it online (once, about 10 minutes, on your Mac)

1. Go to https://github.com/signup and make a free account.
2. Go to https://github.com/new
   - Repository name: `fight-camp`
   - Choose **Public** (needed for free Pages; only the app code is public, none of your data).
   - Click **Create repository**.
3. On the new repo page click **uploading an existing file**.
4. Open the `fight-camp-app` folder in Finder, select **everything inside it** (index.html, styles.css, sw.js, manifest.webmanifest and the `js`, `data`, `icons` folders) and drag it into the browser. Click **Commit changes**.
5. Go to the repo's **Settings → Pages**. Under "Branch" pick `main` and `/ (root)`, then **Save**.
6. Wait 1–2 minutes. Your app is at `https://YOUR-USERNAME.github.io/fight-camp/`

## 2. Install on your iPhone

1. Open that link in **Safari** (not Chrome; iPhone only installs from Safari).
2. Tap **Share** (square with arrow) → **Add to Home Screen** → **Add**.
3. Open Fight Camp from the home screen and do the setup.

## 3. Get your free AI key (2 minutes)

1. On your phone, open https://aistudio.google.com/apikey and sign in with Google.
2. Tap **Create API key** and copy it.
3. Paste it in the app's setup (or later in Me → AI coach).

## Share with your friend

Send her the same link (Me → Share app with a friend). She installs it, does her own setup and makes her own key. Her data stays on her phone, yours stays on yours.

## Keep your data safe

Everything is saved only on your phone. Do Me → **Back up** every week and keep the file in iCloud Drive or Files. If you delete the app or clear Safari data without a backup, your logs are gone.

## Updating the app later

Upload the changed files to the same repo (Add file → Upload files) and change `VERSION` at the top of `sw.js` (for example `fc-v2`) so phones pick up the update. Close and reopen the app twice.

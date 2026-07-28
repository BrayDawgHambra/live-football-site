# Live Football Website

This site displays:

- Matches currently live
- Upcoming matches for the next 1, 3, or 7 days
- Clickable league sections
- Team and league logos
- Central Time
- Manual refresh button to protect your API request limit

## Put it on Netlify

1. Unzip this folder.
2. Go to Netlify and create a new site by importing the folder/repository.
3. In Netlify, open **Site configuration → Environment variables**.
4. Add an environment variable named:

   `API_FOOTBALL_KEY`

5. Paste your API-Football key as its value.
6. Redeploy the site.

Do not paste the key into `index.html` or any public JavaScript file.

## API usage

The Netlify function requests:

- `/fixtures?live=all`
- `/fixtures?from=YYYY-MM-DD&to=YYYY-MM-DD`

Opening the page, selecting a new date range, or pressing Refresh makes two API requests. The site does not auto-refresh, which helps protect your daily request allowance.

# Habits Trainer

A mobile-first static PWA for iOS-friendly habit tracking.

## Features

- Add habits with daily, weekday, or custom-day reminder schedules.
- Mark habits kept each day.
- Track adoption score, streaks, and 28-day history.
- Show one shared quote of the day from a shuffled 1,000+ entry rotation.
- Preserve local habit data across app updates with versioned state migration.
- Export and import habit backups as JSON.
- Offline app shell with a service worker.
- Install metadata and iOS home-screen icon support.
- Notification permission flow plus reminder notifications while the app is active or installed and running.
- Web Push listener in the service worker for a future server-backed notification service.

## Run Locally

Serve the folder over HTTP so the service worker and PWA manifest can load:

```powershell
python -m http.server 8080
```

Then open `http://127.0.0.1:8080/`.

## iOS Notes

Install from Safari using Add to Home Screen. iOS Web Push notifications require the app to be installed and the user to grant notification permission. Fully proactive closed-app reminders require a push server that sends Web Push messages to the registered service worker.

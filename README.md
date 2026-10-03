# Taka24 — Termux Ready UI

This is a responsive front-end mockup based on the supplied Taka24 reference.

## Run in Termux

```bash
pkg update
pkg install python -y
cd taka24_termux
python -m http.server 8080
```

Then open:

http://127.0.0.1:8080

For another device on the same Wi‑Fi:

```bash
ip addr show wlan0
```

Use the phone's local IP with port 8080.

## Files

- `index.html` — all screens/markup
- `style.css` — navy/gold responsive design
- `app.js` — navigation and demo interactions

This version is a front-end demo. It does not connect to real payment providers, banking systems, or a production database.

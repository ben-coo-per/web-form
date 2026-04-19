# Minimal Form Builder

I wanted to make forms that looks nice, are easy to customize, and, crucially, are insanely quick to set up. 
That last point has always pushed me to use google forms - but I hate google forms. They're really ugly and there's very little customization. I finally decided to build a small scaffold tool to spin up web forms that I can actually edit in just html, css, and js (svelte really) along with all the deployment boilerplate.

## Features

- **Zero dependencies** (except for `node:sqlite` in modern Node.js).
- **SQLite built-in**: No database setup required.
- **Admin Panel**: Built-in password-protected submissions viewer.
- **CSV Export**: Download your data anytime.
- **Fly.io Ready**: Pre-configured `Dockerfile` and `fly.toml` for easy deployment.

## Installation

You can run it directly with `npx`:

```bash
npx @bencooper/form-builder <form-name>
```

Or install it globally:

```bash
npm install -g @bencooper/form-builder
```

## Usage

1. **Scaffold your project**:
   ```bash
   build-form my-contact-form
   ```

2. **Configure your fields**:
   Edit `my-contact-form/config.js` to define the fields you need.

3. **Customize the UI**:
   Edit `my-contact-form/public/index.html`. Make sure the input `name` attributes match your config.

4. **Run locally**:
   ```bash
   cd my-contact-form
   npm start
   ```
   Visit `http://localhost:3000`.

5. **Deploy to Fly.io**:
   ```bash
   fly launch
   ```

## Admin Panel

Access your submissions at `http://localhost:3000/admin`.
The default password is `changeme` (update this in `config.js` before deploying!).

## License

MIT

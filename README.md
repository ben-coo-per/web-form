# Minimal Form Builder

> Stop suffering through Google Forms.

Fed up with how ugly and uncustomizable Google Forms was, I finally built a small scaffold tool to spin up web forms I can actually edit. Each form is a tiny Node.js app with SQLite storage — style it however you want, add custom logic, host it yourself.

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

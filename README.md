# Dock Hosting CLI 🐳

**Deploy your PHP applications in seconds.**

The official CLI for [Dock Hosting](http://dockhosting.dev). It lets you deploy PHP applications, manage security, and handle your production workflow directly from the terminal.


## Features

- **Zero Configuration**: No complex YAML files required.
- **Fast Deployment**: Automatic zipping, uploading, and container builds.
- **Secure**: Authentication and transport are handled automatically.

## Installation

Install the tool globally via NPM to access the `dock` command:

```bash
npm install -g dockhosting-cli
```

## Quick Start

Getting your site live takes two steps:

1. **Authenticate**
   Log in to your Dock Hosting account from the terminal.
   ```bash
   dock login
   ```
   *This will open your browser to verify your identity.*

2. **Deploy**
   Navigate to your project folder and deploy.
   ```bash
   cd my-project
   dock deploy
   ```

   Your application will be live immediately.

## Command Reference

Here are the tools at your disposal:

| Command | Description |
|---------|-------------|
| `dock login` | Opens a browser window to securely sign you in. |
| `dock deploy` | Packages your current directory and ships it to production. |
| `dock init` | (Optional) Sets up a basic configuration for your project. |
| `dock logout` | Signs you out and removes credentials from your machine. |

## Resources

- **NPM Package**: [npmjs.com/package/dockhosting-cli](https://www.npmjs.com/package/dockhosting-cli)
- **Official Platform**: [dockhosting.dev](http://dockhosting.dev)

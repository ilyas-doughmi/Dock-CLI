# DockHosting CLI

Official command-line interface for DockHosting V2.

## Installation

```bash
npm install -g dockhosting-cli
```

## Usage

### Login
```bash
dock login
```

### Deploy
Deploy the current directory to a project:
```bash
dock deploy
```

### Clone
Clone a project from DockHosting:
```bash
dock clone [projectName]
```

### Logout
```bash
dock logout
```

## Project Structure

```
dockhosting-cli/
├── bin/
│   └── dock              # Main CLI entry point
├── src/
│   ├── commands/         # Command modules
│   │   ├── login.js
│   │   ├── logout.js
│   │   ├── deploy.js
│   │   └── clone.js
│   ├── lib/              # Core libraries
│   │   ├── config.js     # Configuration management
│   │   └── constants.js  # Constants and environment variables
│   └── utils/            # Utility functions
│       └── api.js        # API client utilities
├── package.json
└── README.md
```

## Development

```bash
# Install dependencies
npm install

# Link for local development
npm link

# Test commands
dock login
dock deploy
```

## Environment Variables

- `DOCK_API_URL` - API URL (default: http://localhost:8080/api)
- `DOCK_WEB_URL` - Web URL (default: http://localhost:3000)

## License

ISC

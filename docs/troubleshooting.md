# Troubleshooting

## Common Issues & Solutions

### Pre-commit Hook Failures

- The project uses strict quality checks
- Fix linting issues: `npm run lint:fix`
- Fix formatting: `npm run format:fix`
- Ensure all tests pass: `npm run test:run`

### Database Issues

- Database file: `dev_assets/db.sqlite`
- Reset database: Copy from `dev_assets_seed/`
- Run migrations: Handled automatically by backend

### Build Issues

- Clear node_modules: `rm -rf node_modules && npm install`
- Clear Rust cache: `cargo clean`
- Check environment variables in README.md

## Environment Variables

**Development:**

- `BACKEND_PORT`: Backend server port (default: auto-assign)
- `FRONTEND_PORT`: Frontend dev server port (default: 3000)

**Build-time:**

- `GITHUB_CLIENT_ID`: GitHub OAuth client ID
- `POSTHOG_API_KEY`: Analytics API key
- `POSTHOG_API_ENDPOINT`: Analytics endpoint

## Useful File Locations

- Frontend API client: `frontend/src/lib/api.ts`
- Backend API routes: `backend/src/routes/`
- Database models: `backend/src/models/`
- AI executors: `backend/src/executors/`
- UI components: `frontend/src/components/`
- Configuration: `dev_assets/config.json`

## Support

- Open issues on GitHub for bugs or feature requests
- Check the documentation at https://vibekanban.com
- Review existing code patterns before implementing new features
- Use the project's existing utilities and patterns
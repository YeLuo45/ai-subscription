# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-05-17

### Added
- GitHub Actions CI workflow for automated testing (npm install + npm run test + npm run build)
- GitHub Actions Deploy workflow for automated GitHub Pages deployment on master branch push
- Version management with CHANGELOG.md tracking

### Changed
- Updated package.json with version field (1.0.0)

### Technical Details
- CI workflow triggers on push and pull_request to master/main branches
- Deploy workflow uses peaceiris/actions-gh-pages@v4 for GitHub Pages deployment
- Build command: `NODE_ENV=development npx vite build`
- GitHub Pages URL: https://yeluo45.github.io/ai-subscription/
# Hope Hub Website

A professional mental health services platform built with Angular 21, providing comprehensive counseling and therapeutic support services with API-backed lead capture.

## Features

- **Comprehensive Services**: Breakup counseling, career counseling, anxiety therapy, depression support, relationship counseling, stress management, grief counseling, family therapy, addiction support, and self-esteem coaching
- **Community Integration**: Community links and monthly meetups
- **Lead Capture**: Contact and inquiry submissions are stored through the HopeHub API
- **Service Inquiry Forms**: Quick inquiry forms on each service detail page
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Modern Architecture**: Angular 21 with standalone components and lazy loading
- **Production Ready**: Optimized builds with Netlify deployment

## Tech Stack

- **Framework**: Angular 21
- **Styling**: Tailwind CSS v4
- **Testing**: Vitest with fast-check for property-based testing
- **Build**: Angular CLI with production optimizations
- **Deployment**: Netlify with automatic deployments
- **Backend**: HopeHub API lead capture

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- HopeHub API URL

### Installation

```bash
npm install
```

### Configuration

1. **Update environment files** with your API URL:
   - Development: `src/environments/environment.ts`
   - Production: `src/environments/environment.prod.ts`

### Development

```bash
npm start
```

Navigate to `http://localhost:4204/`

### Build

```bash
# For production
npm run build:prod

# For Netlify deployment
npm run build:netlify
```

### Testing

```bash
npx vitest run
```

## Deployment

### Netlify Deployment (Recommended)

The application is configured for easy deployment on Netlify:

1. **Connect Repository**: Link your GitHub repository to Netlify
2. **Build Settings**:
   - Build command: `npm run build:netlify`
   - Publish directory: `dist/hope-hub-website/browser`
   - Node version: 18
3. **Environment Variables**: Set the deployed API URL when needed
4. **Deploy**: Automatic deployments on every push to main

See [NETLIFY_DEPLOYMENT.md](NETLIFY_DEPLOYMENT.md) for complete setup instructions.

### Features:

- ✅ Automatic deployments from GitHub
- ✅ SPA routing with proper redirects
- ✅ Security headers and CSP
- ✅ Static asset caching
- ✅ Free SSL certificates
- ✅ CDN distribution

## Lead Capture

The website sends form submissions to the HopeHub API:

- **Contact Form Submissions**: Contact form data is stored as website leads
- **Service Inquiries**: Quick inquiry forms on service detail pages
- **Follow-up Pipeline**: Leads appear in the existing visitor lead workflow

### Message Format

Messages include:

- 📅 Timestamp
- 👤 User information (name, email, phone)
- 🎯 Service interest
- 📞 Preferred contact method
- 💬 Message content
- 🌐 Source tracking

## Project Structure

```
src/
├── app/
│   ├── core/                 # Singleton services, guards, interceptors
│   │   └── services/
│   │       └── lead.service.ts      # API lead capture
│   ├── shared/               # Reusable components, pipes, directives
│   │   └── components/
│   │       └── service-inquiry/     # Service inquiry form
│   ├── features/
│   │   ├── home/            # Landing page components
│   │   ├── services/        # Service listing and detail pages
│   │   ├── community/       # Telegram and meetup sections
│   │   └── contact/         # Contact form with API lead capture
│   ├── layout/              # Header, footer, navigation components
│   └── environments/        # Environment configurations
```

## Configuration Files

- `netlify.toml`: Netlify deployment configuration
- `angular.json`: Angular build configurations
- `tailwind.config.js`: Tailwind CSS configuration
- `vitest.config.ts`: Testing configuration

## Security Considerations

- No bot tokens or third-party notification credentials are bundled in client-side code
- CSP headers allow the HopeHub API for lead submissions
- Security headers implemented via Netlify
- HTTPS enforced automatically

## License

This project is licensed under the MIT License.

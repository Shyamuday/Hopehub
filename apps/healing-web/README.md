# Healing Hub Website

A professional mental health services platform built with Angular 21, providing comprehensive counseling and therapeutic support services with integrated Telegram notifications.

## Features

- **Comprehensive Services**: Breakup counseling, career counseling, anxiety therapy, depression support, relationship counseling, stress management, grief counseling, family therapy, addiction support, and self-esteem coaching
- **Community Integration**: Telegram community and monthly meetups
- **Telegram Notifications**: Receive form submissions directly in Telegram
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
- **Notifications**: Telegram Bot API integration

## Getting Started

### Prerequisites

- Node.js 20+ 
- npm 10+
- Telegram Bot Token (see [Telegram Setup Guide](TELEGRAM_SETUP.md))

### Installation

```bash
npm install
```

### Configuration

1. **Set up Telegram Bot** (see [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md) for detailed instructions)
2. **Update environment files** with your Telegram credentials:
   - Development: `src/environments/environment.ts`
   - Production: `src/environments/environment.prod.ts`

### Development

```bash
npm start
```

Navigate to `http://localhost:4200/`

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
   - Publish directory: `dist/healing-hub-website/browser`
   - Node version: 18
3. **Environment Variables**: Set your Telegram bot token and chat ID
4. **Deploy**: Automatic deployments on every push to main

See [NETLIFY_DEPLOYMENT.md](NETLIFY_DEPLOYMENT.md) for complete setup instructions.

### Features:
- ✅ Automatic deployments from GitHub
- ✅ SPA routing with proper redirects
- ✅ Security headers and CSP
- ✅ Static asset caching
- ✅ Free SSL certificates
- ✅ CDN distribution

## Telegram Integration

The website includes direct Telegram integration for:

- **Contact Form Submissions**: All contact form data is sent directly to your Telegram chat
- **Service Inquiries**: Quick inquiry forms on service detail pages
- **Formatted Messages**: Rich formatting with emojis and structured data
- **Real-time Notifications**: Instant notifications when forms are submitted

### Message Format

Messages include:
- 📅 Timestamp
- 👤 User information (name, email, phone)
- 🎯 Service interest
- 📞 Preferred contact method
- 💬 Message content
- 🌐 Source tracking

See [TELEGRAM_SETUP.md](TELEGRAM_SETUP.md) for complete setup instructions.

## Project Structure

```
src/
├── app/
│   ├── core/                 # Singleton services, guards, interceptors
│   │   └── services/
│   │       └── telegram.service.ts  # Telegram integration
│   ├── shared/               # Reusable components, pipes, directives
│   │   └── components/
│   │       └── service-inquiry/     # Service inquiry form
│   ├── features/
│   │   ├── home/            # Landing page components
│   │   ├── services/        # Service listing and detail pages
│   │   ├── community/       # Telegram and meetup sections
│   │   └── contact/         # Contact form with Telegram integration
│   ├── layout/              # Header, footer, navigation components
│   └── environments/        # Environment configurations
```

## Configuration Files

- `netlify.toml`: Netlify deployment configuration
- `angular.json`: Angular build configurations
- `tailwind.config.js`: Tailwind CSS configuration
- `vitest.config.ts`: Testing configuration

## Security Considerations

- Telegram tokens are exposed in client-side code (development only)
- CSP headers configured to allow Telegram API requests
- Security headers implemented via Netlify
- HTTPS enforced automatically

## License

This project is licensed under the MIT License.
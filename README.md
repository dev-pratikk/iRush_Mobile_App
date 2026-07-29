# iRUSH App

## Getting Started

### Prerequisites
- Node.js and npm
- Expo Go app installed on your iOS or Android device

### Installation
```bash
npm install
```

### Development
Start the Expo development server with tunnel:
```bash
npx expo start --tunnel
```

Then open Expo Go on your device and scan the QR code.

## Project Structure

```
irush-app/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── (auth)/
│   └── (dashboard)/
├── components/
│   ├── dashboard/
│   │   ├── cards/
│   │   ├── controls/
│   │   └── KpiCard.tsx
│   ├── login/
│   ├── navigation/
│   └── ui/
├── lib/
│   ├── api-client.ts
│   └── formatters.ts
├── mocks/
│   ├── api/
│   ├── dashboard.ts
│   └── users.ts
├── services/
│   └── api/
│       ├── auth.service.ts
│       ├── dashboard.service.ts
│       ├── open-orders.service.ts
│       ├── orders.service.ts
│       └── quotes.service.ts
├── theme/
│   ├── colors.ts
│   ├── spacing.ts
│   ├── typography.ts
│   └── index.ts
├── types/
│   ├── api/
│   ├── auth.ts
│   ├── dashboard.ts
│   └── mock-user.ts
├── hooks/
│   └── useAuth.ts
└── assets/
```

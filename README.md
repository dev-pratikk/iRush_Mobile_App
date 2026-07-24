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
│   └── (auth)/
│       ├── _layout.tsx
│       └── login.tsx
├── components/
│   ├── ui/
│   │   ├── AppButton.tsx
│   │   ├── TextField.tsx
│   │   └── Checkbox.tsx
│   └── login/
│       ├── LoginHeader.tsx
│       ├── LoginForm.tsx
│       ├── LoginFooter.tsx
│       └── CircuitDecoration.tsx
├── constants/
│   ├── Colors.ts
│   ├── Typography.ts
│   └── Spacing.ts
├── hooks/
│   └── useAuth.ts
├── services/
│   └── api/
│       ├── client.ts
│       └── auth.ts
├── types/
│   └── auth.ts
└── assets/
    └── fonts/
```

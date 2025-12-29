# Caisse Noire

Application de gestion de cagnotte d'amendes pour equipes sportives.

## Stack Technique

| Composant | Technologies |
|-----------|--------------|
| **Frontend** | React Native, Expo, TypeScript, TanStack Query, Zustand |
| **Backend** | Node.js, Fastify, Prisma, PostgreSQL |
| **Auth** | JWT (access + refresh tokens) |

## Structure du Projet

```
Caisse noire/
├── app/                    # Frontend React Native / Expo
│   ├── app/                # Routes (Expo Router - file-based)
│   ├── src/
│   │   ├── components/     # Composants React
│   │   ├── hooks/          # Hooks personnalises (useAuth, useTeams, etc.)
│   │   ├── lib/            # API client, stores, utilitaires
│   │   ├── types/          # Types TypeScript
│   │   └── constants/      # Theme, constantes
│   └── package.json
│
├── server/                 # Backend API
│   ├── prisma/
│   │   ├── schema.prisma   # Schema de la base de donnees
│   │   └── migrations/     # Migrations Prisma
│   ├── src/
│   │   ├── routes/         # Routes API (auth, teams, fines, etc.)
│   │   ├── services/       # Logique metier
│   │   ├── middleware/     # Auth, authorization
│   │   ├── config/         # Configuration
│   │   └── utils/          # Utilitaires
│   └── package.json
│
└── docker-compose.yml      # PostgreSQL pour dev local
```

## Prerequis

- Node.js >= 18
- Docker Desktop (pour PostgreSQL)
- npm ou yarn

## Installation

### 1. Base de donnees (PostgreSQL)

```bash
# Demarrer PostgreSQL via Docker
docker run -d \
  --name caisse-noire-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=caisse_noire \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Backend (server/)

```bash
cd server

# Installer les dependances
npm install

# Configurer l'environnement
cp .env.example .env
# Editer .env si necessaire

# Appliquer les migrations
npx prisma migrate dev

# Demarrer le serveur (dev avec hot-reload)
npm run dev
```

Le serveur demarre sur http://localhost:3000

### 3. Frontend (app/)

```bash
cd app

# Installer les dependances
npm install

# Configurer l'environnement
cp .env.example .env

# Demarrer Expo
npm start
```

Puis appuyer sur `w` pour ouvrir dans le navigateur.

## Variables d'Environnement

### Backend (server/.env)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/caisse_noire"
JWT_ACCESS_SECRET="votre-secret-access-min-32-chars"
JWT_REFRESH_SECRET="votre-secret-refresh-min-32-chars"
PORT=3000
NODE_ENV=development
```

### Frontend (app/.env)

```env
EXPO_PUBLIC_API_URL=http://localhost:3000
```

## Commandes Utiles

### Backend

```bash
npm run dev          # Demarrer en dev (hot-reload)
npm run build        # Compiler TypeScript
npm start            # Demarrer en production
npx prisma studio    # Interface graphique pour la DB
npx prisma migrate dev --name nom_migration  # Creer une migration
```

### Frontend

```bash
npm start            # Demarrer Expo
npm run ios          # Simulateur iOS
npm run android      # Emulateur Android
npm run web          # Navigateur
npm run lint         # Linter
npm run typecheck    # Verification TypeScript
```

## API Endpoints

### Authentification

| Methode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/auth/register` | Inscription |
| POST | `/auth/login` | Connexion |
| POST | `/auth/logout` | Deconnexion |
| POST | `/auth/refresh` | Rafraichir le token |
| GET | `/auth/session` | Verifier la session |

### Equipes

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/teams` | Liste des equipes |
| POST | `/teams` | Creer une equipe |
| GET | `/teams/:id` | Detail d'une equipe |
| PATCH | `/teams/:id` | Modifier une equipe |
| DELETE | `/teams/:id` | Supprimer une equipe |
| POST | `/teams/join` | Rejoindre via code |
| GET | `/teams/:id/members` | Liste des membres |
| GET | `/teams/:id/stats` | Statistiques |
| GET | `/teams/:id/leaderboard` | Classement |

### Amendes

| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/teams/:id/rules` | Regles d'amendes |
| POST | `/teams/:id/rules` | Creer une regle |
| GET | `/teams/:id/fines` | Liste des amendes |
| POST | `/teams/:id/fines` | Creer une amende |
| POST | `/teams/:id/members/:userId/payments` | Enregistrer un paiement |

## Architecture Frontend

### Gestion d'Etat

- **Zustand** : Etat local (auth, UI)
- **TanStack Query** : Etat serveur (cache, mutations)

### Hooks Principaux

```typescript
// Authentification
const { user, profile } = useAuth();
const { mutate: signIn } = useSignIn();
const { mutate: signUp } = useSignUp();

// Equipes
const { data: teams } = useTeams();
const { data: team } = useTeam(teamId);
const { mutate: createTeam } = useCreateTeam();

// Amendes
const { data: fines } = useFines(teamId);
const { data: rules } = useFineRules(teamId);
const { mutate: createFine } = useCreateFine();
```

## Securite

- **Authentification** : JWT avec access token (15min) + refresh token (7j)
- **Authorization** : Middleware verifiant l'appartenance a l'equipe et le role
- **Stockage tokens** : SecureStore (mobile) / sessionStorage (web)
- **Validation** : Zod pour toutes les entrees

## Roles

| Role | Permissions |
|------|-------------|
| `admin` | Tout (gestion equipe, membres, regles, amendes, paiements) |
| `treasurer` | Amendes, paiements, depenses |
| `member` | Voir, creer des amendes (selon config equipe) |

## Contribution

1. Creer une branche feature
2. Faire les modifications
3. Tester localement
4. Soumettre une PR

## License

MIT

# OTP Express — Vérification d'email par code à 6 chiffres

## C'est quoi un OTP ?

**OTP** signifie *One-Time Password* (mot de passe à usage unique).

C'est un code généré aléatoirement, envoyé par email, valable quelques minutes et utilisable **une seule fois**. Tu l'as déjà vu sur des sites quand ils te demandent de confirmer ton email ou ton numéro de téléphone.

---

## Comment ça marche ?

```
┌─────────────┐                        ┌─────────────┐                ┌─────────────┐
│ Utilisateur │                        │   Serveur   │                │    Email    │
└──────┬──────┘                        └──────┬──────┘                └──────┬──────┘
       │                                      │                              │
       │  POST /send-otp                      │                              │
       │  { "email": "alice@gmail.com" }      │                              │
       │─────────────────────────────────────>│                              │
       │                                      │  génère le code "482915"     │
       │                                      │  le stocke en mémoire        │
       │                                      │  envoie l'email ────────────>│
       │  { message: "Code envoyé" }          │                              │
       │<─────────────────────────────────────│                              │
       │                                      │                              │
       │           [ Alice lit son email et récupère le code ]               │
       │                                      │                              │
       │  POST /verify-otp                    │                              │
       │  { "email": "...", "code": "482915" }│                              │
       │─────────────────────────────────────>│                              │
       │                                      │  vérifie le code             │
       │                                      │  génère un token JWT         │
       │  { message: "Email vérifié !",       │                              │
       │    token: "eyJhbGci..." }            │                              │
       │<─────────────────────────────────────│                              │
```

---

## Les deux routes

| Méthode | URL            | Body (JSON)                          | Réponse                        |
|---------|----------------|--------------------------------------|--------------------------------|
| POST    | `/send-otp`    | `{ "email": "alice@gmail.com" }`     | `{ "message": "Code envoyé" }` |
| POST    | `/verify-otp`  | `{ "email": "...", "code": "482915"}`| `{ "message": "...", "token": "eyJ..." }` |

---

## Tester avec Postman

### Étape 1 — Envoyer le code OTP

- Méthode : **POST**
- URL : `http://localhost:3000/send-otp`
- Onglet **Body** → **raw** → **JSON**

```json
{
  "email": "ton-email@gmail.com"
}
```

Réponse attendue :
```json
{
  "message": "Code envoyé par email."
}
```

---

### Étape 2 — Vérifier le code et recevoir le token

- Méthode : **POST**
- URL : `http://localhost:3000/verify-otp`
- Onglet **Body** → **raw** → **JSON**

```json
{
  "email": "ton-email@gmail.com",
  "code": "482915"
}
```

Réponse si le code est correct :
```json
{
  "message": "Email vérifié !",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Réponse si le code est mauvais :
```json
{
  "message": "Code incorrect."
}
```

Réponse si le code est expiré (après 5 min) :
```json
{
  "message": "Code expiré."
}
```

---

## Structure du projet

```
otp-express/
├── index.js        → tout le code du serveur (routes, logique, envoi email)
├── .env            → tes identifiants secrets (jamais commité sur GitHub !)
├── .env.example    → modèle du fichier .env à partager avec l'équipe
├── .gitignore      → liste des fichiers à ignorer par Git
└── package.json    → liste des dépendances du projet
```

---

## Les concepts clés

### `otpStore` — la base de données temporaire

On utilise un simple objet JavaScript pour stocker les codes en mémoire :

```js
const otpStore = {};

// Après avoir envoyé un code à alice@gmail.com :
otpStore["alice@gmail.com"] = {
  code: "482915",
  expiresAt: 1700000300000
};

// L'objet ressemble maintenant à ça :
// {
//   "alice@gmail.com": { code: "482915", expiresAt: 1700000300000 }
// }
```

> ⚠️ En production, on utiliserait une vraie base de données (Redis, MongoDB...)
> car si le serveur redémarre, toutes les données en mémoire sont perdues.

---

### `Date.now()` — le timestamp

`Date.now()` retourne le nombre de millisecondes écoulées depuis le 1er janvier 1970.
On s'en sert pour calculer une date d'expiration :

```js
Date.now()              // → 1700000000000  (maintenant)
5 * 60 * 1000           // → 300000         (5 minutes en millisecondes)
Date.now() + 300000     // → 1700000300000  (dans 5 minutes)
```

Pour vérifier si le code est expiré, on compare simplement :
```js
if (Date.now() > entry.expiresAt) {
  // le code est expiré
}
```

---

### JWT — le token d'authentification

Après vérification du code, on génère un **JWT** (JSON Web Token).
C'est une chaîne de caractères qui contient des informations encodées :

```
eyJhbGciOiJIUzI1NiJ9 . eyJlbWFpbCI6ImFsaWNlQGdtYWlsLmNvbSJ9 . xK9f3z...
       header                        payload                      signature
```

Le payload contient les données qu'on a mises dedans :
```js
jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });
// payload → { email: "alice@gmail.com" }
// expire dans 1 heure
```

Le client garde ce token et l'envoie dans ses prochaines requêtes pour prouver qu'il est bien connecté.

---

## Configuration

Copie `.env.example` en `.env` et remplis tes informations :

```env
PORT=3000

EMAIL_USER=ton-email@gmail.com
EMAIL_PASS=ton-app-password

JWT_SECRET=un-secret-difficile-a-deviner
JWT_EXPIRES_IN=1h
```

> Pour Gmail, il faut créer un **App Password** (pas ton vrai mot de passe) :
> Compte Google → Sécurité → Validation en 2 étapes → Mots de passe des applications

---

## Lancer le projet

```bash
# Installer les dépendances
npm install

# Lancer le serveur
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

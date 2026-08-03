# ComplianceIQ — carte du projet

> Document établi à partir de l'arborescence, du code et de l'historique Git présents dans ce dépôt le 31 juillet 2026. Il décrit l'état courant, y compris les modifications locales non commitées. Il ne décrit pas une architecture cible.

## 1. Vue d'ensemble

ComplianceIQ est une application web francophone d'aide à l'analyse de conformité de contrats pour des PME marocaines. Le **frontend** React est servi sur le port `5173` en environnement Docker et appelle le **backend** Express via `/api` (port `3000`), notamment `/api/auth/*` et `/api/compliance/*`. Le backend authentifie l'utilisateur, lit et écrit les données dans PostgreSQL, puis appelle le **rag-service** sur `http://rag-service:4000` pour `/api/rag/query` ou `/api/rag/analyze-contract`. Le rag-service interroge ChromaDB (port `8000`) uniquement pour les questions réglementaires et appelle l'API Groq pour produire les réponses et analyses ; le frontend ne lui parle pas directement dans le flux normal.

## 2. Arborescence commentée

L'arborescence ci-dessous provient de `find backend frontend rag-service ... -type f` (équivalent de `tree`), en excluant `node_modules/` et `dist/`. Les fichiers `.env` existent localement mais leurs valeurs ne sont pas reproduites ici.

### `backend/`

```text
backend/
├── .dockerignore
├── .env
├── .gitignore
├── Dockerfile
├── package.json / package-lock.json
├── prisma.config.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       ├── 20260712210234_init_users/migration.sql
│       ├── 20260718111800_add_documents_analysis/migration.sql
│       ├── 20260718112459_add_chat_history/migration.sql
│       └── migration_lock.toml
├── src/
│   ├── index.ts
│   ├── prisma.ts
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── types/
│   ├── utils/
│   └── generated/prisma/
└── tsconfig.json
```

- `.dockerignore` — fichiers exclus du contexte de build Docker.
- `.env` — variables locales du backend ; ignoré par Git.
- `.gitignore` — ignore notamment `node_modules`, `.env` et le client Prisma généré.
- `Dockerfile` — image Node 20 Alpine qui génère Prisma puis démarre le script de développement.
- `package.json` / `package-lock.json` — dépendances et scripts `dev`, `build`, `start` du backend.
- `prisma.config.ts` — configuration Prisma utilisée par les commandes Prisma.
- `prisma/schema.prisma` — modèles `User`, `Document`, `Analysis`, `Finding`, `Conversation` et `Message`.
- `prisma/migrations/20260712210234_init_users/migration.sql` — crée la table `users` et l'unicité de l'email.
- `prisma/migrations/20260718111800_add_documents_analysis/migration.sql` — crée `documents`, `analyses` et `findings` avec leurs relations.
- `prisma/migrations/20260718112459_add_chat_history/migration.sql` — crée `conversations` et `messages` avec leurs relations.
- `prisma/migrations/migration_lock.toml` — verrou/métadonnée du fournisseur Prisma de migrations.
- `src/index.ts` — initialise Express, CORS, cookies, Helmet, Morgan, JSON, routes et `/health`.
- `src/prisma.ts` — construit et exporte le `PrismaClient` avec l'adaptateur PostgreSQL.
- `src/controllers/auth.controller.ts` — handlers HTTP d'inscription, connexion, déconnexion et `/me`.
- `src/controllers/compliance.controller.ts` — handlers HTTP pour questions, analyses, conversations, documents et statistiques.
- `src/routes/auth.routes.ts` — branche les routes `/api/auth/*` et protège `/me`.
- `src/routes/compliance.route.ts` — branche les routes `/api/compliance/*`, l'authentification et les limites de débit.
- `src/services/auth.service.ts` — crée les utilisateurs, vérifie les mots de passe et émet les JWT.
- `src/services/compliance.service.ts` — appelle le rag-service et persiste/récupère analyses, conversations, documents et statistiques.
- `src/middleware/auth.middleware.ts` — lit le cookie JWT et renseigne `req.user`.
- `src/middleware/rateLimit.middleware.ts` — définit les limiteurs général et d'analyse utilisés par les routes compliance.
- `src/utils/jwt.ts` — signe et vérifie les JWT à partir des variables d'environnement.
- `src/types/express.d.ts` — étend le type Express `Request` avec l'utilisateur authentifié.
- `src/generated/prisma/` — client Prisma généré localement ; `client.ts`, `models/*.ts`, `enums.ts` et fichiers internes sont des artefacts de génération, non du code métier écrit à la main.
- `tsconfig.json` — configuration TypeScript du backend.

### `frontend/`

```text
frontend/
├── .dockerignore
├── .env
├── .gitignore
├── Dockerfile
├── README.md
├── eslint.config.js
├── index.html
├── package.json / package-lock.json
├── vite.config.ts
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
├── public/
│   ├── favicon.svg
│   └── icons.svg
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── App.css
    ├── api/
    ├── assets/
    ├── components/
    ├── context/
    ├── pages/
    └── utils/
```

- `.dockerignore` — fichiers exclus du contexte Docker du frontend.
- `.env` — définit localement la base d'URL API Vite ; ignoré par Git.
- `.gitignore` — règles d'exclusion Vite/Node et des fichiers locaux.
- `Dockerfile` — image Node 20 Alpine qui démarre le serveur Vite de développement sur toutes les interfaces.
- `README.md` — README standard du template React/Vite, sans instructions propres au produit.
- `eslint.config.js` — configuration ESLint du frontend.
- `index.html` — document HTML d'entrée de Vite.
- `package.json` / `package-lock.json` — dépendances React/Vite et scripts `dev`, `build`, `lint`, `preview`.
- `vite.config.ts` — plugins React/Tailwind et proxy `/api` vers `backend:3000`.
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` — configurations TypeScript de base, application et outils Vite.
- `public/favicon.svg` — favicon statique.
- `public/icons.svg` — sprite SVG statique présent dans le dépôt.
- `src/main.tsx` — monte React, `BrowserRouter`, `ThemeProvider` et `AuthProvider`.
- `src/App.tsx` — définit les routes login, inscription, dashboard, chat et analyse, avec protection des routes privées.
- `src/index.css` — importe Tailwind, les polices et les tokens de thème.
- `src/App.css` — styles restants du template Vite, importés nulle part par `main.tsx` ou `App.tsx`.
- `src/api/client.ts` — client `fetch` commun, JSON et envoi des cookies.
- `src/api/auth.ts` — types et appels API d'authentification.
- `src/api/compliance.ts` — types et appels API des statistiques, conversations, questions et analyses.
- `src/components/Layout.tsx` — shell partagé avec navigation, thème et déconnexion, utilisé par la page Analyse.
- `src/components/ProtectedRoute.tsx` — redirige vers `/login` si le contexte d'authentification n'a pas d'utilisateur.
- `src/context/authContext.tsx` — charge `/auth/me` au démarrage et expose l'état utilisateur.
- `src/context/themeContext.tsx` — conserve le thème clair/sombre dans `localStorage` et applique la classe `dark`.
- `src/pages/Login.tsx` — formulaire de connexion.
- `src/pages/Register.tsx` — formulaire d'inscription.
- `src/pages/Dashboard.tsx` — dashboard des analyses et statistiques ; il contient son propre shell visuel.
- `src/pages/Ask.tsx` — interface de chat, chargement des conversations et affichage de sources ; elle contient son propre shell visuel.
- `src/pages/Analyze.tsx` — saisie de contrat, sélection/extraction PDF, lancement et affichage de l'analyse.
- `src/utils/pdfExtract.ts` — extrait le texte d'un PDF dans le navigateur avec `pdfjs-dist`.
- `src/assets/hero.png`, `react.svg`, `vite.svg` — ressources graphiques présentes dans le projet ; les deux dernières sont des ressources du template.

### `rag-service/`

```text
rag-service/
├── .dockerignore
├── .env
├── Dockerfile
├── package.json / package-lock.json
├── tsconfig.json
├── data/raw/
│   ├── code-travail.pdf
│   ├── loi-09-08.pdf
│   └── rgdp.pdf
└── src/
    ├── index.ts
    ├── ingest.ts
    ├── api/route.ts
    ├── chunking/chunker.ts
    ├── embeddings/embedder.ts
    ├── ingestion/loader.ts
    ├── llm/contractAnalysis.ts
    ├── llm/contractAnalysisSchema.ts
    ├── llm/llmClient.ts
    ├── prompts/promptTemplate.ts
    ├── retrieval/retriever.ts
    └── vectordb/chromaClient.ts
```

- `.dockerignore` — fichiers exclus du contexte Docker du rag-service.
- `.env` — configuration locale du port, Chroma et Groq ; ignorée à la racine par `.gitignore`.
- `Dockerfile` — image Node 20 Slim qui démarre le script de développement.
- `package.json` / `package-lock.json` — dépendances RAG et scripts `dev` et `ingest`.
- `tsconfig.json` — configuration TypeScript du service.
- `data/raw/code-travail.pdf` — document source PDF destiné à l'ingestion.
- `data/raw/loi-09-08.pdf` — document source PDF destiné à l'ingestion.
- `data/raw/rgdp.pdf` — document source PDF destiné à l'ingestion.
- `src/index.ts` — démarre Express, le parseur JSON, `/api/rag` et `/health` sur le port RAG.
- `src/api/route.ts` — expose `POST /query` et `POST /analyze-contract`.
- `src/ingest.ts` — script d'ingestion des PDF : chargement, chunking, embeddings puis insertion Chroma.
- `src/ingestion/loader.ts` — lit les PDF de `data/raw` et en extrait le texte avec `pdf-parse`.
- `src/chunking/chunker.ts` — découpe un texte en chunks de caractères avec chevauchement.
- `src/embeddings/embedder.ts` — charge paresseusement `Xenova/all-MiniLM-L6-v2` et produit les embeddings.
- `src/vectordb/chromaClient.ts` — crée/utilise la collection Chroma `complianceiq_regulations`, ajoute et requête les vecteurs.
- `src/retrieval/retriever.ts` — transforme une question en embedding et reconstruit les chunks renvoyés par Chroma.
- `src/prompts/promptTemplate.ts` — construit le prompt de question/réponse à partir des chunks récupérés.
- `src/llm/llmClient.ts` — appelle l'API OpenAI-compatible de Groq avec le modèle configuré en code.
- `src/llm/contractAnalysis.ts` — construit le prompt d'analyse de contrat, nettoie le JSON et relance une fois si la validation échoue.
- `src/llm/contractAnalysisSchema.ts` — schéma Zod de l'analyse, types/valeurs autorisés et règle métier sur les risques critiques.

## 3. Flux de données clé

### Analyse d'un contrat : flux réellement implémenté

Le mot « upload » désigne ici la sélection d'un PDF dans le navigateur : le fichier n'est pas envoyé comme fichier au backend. Son texte est extrait côté client, puis envoyé en JSON.

1. Dans `frontend/src/pages/Analyze.tsx`, l'utilisateur colle du texte ou sélectionne/dépose un PDF.
2. Pour un PDF, `handleFileSelect()` appelle `frontend/src/utils/pdfExtract.ts` puis `extractTextFromPdf(file)`, qui utilise `pdfjs-dist` dans le navigateur ; `contractText` est renseigné localement.
3. `handleSubmit()` appelle `analyzeContract(contractText, pdfFile?.name)` depuis `frontend/src/api/compliance.ts`.
4. `frontend/src/api/client.ts` envoie `POST /api/compliance/analyze-contract` avec `contractText` et éventuellement `filename`, cookies inclus.
5. `backend/src/routes/compliance.route.ts` applique `authenticate`, puis `analyzeLimiter`, et appelle `analyzeContract` du contrôleur.
6. `backend/src/controllers/compliance.controller.ts` lit `req.user.userId` et délègue à `analyzeAndSave()` de `backend/src/services/compliance.service.ts`.
7. `analyzeAndSave()` appelle `analyzeContractText()`, qui appelle le rag-service avec `POST http://rag-service:4000/api/rag/analyze-contract`.
8. `rag-service/src/api/route.ts` appelle `analyzeContract(contractText)` dans `rag-service/src/llm/contractAnalysis.ts`.
9. `contractAnalysis.ts` construit le prompt, puis `rag-service/src/llm/llmClient.ts` appelle Groq. **Aucun retrieval Chroma n'est appelé dans ce chemin d'analyse de contrat actuel.**
10. La réponse est nettoyée, parsée et validée par `ContractAnalysisSchema` dans `rag-service/src/llm/contractAnalysisSchema.ts`. En cas d'échec, le même flux est retenté une fois.
11. Le backend crée ensuite un `Document`, puis une `Analysis` et ses `Finding` dans PostgreSQL via Prisma, dans `analyzeAndSave()`.
12. Le backend renvoie `{ documentId, analysis }` ; `Analyze.tsx` place `analysis` dans son état `result` et affiche score, catégories, clauses manquantes et risques.

### Retrieval RAG : flux réellement utilisé par le chat

Le retrieval demandé dans la question est présent dans le flux de chat, pas dans celui d'analyse de contrat.

1. `frontend/src/pages/Ask.tsx` appelle `askQuestion()` de `frontend/src/api/compliance.ts`, puis `POST /api/compliance/ask`.
2. Le backend authentifie, applique le limiteur, puis `askAndSave()` appelle `/api/rag/query` via `askComplianceQuestion()`.
3. `rag-service/src/api/route.ts` appelle `retrieveRelevantChunks(question, topK)`.
4. `rag-service/src/retrieval/retriever.ts` appelle `embedText()` puis `queryVectors()` dans `chromaClient.ts`.
5. `promptTemplate.ts` combine question et chunks renvoyés par Chroma ; `llmClient.ts` envoie le prompt à Groq.
6. Le backend persiste question et réponse dans `Conversation`/`Message`, avec les sources, puis `Ask.tsx` affiche la réponse et les sources.

## 4. Modules transverses

| Mécanisme | Branchement réel | Portée actuelle |
|---|---|---|
| Authentification JWT par cookie | `auth.controller.ts` crée le cookie ; `auth.middleware.ts` le vérifie ; `auth.routes.ts` protège `/me` ; `compliance.route.ts` protège les routes compliance | Frontend via `credentials: "include"` dans `api/client.ts` ; pas de protection sur le rag-service direct. |
| Rate limiting | Défini dans `backend/src/middleware/rateLimit.middleware.ts`, branché dans `compliance.route.ts` | `generalLimiter` sur toutes les routes compliance ; `analyzeLimiter` sur `POST /ask` et `POST /analyze-contract`. Les routes auth n'en utilisent pas. |
| Gestion d'erreurs | `compliance.controller.ts` utilise `handleServerError`; les contrôleurs auth ont leurs propres `try/catch`; `rag-service/src/api/route.ts` a ses propres `try/catch`; pages React affichent des messages génériques | Il n'y a pas de middleware Express global d'erreurs ni de contrat d'erreur partagé. |
| Validation Zod | `rag-service/src/llm/contractAnalysisSchema.ts`, appelé par `contractAnalysis.ts` | Valide uniquement la réponse structurée de l'analyse LLM, pas les requêtes HTTP du frontend/backend. |
| Validation d'entrée HTTP | Vérifications manuelles dans contrôleurs backend et routes RAG | Vérifie surtout présence/type de `question` et `contractText`; aucun schéma partagé. |
| Persistance Prisma | `backend/src/prisma.ts` et `schema.prisma`; utilisé par services auth/compliance | PostgreSQL pour comptes, documents, analyses, findings, conversations et messages. |
| Thème | `themeContext.tsx`, `index.css`, contrôles des pages/Layout | Classe `dark` sur le document et préférence sauvegardée dans `localStorage`. |
| CI | `.github/workflows/ci.yml` | Déclenchée sur `main`; installe les dépendances de chaque service, génère Prisma, puis exécute les scripts disponibles avec `--if-present`. |

## 5. État d'avancement

### Historique et branches observables

| Élément observé | État factuel |
|---|---|
| Branche courante | `main`, au commit `f610eae` (`contract analysis optimization`). |
| Commits visibles sur `main` | `adee6ab` (auth/backend/RAG), `6d986eb` (chat + optimisation analyse), `f610eae` (optimisation analyse). |
| Branche supplémentaire | `fix/severity-enum-mismatch`, avec le commit `132ca88`, existe localement et sur `origin`; elle n'est pas fusionnée dans `main` d'après les références observées. |
| Modifications locales | Plusieurs modifications non commitées existent dans backend, frontend et rag-service, ainsi que `.github/`, le middleware de rate limit et le schéma Zod. |

### Fonctions et vérification observée

| État | Éléments | Base factuelle |
|---|---|---|
| Fait et vérifié localement | Compilation TypeScript du backend | `npm run build` dans `backend/` s'est terminée avec succès lors de l'audit. |
| Fait et vérifié localement | Vérification TypeScript du rag-service | `npx tsc --noEmit` dans `rag-service/` s'est terminée avec succès lors de l'audit. |
| Fait, mais non vérifié par des tests automatisés trouvés | Auth, routes protégées, persistance Prisma, chat, dashboard, extraction PDF, analyse LLM, prompt RAG et ingestion | Le code est présent ; aucun fichier de test/spec n'a été trouvé dans l'arborescence inspectée. |
| Fait, mais contrôle local en échec | Lint frontend | `npm run lint` échoue actuellement sur `themeContext.tsx` et `Analyze.tsx`. |
| Fait dans le code, mais migration absente dans les migrations présentes | Champs `type_contrat`, `type_contrat_label` d'`Analysis` et `categorie` de `Finding` | Ils sont dans `schema.prisma` et utilisés par le service, mais les trois migrations présentes ne les ajoutent pas. |
| Fait, mais couverture CI partielle | Workflow GitHub Actions | CI existe ; backend n'a pas de script `lint`, rag-service n'a ni `lint` ni `build`, donc leurs étapes `--if-present` peuvent être des no-op. |
| Non commencé ou non trouvé dans le dépôt | Tests automatisés, spécification OpenAPI/Swagger, scripts de déploiement Terraform, infrastructure AWS | Aucun fichier correspondant n'a été trouvé. Le README racine mentionne Terraform/AWS, mais aucun fichier `.tf` n'est présent. |
| Non déterminable depuis le dépôt | Exécution réelle de CI, déploiement, contenu/état de la base Postgres ou Chroma, ingestion déjà exécutée | Cela nécessiterait l'accès aux services externes ou à GitHub ; ces informations ne sont pas déductibles du code seul. |

## 6. Prochaines étapes

L'ordre ci-dessous privilégie les dépendances rendues visibles par le code actuel ; il ne présume pas de priorités produit externes.

1. **Ajouter et appliquer une migration Prisma pour les colonnes ajoutées au schéma.**
   - Fichiers : nouveau fichier sous `backend/prisma/migrations/`, `backend/prisma/schema.prisma` à vérifier.
   - Dépendances : aucune ; c'est un prérequis pour que la persistance actuelle de `typeContrat`, `typeContratLabel` et `categorie` corresponde à une base créée depuis les migrations.

2. **Décider puis intégrer le correctif de sévérité de `fix/severity-enum-mismatch`.**
   - Fichiers : branche `fix/severity-enum-mismatch`, notamment le filtre de risques dans `backend/src/services/compliance.service.ts`.
   - Dépendances : indépendant de la migration, mais il doit être aligné avec les valeurs `CRITICAL`, `HIGH`, `MEDIUM`, `LOW` validées dans `rag-service/src/llm/contractAnalysisSchema.ts`.

3. **Faire passer le lint frontend.**
   - Fichiers : `frontend/src/context/themeContext.tsx`, `frontend/src/pages/Analyze.tsx`, éventuellement `frontend/eslint.config.js` selon l'approche retenue.
   - Dépendances : aucune ; nécessaire pour que la tâche frontend de CI puisse réussir.

4. **Ajouter de vrais scripts de contrôle pour les trois services et les rendre obligatoires en CI.**
   - Fichiers : `backend/package.json`, `rag-service/package.json`, `frontend/package.json`, `.github/workflows/ci.yml`.
   - Dépendances : l'étape 3 doit être résolue avant d'exiger le lint frontend ; les scripts backend/RAG peuvent être ajoutés indépendamment.

5. **Ajouter des tests autour des flux déjà présents.**
   - Fichiers : nouveaux fichiers de test et, selon l'outil choisi, `package.json` de chaque service ; prioritairement `auth.service.ts`, `compliance.service.ts`, `contractAnalysisSchema.ts`, routes et `pdfExtract.ts`.
   - Dépendances : l'étape 1 doit précéder les tests d'intégration de persistance ; les tests unitaires du schéma Zod sont indépendants.

6. **Documenter et automatiser le démarrage local.**
   - Fichiers : `README.md`, `frontend/README.md`, `docker-compose.yml`, et nouveaux fichiers `.env.example` si souhaités.
   - Dépendances : les variables réellement requises et le mécanisme de migration doivent être stabilisés à l'étape 1 ; cela ne dépend pas des tests.

7. **Rendre explicite le périmètre RAG de l'analyse de contrat.**
   - Fichiers : `rag-service/src/llm/contractAnalysis.ts`, `rag-service/src/retrieval/retriever.ts`, `rag-service/src/prompts/promptTemplate.ts`, `rag-service/src/api/route.ts`, et `PROJECT_MAP.md`/README.
   - Dépendances : décision produit/technique requise. Aujourd'hui, l'analyse de contrat est un appel LLM validé ; elle ne dépend pas de Chroma. Si elle doit être réellement augmentée par retrieval, cette tâche précède tout travail de citations fondées sur les sources.

8. **Uniformiser la structure visuelle des pages privées.**
   - Fichiers : `frontend/src/components/Layout.tsx`, `frontend/src/pages/Dashboard.tsx`, `frontend/src/pages/Ask.tsx`, `frontend/src/pages/Analyze.tsx`.
   - Dépendances : indépendante des étapes backend/RAG ; les pages Dashboard et Ask dupliquent actuellement leur propre navigation au lieu d'utiliser le composant partagé.

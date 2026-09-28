# MOL-NEXUS

**MOL-NEXUS: Multiplayer Digital Board Game with Smart Analytics for Cognitive and Chemistry Numeracy Mapping in Stoichiometry**

Production portal:

**https://game.manuriska.sch.id**

## Access

MOL-NEXUS uses two separate access paths:

- **Teacher Access**
  - Supabase Auth
  - Teacher allowlist verification
  - Smart Analytics Dashboard
  - Room Management
  - Student Management
  - Question Bank
  - Formula Bank

- **Student Access**
  - Student identity login
  - Server-issued student session token
  - Multiplayer Lobby
  - 2–4 player gameplay
  - Secure question delivery
  - Server-authoritative diagnostic scoring

## Learning Flow

The game maps student performance across four stoichiometry Nexus areas:

- MASS
- PARTICLE
- GAS
- SOLUTION

Diagnostic evidence includes:

- Path accuracy
- Formula accuracy
- Calculation accuracy
- Unit accuracy
- Response time
- Hint usage
- Retry pattern
- Numeracy skill indicators

Students are classified into diagnostic profiles **P0–P5** and the teacher dashboard provides intervention-oriented analytics.

## Security Architecture

Key protections currently implemented:

- Question answer keys are not delivered directly to student browsers.
- Normal questions are served through secure student RPC validation.
- Student attempts are evaluated server-side.
- Multiplayer turn advancement validates the active student session and current turn.
- Energy rewards are idempotent and tied to a valid unclaimed correct attempt.
- Final Nexus completion requires all four Nexus Crystals and a correct Final Nexus attempt.
- Direct anonymous access to sensitive analytics, student, question, and attempt tables is blocked.
- Teacher-facing data and admin RPCs require an authorized teacher account.
- Legacy insecure turn advancement is no longer executable by browser roles.

## Stack

- HTML / CSS / JavaScript
- Supabase
- PostgreSQL
- GitHub
- Vercel

## Deployment

Main production domain:

```text
game.manuriska.sch.id
```

Vercel fallback domain:

```text
mol-nexus.vercel.app
```

## Project Status

Core system completed:

- Multiplayer game
- Student login and sessions
- Teacher authentication and allowlist
- Room management
- Student management
- Excel import
- Question bank
- Formula bank
- Diagnostic attempt engine
- P0–P5 classification
- Smart Analytics Dashboard
- Secure question delivery
- Secure multiplayer turn advancement
- Secure reward claim flow
- Custom production domain

MOL-NEXUS remains a research-oriented educational prototype and should continue to be validated through classroom and research testing.

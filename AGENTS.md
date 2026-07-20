# AGENTS.md — ScopeForge

## Mission

Construire un MVP fonctionnel et démontrable pour OpenAI Build Week 2026. Le produit transforme plusieurs sources projet en analyse sourcée, questions, scope, estimation éditable et preview client.

## Priorité

Le chemin P0 défini dans `docs/specification/03_MVP_SCOPE.md` est prioritaire sur toute amélioration esthétique ou fonctionnalité additionnelle.

## Stack

- Next.js + TypeScript
- Tailwind CSS
- composants accessibles
- Zod
- OpenAI Responses API avec GPT‑5.6
- persistance minimale adaptée au délai
- déploiement Vercel

Ne change pas de stack sans documenter le blocage et obtenir une décision explicite.

## Règles d’architecture

- séparer UI, use cases, domaine et infrastructure ;
- aucune clé dans le client ;
- sorties IA validées par schéma ;
- calculs déterministes hors LLM ;
- aucune modification IA appliquée sans validation utilisateur ;
- citations obligatoires pour les constats matériels ;
- données fictives uniquement ;
- composants suffisamment petits pour être testés.

## Règles UX

- desktop-first ;
- pas d’interface réduite à un chat ;
- montrer progression, sources et décisions ;
- conserver les modifications manuelles ;
- afficher le diff avant/après ;
- masquer les données internes dans la vue client ;
- éviter les gradients et clichés visuels IA.

## Méthode de travail

1. Lire `docs/README.md`, `docs/specification/03_MVP_SCOPE.md` et le fichier concerné.
2. Reformuler brièvement le résultat attendu.
3. Inspecter le code existant avant modification.
4. Implémenter la plus petite tranche verticale complète.
5. Ajouter ou adapter les tests.
6. Lancer lint, typecheck et tests pertinents.
7. Tester le parcours manuellement si l’UI change.
8. Résumer les changements et risques restants.

## Commandes de qualité attendues

Configurer puis utiliser :

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Interdictions

- ne pas ajouter une dépendance lourde sans nécessité ;
- ne pas refactorer une zone stable pendant le dernier jour ;
- ne pas committer de clé ou de document client ;
- ne pas créer de faux comportement présenté comme un appel réel ;
- ne pas masquer silencieusement une erreur IA ;
- ne pas calculer les totaux dans le prompt ;
- ne pas démarrer un P2 avant validation du P0.

## Définition de done

- fonctionnalité utilisable depuis l’UI ;
- erreurs gérées ;
- types et schémas cohérents ;
- test adapté ;
- build réussi ;
- déploiement vérifié si le changement affecte le chemin critique ;
- documentation mise à jour si nécessaire.

## Dernières douze heures

Geler les nouvelles fonctionnalités. Se concentrer sur bugs, stabilité, README, vidéo, `/feedback` Session ID et soumission Devpost.

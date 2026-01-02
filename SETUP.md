# Guide de Configuration

## 🚀 Démarrage Rapide

### 1. Installation de l'extension

#### Chrome / Edge
1. Ouvrez `chrome://extensions/` ou `edge://extensions/`
2. Activez le "Mode développeur" (en haut à droite)
3. Cliquez sur "Charger l'extension non empaquetée"
4. Sélectionnez le dossier `cleanMailSubscriptions`

#### Firefox
1. Ouvrez `about:debugging`
2. Cliquez sur "Ce Firefox"
3. Cliquez sur "Charger un module complémentaire temporaire"
4. Sélectionnez le fichier `manifest.json`

### 2. Configuration des icônes

L'extension nécessite des icônes aux tailles suivantes dans le dossier `icons/`:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

Vous pouvez :
- Créer vos propres icônes avec un outil graphique
- Utiliser un générateur d'icônes en ligne
- L'extension fonctionnera sans icônes, mais elles sont recommandées

### 3. Configuration de l'accès aux emails

L'extension peut analyser les emails de plusieurs façons :

#### Option A : Analyse via Content Script (Recommandé pour débuter)
- Ouvrez votre service email (Gmail, Outlook, etc.) dans le navigateur
- L'extension analysera automatiquement les emails visibles sur la page
- Fonctionne sans configuration supplémentaire

#### Option B : API Gmail (Pour une analyse complète)
1. Créez un projet dans [Google Cloud Console](https://console.cloud.google.com/)
2. Activez l'API Gmail
3. Créez des identifiants OAuth 2.0
4. Modifiez `background.js` pour intégrer l'authentification OAuth
5. Utilisez la bibliothèque Gmail API pour récupérer les emails

#### Option C : API Outlook (Pour une analyse complète)
1. Créez une application dans [Azure Portal](https://portal.azure.com/)
2. Configurez les permissions Microsoft Graph (Mail.Read)
3. Modifiez `background.js` pour intégrer l'authentification Microsoft
4. Utilisez Microsoft Graph API pour récupérer les emails

### 4. Configuration des API de recherche (Optionnel)

Pour enrichir les informations sur les entreprises, vous pouvez configurer des clés API :

#### Clearbit API
1. Créez un compte sur [Clearbit](https://clearbit.com/)
2. Obtenez votre clé API
3. Ajoutez-la dans les paramètres de l'extension (à implémenter)

#### FullContact API
1. Créez un compte sur [FullContact](https://www.fullcontact.com/)
2. Obtenez votre clé API
3. Ajoutez-la dans les paramètres de l'extension (à implémenter)

**Note** : L'extension utilise par défaut DuckDuckGo Instant Answer API qui ne nécessite pas de clé.

## 🔧 Personnalisation

### Modifier les sources d'emails

Éditez la fonction `fetchEmailSubscriptions()` dans `popup.js` pour intégrer votre source d'emails.

### Personnaliser l'interface

Modifiez `styles/popup.css` pour changer l'apparence de l'extension.

### Ajouter des fonctionnalités

- `popup.js` : Logique de l'interface principale
- `background.js` : Service worker pour les tâches en arrière-plan
- `content.js` : Scripts d'analyse des pages web
- `utils/` : Fonctions utilitaires

## 📝 Notes Importantes

1. **Confidentialité** : Toutes les données sont stockées localement dans votre navigateur
2. **Permissions** : L'extension nécessite des permissions pour accéder aux onglets et au stockage local
3. **Désabonnement** : Le désabonnement automatique peut nécessiter une action manuelle selon le service email
4. **APIs externes** : Les recherches d'informations utilisent des APIs tierces (DuckDuckGo par défaut)

## 🐛 Dépannage

### L'extension ne charge pas
- Vérifiez que le manifest.json est valide
- Consultez la console d'erreurs du navigateur (`chrome://extensions/` → Détails → Erreurs)

### Aucun email analysé
- Vérifiez que vous êtes sur une page de service email supporté
- Ouvrez la console du popup (clic droit → Inspecter) pour voir les erreurs
- Vérifiez les permissions de l'extension

### Les informations sur les entreprises ne se chargent pas
- Vérifiez votre connexion Internet
- Les APIs peuvent avoir des limites de taux
- Consultez la console pour les erreurs spécifiques

## 🔐 Sécurité

- Ne partagez jamais vos clés API
- L'extension ne transmet aucune donnée personnelle à des serveurs externes (sauf recherche d'informations optionnelle)
- Toutes les données sont stockées localement dans `chrome.storage.local`


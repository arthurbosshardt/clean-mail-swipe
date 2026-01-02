# Clean Mail Subscriptions

Une extension de navigateur cross-browser qui analyse localement toutes vos souscriptions email et vous permet de les gérer avec une interface style Tinder.

## 🎯 Fonctionnalités

- **Analyse locale** : Analyse tous vos emails pour identifier les expéditeurs récurrents
- **Interface Tinder** : Swipez pour garder ou vous désabonner des newsletters
- **Informations enrichies** : Recherche automatique d'informations sur chaque expéditeur
- **Désabonnement facile** : Gestion simplifiée de vos abonnements email

## 🚀 Installation

### Chrome / Edge

1. Ouvrez Chrome/Edge et allez dans `chrome://extensions/` ou `edge://extensions/`
2. Activez le "Mode développeur" en haut à droite
3. Cliquez sur "Charger l'extension non empaquetée"
4. Sélectionnez le dossier de l'extension

### Firefox

1. Ouvrez Firefox et allez dans `about:debugging`
2. Cliquez sur "Ce Firefox"
3. Cliquez sur "Charger un module complémentaire temporaire"
4. Sélectionnez le fichier `manifest.json`

## 📋 Prérequis

- Navigateur moderne (Chrome, Edge, Firefox)
- Accès à votre service email (Gmail, Outlook, Yahoo, etc.)

## 🔧 Configuration

### Connexion aux services email

Pour analyser vos emails, vous devrez configurer l'accès à votre service email :

#### Gmail API
1. Créez un projet dans [Google Cloud Console](https://console.cloud.google.com/)
2. Activez l'API Gmail
3. Créez des identifiants OAuth 2.0
4. Ajoutez les identifiants dans les paramètres de l'extension

#### Outlook API
1. Créez une application dans [Azure Portal](https://portal.azure.com/)
2. Configurez les permissions pour Microsoft Graph
3. Ajoutez les identifiants dans les paramètres de l'extension

## 📖 Utilisation

1. **Ouvrez l'extension** en cliquant sur l'icône dans la barre d'outils
2. **Analyse automatique** : L'extension analyse vos emails au premier lancement
3. **Swipez ou cliquez** :
   - **Swipe droite / ✓** : Garder l'abonnement
   - **Swipe gauche / ✗** : Se désabonner
4. **Consultez les informations** : Chaque carte affiche des détails sur l'expéditeur

## 🛠️ Développement

### Structure du projet

```
cleanMailSubscriptions/
├── manifest.json          # Configuration de l'extension
├── popup.html            # Interface principale
├── popup.js              # Logique de l'interface
├── background.js         # Service worker
├── content.js            # Script de contenu pour analyse
├── styles/
│   └── popup.css        # Styles de l'interface
└── icons/               # Icônes de l'extension
```

### Personnalisation

#### Ajouter une source d'emails

Modifiez la fonction `fetchEmailSubscriptions()` dans `popup.js` pour intégrer votre source d'emails.

#### Personnaliser la recherche d'informations

Modifiez la fonction `searchCompanyInfo()` dans `popup.js` pour utiliser votre API préférée (Clearbit, FullContact, etc.).

## 🔒 Confidentialité

- **Analyse locale** : Tous les emails sont analysés localement dans votre navigateur
- **Aucune donnée envoyée** : Les données ne quittent jamais votre ordinateur (sauf recherche d'informations optionnelle)
- **Stockage local** : Les données sont stockées uniquement dans le navigateur

## 📝 Notes

- L'extension nécessite des permissions pour accéder aux onglets et au stockage local
- Pour une analyse complète, vous devrez configurer l'accès à votre service email via API
- Le désabonnement automatique peut nécessiter une action manuelle selon le service email

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

MIT License

## 🐛 Problèmes connus

- L'analyse automatique nécessite la configuration d'une API email
- Certains services email peuvent nécessiter une authentification supplémentaire
- Le désabonnement automatique n'est pas disponible pour tous les services

## 🔮 Améliorations futures

- [ ] Support de plus de services email
- [ ] Désabonnement automatique via API
- [ ] Statistiques détaillées
- [ ] Export des données
- [ ] Filtres et recherche
- [ ] Mode sombre


// Service Worker pour l'extension Clean Mail Subscriptions

// Installation de l'extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension Clean Mail Subscriptions installée');
    initializeExtension();
  } else if (details.reason === 'update') {
    console.log('Extension mise à jour');
  }
});

// Initialisation de l'extension
async function initializeExtension() {
  // Initialiser le stockage
  const defaultData = {
    subscriptions: [],
    settings: {
      autoAnalyze: true,
      searchCompanyInfo: true
    }
  };
  
  await chrome.storage.local.set(defaultData);
}

// Écouter les messages depuis le popup ou content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeEmails') {
    analyzeEmailsFromBrowser().then(sendResponse);
    return true; // Indique une réponse asynchrone
  }
  
  if (request.action === 'getSubscriptions') {
    chrome.storage.local.get(['subscriptions']).then(result => {
      sendResponse({ subscriptions: result.subscriptions || [] });
    });
    return true;
  }
  
  if (request.action === 'unsubscribe') {
    handleUnsubscribe(request.subscription).then(sendResponse);
    return true;
  }
});

// Analyser les emails depuis le navigateur
async function analyzeEmailsFromBrowser() {
  try {
    // Cette fonction doit être adaptée selon le service email utilisé
    // Options possibles :
    // 1. Gmail API (nécessite OAuth)
    // 2. Outlook API (nécessite OAuth)
    // 3. Analyse locale des emails (si supporté par le navigateur)
    // 4. Import depuis un fichier
    
    const subscriptions = await extractEmailSubscriptions();
    await chrome.storage.local.set({ subscriptions });
    
    return { success: true, count: subscriptions.length };
  } catch (error) {
    console.error('Erreur lors de l\'analyse:', error);
    return { success: false, error: error.message };
  }
}

// Extraire les abonnements email
async function extractEmailSubscriptions() {
  // Cette fonction doit être implémentée selon votre méthode d'accès aux emails
  // Pour l'instant, retourne des données d'exemple
  
  // Exemple de structure de données
  const subscriptions = [];
  
  // En production, vous devrez :
  // 1. Se connecter à l'API email (Gmail, Outlook, etc.)
  // 2. Récupérer la liste des emails
  // 3. Grouper par expéditeur
  // 4. Extraire les métadonnées (date, sujet, etc.)
  
  return subscriptions;
}

// Gérer le désabonnement
async function handleUnsubscribe(subscription) {
  try {
    // Logique de désabonnement
    // Peut inclure :
    // - Ouverture automatique du lien de désabonnement
    // - Envoi d'un email de désabonnement
    // - Marquage dans le système email
    
    console.log('Traitement du désabonnement pour:', subscription.sender);
    
    return { success: true };
  } catch (error) {
    console.error('Erreur lors du désabonnement:', error);
    return { success: false, error: error.message };
  }
}

// Écouter les changements d'onglets pour détecter les pages email
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Détecter si c'est une page de service email
    const emailServices = [
      'mail.google.com',
      'outlook.live.com',
      'outlook.office.com',
      'mail.yahoo.com'
    ];
    
    const isEmailService = emailServices.some(service => 
      tab.url.includes(service)
    );
    
    if (isEmailService) {
      // Optionnel : analyser automatiquement les emails sur cette page
      console.log('Page email détectée:', tab.url);
    }
  }
});


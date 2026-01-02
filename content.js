// Content Script pour analyser les emails sur les pages web

// Détecter si on est sur une page de service email
const emailServices = {
  gmail: 'mail.google.com',
  outlook: 'outlook.live.com',
  yahoo: 'mail.yahoo.com'
};

function detectEmailService() {
  const hostname = window.location.hostname;
  
  if (hostname.includes('mail.google.com')) return 'gmail';
  if (hostname.includes('outlook.live.com') || hostname.includes('outlook.office.com')) return 'outlook';
  if (hostname.includes('mail.yahoo.com')) return 'yahoo';
  
  return null;
}

// Analyser les emails sur la page actuelle
async function analyzeCurrentPage() {
  const service = detectEmailService();
  
  if (!service) {
    return { success: false, message: 'Service email non supporté' };
  }
  
  try {
    const subscriptions = await extractSubscriptionsFromPage(service);
    return { success: true, subscriptions };
  } catch (error) {
    console.error('Erreur lors de l\'analyse:', error);
    return { success: false, error: error.message };
  }
}

// Extraire les abonnements depuis la page
async function extractSubscriptionsFromPage(service) {
  const subscriptions = [];
  const senderMap = new Map();
  
  // Sélecteurs selon le service email
  const selectors = {
    gmail: {
      emailList: '[role="main"] [role="tabpanel"] tr',
      sender: '[email]',
      subject: '[data-thread-perm-id]',
      date: '[data-thread-perm-id]'
    },
    outlook: {
      emailList: '[role="list"] [role="listitem"]',
      sender: '[title]',
      subject: '[title]',
      date: '[title]'
    }
  };
  
  const serviceSelectors = selectors[service];
  if (!serviceSelectors) {
    return subscriptions;
  }
  
  // Attendre que la page soit chargée
  await waitForElement(serviceSelectors.emailList);
  
  // Extraire les informations des emails visibles
  const emailElements = document.querySelectorAll(serviceSelectors.emailList);
  
  emailElements.forEach(element => {
    try {
      const senderElement = element.querySelector(serviceSelectors.sender);
      const subjectElement = element.querySelector(serviceSelectors.subject);
      
      if (senderElement) {
        const sender = senderElement.getAttribute('email') || 
                      senderElement.textContent.trim();
        const subject = subjectElement ? subjectElement.textContent.trim() : '';
        
        if (sender && sender.includes('@')) {
          if (!senderMap.has(sender)) {
            senderMap.set(sender, {
              sender: sender,
              senderName: extractSenderName(senderElement),
              emailCount: 0,
              subjects: [],
              lastEmailDate: new Date().toISOString(),
              domain: extractDomain(sender)
            });
          }
          
          const subscription = senderMap.get(sender);
          subscription.emailCount++;
          if (subject && !subscription.subjects.includes(subject)) {
            subscription.subjects.push(subject);
          }
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'extraction d\'un email:', error);
    }
  });
  
  return Array.from(senderMap.values());
}

// Extraire le nom de l'expéditeur
function extractSenderName(element) {
  // Essayer différents attributs et méthodes
  const name = element.getAttribute('name') || 
               element.getAttribute('title') ||
               element.textContent.trim();
  
  // Nettoyer le nom
  return name.split('<')[0].trim();
}

// Extraire le domaine d'un email
function extractDomain(email) {
  const match = email.match(/@(.+)/);
  return match ? match[1] : '';
}

// Attendre qu'un élément soit présent
function waitForElement(selector, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }
    
    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    setTimeout(() => {
      observer.disconnect();
      reject(new Error('Timeout waiting for element'));
    }, timeout);
  });
}

// Écouter les messages depuis le background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzePage') {
    analyzeCurrentPage().then(sendResponse);
    return true;
  }
  
  if (request.action === 'findUnsubscribeLink') {
    const link = findUnsubscribeLink();
    sendResponse({ link });
    return true;
  }
});

// Trouver le lien de désabonnement dans la page
function findUnsubscribeLink() {
  // Rechercher les liens de désabonnement communs
  const unsubscribeKeywords = [
    'unsubscribe',
    'désabonner',
    'opt-out',
    'se désabonner',
    'remove',
    'supprimer'
  ];
  
  const links = Array.from(document.querySelectorAll('a'));
  
  for (const link of links) {
    const text = link.textContent.toLowerCase();
    const href = link.href.toLowerCase();
    
    for (const keyword of unsubscribeKeywords) {
      if (text.includes(keyword) || href.includes(keyword)) {
        return {
          url: link.href,
          text: link.textContent.trim()
        };
      }
    }
  }
  
  return null;
}


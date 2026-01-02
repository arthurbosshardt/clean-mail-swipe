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
  if (hostname.includes('outlook.live.com') || hostname.includes('outlook.office.com') || hostname.includes('outlook.office365.com')) return 'outlook';
  if (hostname.includes('mail.yahoo.com')) return 'yahoo';
  
  return null;
}

// Détecter automatiquement le service email au chargement et créer le bouton
(function() {
  function initFloatingButton() {
    const service = detectEmailService();
    if (service && (service === 'gmail' || service === 'outlook')) {
      // Attendre que la page soit complètement chargée
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => {
            if (!document.getElementById('clean-mail-float-button')) {
              createFloatingButton(service);
            }
          }, 2000);
        });
      } else {
        setTimeout(() => {
          if (!document.getElementById('clean-mail-float-button')) {
            createFloatingButton(service);
          }
        }, 2000);
      }
    }
  }
  
  // Initialiser immédiatement
  initFloatingButton();
  
  // Réinitialiser si la page change (pour Gmail SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(() => {
        if (!document.getElementById('clean-mail-float-button')) {
          initFloatingButton();
        }
      }, 1000);
    }
  }).observe(document, { subtree: true, childList: true });
})();

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
  
  // Sélecteurs selon le service email (plusieurs variantes pour Gmail)
  const selectors = {
    gmail: {
      emailList: 'tr[role="row"]',
      // Plusieurs sélecteurs pour les lignes d'email
      emailRow: [
        'tr.zA',                    // Format standard
        'tr[role="row"]:not([role="columnheader"])', // Toutes les lignes sauf header
        'div[role="main"] tr[data-thread-id]',      // Format avec thread-id
        'div[role="main"] tbody tr',                 // Toutes les lignes du tbody
        'table tbody tr'                             // Format table classique
      ],
      // Plusieurs sélecteurs pour l'expéditeur
      sender: [
        'span[email]',
        'span.yW span[email]',
        'span[data-hovercard-id]',
        'span[title*="@"]',
        'td[class*="yW"] span[email]',
        'td[class*="yX"] span[email]',
        'td[class*="xY"] span[email]'
      ],
      subject: [
        'span.bog',
        'span[class*="bog"]',
        'td[class*="xY"] span',
        'span[class*="bqe"]'
      ],
      date: [
        'span.bqe',
        'span[class*="bqe"]',
        'td[class*="xW"] span',
        'span[title*="/"]'
      ],
      scrollContainer: '[role="main"]'
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
  
  if (service === 'gmail') {
    return await extractFromGmail(serviceSelectors, senderMap);
  } else if (service === 'outlook') {
    return await extractFromOutlook(serviceSelectors, senderMap);
  }
  
  return Array.from(senderMap.values());
}

// Extraire depuis Gmail avec scroll pour charger tous les emails
async function extractFromGmail(selectors, senderMap) {
  console.log('Début de l\'analyse Gmail...');
  
  // Attendre que Gmail soit chargé
  await waitForElement(selectors.emailList, 10000);
  
  let previousCount = 0;
  let noChangeCount = 0;
  const maxScrolls = 100; // Augmenter la limite pour plus d'emails
  let scrollCount = 0;
  
  // Fonction pour extraire les emails visibles avec recherche approfondie
  const extractVisibleEmails = () => {
    let extracted = 0;
    const processedRows = new Set(); // Pour éviter les doublons
    
    // Essayer tous les sélecteurs de lignes
    const emailRowSelectors = Array.isArray(selectors.emailRow) 
      ? selectors.emailRow 
      : [selectors.emailRow];
    
    const allRows = new Set();
    emailRowSelectors.forEach(selector => {
      try {
        const rows = document.querySelectorAll(selector);
        rows.forEach(row => {
          if (row && !processedRows.has(row)) {
            allRows.add(row);
          }
        });
      } catch (e) {
        // Ignorer les sélecteurs invalides
      }
    });
    
    // Si aucun résultat, essayer une recherche plus large
    if (allRows.size === 0) {
      const mainContainer = document.querySelector('[role="main"]');
      if (mainContainer) {
        const allTrs = mainContainer.querySelectorAll('tr');
        allTrs.forEach(tr => {
          if (tr && !tr.querySelector('[role="columnheader"]')) {
            allRows.add(tr);
          }
        });
      }
    }
    
    allRows.forEach(row => {
      try {
        if (processedRows.has(row)) return;
        processedRows.add(row);
        
        // Chercher l'expéditeur avec plusieurs méthodes
        let sender = null;
        let senderElement = null;
        let senderName = '';
        
        // Méthode 1: Chercher avec les sélecteurs définis
        const senderSelectors = Array.isArray(selectors.sender) 
          ? selectors.sender 
          : [selectors.sender];
        
        for (const selector of senderSelectors) {
          senderElement = row.querySelector(selector);
          if (senderElement) {
            sender = senderElement.getAttribute('email') || 
                    senderElement.getAttribute('data-hovercard-id') ||
                    senderElement.getAttribute('title') ||
                    senderElement.textContent.trim();
            if (sender && sender.includes('@')) break;
          }
        }
        
        // Méthode 2: Chercher tous les spans avec attribut email
        if (!sender || !sender.includes('@')) {
          const emailSpans = row.querySelectorAll('span[email], span[data-hovercard-id]');
          for (const span of emailSpans) {
            const email = span.getAttribute('email') || 
                         span.getAttribute('data-hovercard-id') ||
                         span.textContent.trim();
            if (email && email.includes('@')) {
              sender = email;
              senderElement = span;
              break;
            }
          }
        }
        
        // Méthode 3: Extraire depuis le texte de la ligne
        if (!sender || !sender.includes('@')) {
          const rowText = row.textContent || '';
          // Regex pour trouver les emails dans le texte
          const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
          const matches = rowText.match(emailRegex);
          if (matches && matches.length > 0) {
            sender = matches[0];
            // Chercher l'élément contenant cet email
            const walker = document.createTreeWalker(
              row,
              NodeFilter.SHOW_TEXT,
              null,
              false
            );
            let node;
            while (node = walker.nextNode()) {
              if (node.textContent.includes(sender)) {
                senderElement = node.parentElement;
                break;
              }
            }
          }
        }
        
        // Méthode 4: Chercher dans les cellules de la ligne
        if (!sender || !sender.includes('@')) {
          const cells = row.querySelectorAll('td, th');
          for (const cell of cells) {
            const cellText = cell.textContent || '';
            const emailRegex = /[\w\.-]+@[\w\.-]+\.\w+/g;
            const matches = cellText.match(emailRegex);
            if (matches && matches.length > 0) {
              // Prendre le premier email qui semble être un expéditeur (pas dans le sujet)
              const cellLower = cellText.toLowerCase();
              if (!cellLower.includes('subject') && !cellLower.includes('sujet')) {
                sender = matches[0];
                senderElement = cell;
                break;
              }
            }
          }
        }
        
        if (sender && sender.includes('@')) {
          // Nettoyer l'email
          const cleanSender = sender.replace(/[<>"']/g, '').trim().toLowerCase();
          
          // Extraire le nom de l'expéditeur
          if (senderElement) {
            senderName = extractSenderName(senderElement);
          }
          
          // Chercher le sujet avec plusieurs sélecteurs
          let subject = '';
          const subjectSelectors = Array.isArray(selectors.subject) 
            ? selectors.subject 
            : [selectors.subject];
          
          for (const selector of subjectSelectors) {
            const subjectElement = row.querySelector(selector);
            if (subjectElement) {
              subject = subjectElement.textContent.trim();
              if (subject) break;
            }
          }
          
          // Si pas de sujet trouvé, essayer de l'extraire du texte
          if (!subject) {
            const rowText = row.textContent || '';
            // Le sujet est généralement après l'expéditeur
            const parts = rowText.split(cleanSender);
            if (parts.length > 1) {
              subject = parts[1].trim().substring(0, 100);
            }
          }
          
          // Chercher la date
          let emailDate = new Date().toISOString();
          const dateSelectors = Array.isArray(selectors.date) 
            ? selectors.date 
            : [selectors.date];
          
          for (const selector of dateSelectors) {
            const dateElement = row.querySelector(selector);
            if (dateElement) {
              const dateText = dateElement.textContent.trim();
              try {
                const parsedDate = new Date(dateText);
                if (!isNaN(parsedDate.getTime())) {
                  emailDate = parsedDate.toISOString();
                  break;
                }
              } catch (e) {
                // Continuer avec la date par défaut
              }
            }
          }
          
          // Créer ou mettre à jour l'abonnement
          if (!senderMap.has(cleanSender)) {
            senderMap.set(cleanSender, {
              sender: cleanSender,
              senderName: senderName || cleanSender.split('@')[0],
              emailCount: 0,
              subjects: [],
              lastEmailDate: emailDate,
              firstEmailDate: emailDate,
              domain: extractDomain(cleanSender)
            });
          }
          
          const subscription = senderMap.get(cleanSender);
          subscription.emailCount++;
          
          if (subject && !subscription.subjects.includes(subject)) {
            subscription.subjects.push(subject);
            // Garder seulement les 10 derniers sujets
            if (subscription.subjects.length > 10) {
              subscription.subjects = subscription.subjects.slice(-10);
            }
          }
          
          // Mettre à jour les dates
          const emailDateObj = new Date(emailDate);
          const lastDateObj = new Date(subscription.lastEmailDate);
          const firstDateObj = new Date(subscription.firstEmailDate);
          
          if (emailDateObj > lastDateObj) {
            subscription.lastEmailDate = emailDate;
          }
          if (emailDateObj < firstDateObj) {
            subscription.firstEmailDate = emailDate;
          }
          
          extracted++;
        }
      } catch (error) {
        console.error('Erreur lors de l\'extraction d\'un email:', error);
      }
    });
    
    return extracted;
  };
  
  // Scroller pour charger tous les emails
  const scrollContainer = document.querySelector(selectors.scrollContainer) || document.body;
  
  // Limiter le temps total d'analyse à 40 secondes (pour laisser 10 secondes de marge avant le timeout du popup)
  const startTime = Date.now();
  const maxAnalysisTime = 40000; // 40 secondes
  
  while (scrollCount < maxScrolls) {
    // Vérifier le timeout
    if (Date.now() - startTime > maxAnalysisTime) {
      console.log('Timeout d\'analyse atteint après', scrollCount, 'scrolls');
      break;
    }
    
    // Extraire les emails visibles
    const currentCount = extractVisibleEmails();
    
    // Vérifier si on a trouvé de nouveaux emails
    if (currentCount === previousCount) {
      noChangeCount++;
      if (noChangeCount >= 5) {
        // Pas de nouveaux emails depuis 5 scrolls, on arrête
        console.log('Tous les emails ont été chargés');
        break;
      }
    } else {
      noChangeCount = 0;
    }
    
    previousCount = currentCount;
    
    // Scroller vers le bas
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    
    // Attendre que de nouveaux emails se chargent
    // Augmenter le délai pour laisser plus de temps au chargement
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    scrollCount++;
    
    // Envoyer un message de progression au popup via le background
    try {
      chrome.runtime.sendMessage({
        action: 'analysisProgress',
        count: senderMap.size,
        scrollCount: scrollCount
      }).catch(() => {
        // Ignorer les erreurs si personne n'écoute
      });
    } catch (e) {
      // Ignorer les erreurs de message
    }
  }
  
  console.log(`Analyse terminée: ${senderMap.size} expéditeurs trouvés après ${scrollCount} scrolls`);
  
  return Array.from(senderMap.values());
}

// Extraire depuis Outlook
async function extractFromOutlook(selectors, senderMap) {
  await waitForElement(selectors.emailList);
  const emailElements = document.querySelectorAll(selectors.emailList);
  
  emailElements.forEach(element => {
    try {
      const senderElement = element.querySelector(selectors.sender);
      const subjectElement = element.querySelector(selectors.subject);
      
      if (senderElement) {
        const sender = senderElement.getAttribute('email') || 
                      senderElement.textContent.trim();
        const subject = subjectElement ? subjectElement.textContent.trim() : '';
        
        if (sender && sender.includes('@')) {
          const cleanSender = sender.replace(/[<>]/g, '').trim();
          
          if (!senderMap.has(cleanSender)) {
            senderMap.set(cleanSender, {
              sender: cleanSender,
              senderName: extractSenderName(senderElement),
              emailCount: 0,
              subjects: [],
              lastEmailDate: new Date().toISOString(),
              domain: extractDomain(cleanSender)
            });
          }
          
          const subscription = senderMap.get(cleanSender);
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
  if (!element) return '';
  
  // Essayer différents attributs et méthodes
  let name = element.getAttribute('name') || 
             element.getAttribute('title') ||
             element.getAttribute('aria-label') ||
             element.textContent.trim();
  
  // Si le nom contient un email, extraire seulement la partie avant
  if (name.includes('@')) {
    // Format: "Name <email@domain.com>" ou "email@domain.com"
    const match = name.match(/^(.+?)\s*<.*@.*>/);
    if (match && match[1]) {
      name = match[1].trim();
    } else {
      // Si c'est juste l'email, prendre la partie avant @
      const emailMatch = name.match(/([^<@]+)@/);
      if (emailMatch) {
        name = emailMatch[1].trim();
      } else {
        name = name.split('@')[0].trim();
      }
    }
  }
  
  // Nettoyer le nom (enlever les caractères spéciaux en début/fin)
  name = name.replace(/^[<>"']+|[<>"']+$/g, '').trim();
  
  // Si le nom est trop court ou ressemble à un email, retourner vide
  if (name.length < 2 || name.includes('@')) {
    return '';
  }
  
  return name;
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
    analyzeCurrentPage()
      .then(result => {
        sendResponse(result);
      })
      .catch(error => {
        console.error('Erreur dans analyzeCurrentPage:', error);
        sendResponse({ success: false, error: error.message, subscriptions: [] });
      });
    return true; // Indique une réponse asynchrone
  }
  
  if (request.action === 'emailServiceDetected') {
    // Service email détecté - créer un bouton flottant
    console.log('Service email détecté:', request.service);
    createFloatingButton(request.service);
    return false;
  }
  
  if (request.action === 'findUnsubscribeLink') {
    try {
      const link = findUnsubscribeLink();
      sendResponse({ link });
    } catch (error) {
      console.error('Erreur dans findUnsubscribeLink:', error);
      sendResponse({ link: null });
    }
    return true;
  }
  
  return false;
});

// Créer un bouton flottant pour ouvrir la popup
function createFloatingButton(service) {
  // Vérifier si le bouton existe déjà
  if (document.getElementById('clean-mail-float-button')) {
    return;
  }
  
  // Créer le bouton
  const button = document.createElement('div');
  button.id = 'clean-mail-float-button';
  button.innerHTML = `
    <div class="clean-mail-button-content">
      <span class="clean-mail-icon">📧</span>
      <span class="clean-mail-text">Analyser mes emails</span>
    </div>
  `;
  
  // Styles inline pour le bouton
  button.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 20px;
    border-radius: 50px;
    cursor: pointer;
    box-shadow: 0 4px 20px rgba(102, 126, 234, 0.4);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 10px;
    transition: all 0.3s ease;
    border: none;
    user-select: none;
  `;
  
  // Styles pour le contenu
  const style = document.createElement('style');
  style.textContent = `
    #clean-mail-float-button:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 25px rgba(102, 126, 234, 0.6);
    }
    #clean-mail-float-button:active {
      transform: scale(0.95);
    }
    .clean-mail-button-content {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .clean-mail-icon {
      font-size: 20px;
    }
    .clean-mail-text {
      white-space: nowrap;
    }
    @media (max-width: 768px) {
      .clean-mail-text {
        display: none;
      }
      #clean-mail-float-button {
        padding: 15px;
        border-radius: 50%;
      }
    }
  `;
  document.head.appendChild(style);
  
  // Ajouter l'événement de clic
  button.addEventListener('click', async () => {
    // Vérifier si le contexte de l'extension est toujours valide
    if (!chrome.runtime || !chrome.runtime.id) {
      console.warn('Extension context invalidated. Veuillez recharger la page.');
      // Supprimer le bouton et suggérer de recharger
      if (button && button.parentNode) {
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
        button.title = 'Extension rechargée - Rechargez la page';
      }
      return;
    }
    
    try {
      // Obtenir l'URL de la popup
      const popupUrl = chrome.runtime.getURL('popup.html');
      
      // Ouvrir la popup dans une nouvelle fenêtre
      const popupWindow = window.open(popupUrl, 'clean-mail-popup', 'width=400,height=600,resizable=yes,scrollbars=yes');
      
      // Vérifier si la fenêtre a été ouverte
      if (!popupWindow || popupWindow.closed || typeof popupWindow.closed === 'undefined') {
        // Si la popup a été bloquée, essayer dans un nouvel onglet
        window.open(popupUrl, '_blank');
      }
      
      // Feedback visuel
      if (button && button.parentNode) {
        button.style.opacity = '0.7';
        button.style.transform = 'scale(0.95)';
        setTimeout(() => {
          // Vérifier que le bouton existe toujours avant de modifier son style
          const btn = document.getElementById('clean-mail-float-button');
          if (btn && btn.parentNode) {
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1)';
          }
        }, 200);
      }
    } catch (error) {
      console.error('Erreur lors de l\'ouverture de la popup:', error);
      
      // Si c'est une erreur de contexte invalide, suggérer de recharger
      if (error.message && (error.message.includes('invalidated') || error.message.includes('Extension context'))) {
        console.warn('Extension context invalidated. Rechargement de la page recommandé.');
        // Désactiver le bouton visuellement
        if (button && button.parentNode) {
          button.style.opacity = '0.5';
          button.style.cursor = 'not-allowed';
          button.title = 'Extension rechargée - Rechargez la page';
        }
        return;
      }
      
      // Fallback : essayer d'ouvrir dans un nouvel onglet
      try {
        if (chrome.runtime && chrome.runtime.id) {
          const popupUrl = chrome.runtime.getURL('popup.html');
          window.open(popupUrl, '_blank');
        }
      } catch (fallbackError) {
        // Si même le fallback échoue, c'est probablement un problème de contexte
        if (fallbackError.message && (fallbackError.message.includes('invalidated') || fallbackError.message.includes('Extension context'))) {
          console.warn('Extension context invalidated. Veuillez recharger la page.');
          if (button && button.parentNode) {
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
            button.title = 'Extension rechargée - Rechargez la page';
          }
        } else {
          console.error('Impossible d\'ouvrir la popup:', fallbackError);
        }
      }
    }
  });
  
  // Ajouter le bouton à la page
  document.body.appendChild(button);
  
  // Animation d'apparition
  setTimeout(() => {
    const btn = document.getElementById('clean-mail-float-button');
    if (btn && btn.parentNode) {
      btn.style.opacity = '0';
      btn.style.transform = 'translateY(20px)';
      btn.style.transition = 'all 0.3s ease';
      setTimeout(() => {
        const btnCheck = document.getElementById('clean-mail-float-button');
        if (btnCheck && btnCheck.parentNode) {
          btnCheck.style.opacity = '1';
          btnCheck.style.transform = 'translateY(0)';
        }
      }, 10);
    }
  }, 100);
  
  console.log('Bouton flottant créé');
}

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


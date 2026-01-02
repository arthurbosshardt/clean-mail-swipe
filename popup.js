// État de l'application
let currentIndex = 0;
let subscriptions = [];
let isDragging = false;
let startX = 0;
let currentX = 0;

// Éléments DOM
const cardContainer = document.getElementById('cardContainer');
const emailCard = document.getElementById('emailCard');
const loading = document.getElementById('loading');
const loadingProgress = document.getElementById('loadingProgress');
const emptyState = document.getElementById('emptyState');
const totalCount = document.getElementById('totalCount');
const totalSubscriptions = document.getElementById('totalSubscriptions');
const statsContainer = document.getElementById('statsContainer');
const senderName = document.getElementById('senderName');
const senderEmail = document.getElementById('senderEmail');
const senderAvatar = document.getElementById('senderAvatar');
const emailCount = document.getElementById('emailCount');
const lastEmail = document.getElementById('lastEmail');
const companyInfo = document.getElementById('companyInfo');
const emailSubjects = document.getElementById('emailSubjects');
const btnKeep = document.getElementById('btnKeep');
const btnUnsubscribe = document.getElementById('btnUnsubscribe');

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await checkEmailServiceAndLoad();
});

// Vérifier si on est sur un service email et charger
async function checkEmailServiceAndLoad() {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url) {
      const url = tabs[0].url;
      const isGmail = url.includes('mail.google.com');
      const isOutlook = url.includes('outlook.live.com') || url.includes('outlook.office.com') || url.includes('outlook.office365.com');
      
      if (isGmail || isOutlook) {
        // On est sur un service email, analyser directement
        await loadSubscriptions();
      } else {
        // Pas sur un service email, afficher l'état vide
        showEmptyState();
      }
    } else {
      // Pas d'onglet actif, afficher l'état vide
      showEmptyState();
    }
  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    // En cas d'erreur, essayer quand même de charger
    try {
      await loadSubscriptions();
    } catch (e) {
      showEmptyState();
    }
  }
}

// Charger les abonnements depuis le stockage
async function loadSubscriptions() {
  try {
    const result = await chrome.storage.local.get(['subscriptions']);
    subscriptions = result.subscriptions || [];
    
    if (subscriptions.length === 0) {
      // Si aucun abonnement, analyser les emails
      await analyzeEmails();
    } else {
      currentIndex = 0; // Réinitialiser l'index
      totalSubscriptions.textContent = subscriptions.length;
      displayCurrentCard();
    }
  } catch (error) {
    console.error('Erreur lors du chargement:', error);
    // En cas d'erreur, utiliser les données d'exemple (sans afficher d'erreur)
    try {
      // Pas de données disponibles
      subscriptions = [];
      showEmptyState();
      return;
    } catch (fallbackError) {
      console.error('Erreur même avec les données d\'exemple:', fallbackError);
    }
    // Seulement afficher l'erreur si vraiment rien ne fonctionne
    showError('Erreur lors du chargement des données');
  }
}

// Analyser les emails (simulation - à adapter selon l'API email utilisée)
async function analyzeEmails() {
  loading.style.display = 'block';
  emailCard.style.display = 'none';
  emptyState.style.display = 'none';
  
  try {
    // Ici, vous devrez adapter selon l'API email (Gmail, Outlook, etc.)
    subscriptions = await fetchEmailSubscriptions();
    
    if (subscriptions.length > 0) {
      await chrome.storage.local.set({ subscriptions });
      totalSubscriptions.textContent = subscriptions.length;
      currentIndex = 0; // Réinitialiser l'index
      displayCurrentCard();
    } else {
      // Si aucune donnée, afficher l'état vide
      subscriptions = [];
      showEmptyState();
    }
  } catch (error) {
    console.error('Erreur lors de l\'analyse:', error);
    // En cas d'erreur, afficher l'état vide
    subscriptions = [];
    showEmptyState();
  } finally {
    // Toujours cacher le loading à la fin
    loading.style.display = 'none';
    if (loadingProgress) {
      loadingProgress.textContent = '';
    }
  }
}

// Récupérer les abonnements email (à adapter selon votre source)
async function fetchEmailSubscriptions() {
  try {
    // Essayer de récupérer depuis le content script si on est sur une page email
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url) {
      const url = tabs[0].url;
      const isGmail = url.includes('mail.google.com');
      const isOutlook = url.includes('outlook.live.com') || url.includes('outlook.office.com');
      
      if (isGmail || isOutlook) {
        try {
          // Configurer l'écouteur de progression une seule fois
          if (!window.progressListenerSet) {
            chrome.runtime.onMessage.addListener((message) => {
              if (message.action === 'analysisProgress' && loadingProgress) {
                loadingProgress.textContent = `Analyse en cours... ${message.count} expéditeurs trouvés (scroll ${message.scrollCount})`;
              }
            });
            window.progressListenerSet = true;
          }
          
          // Mettre à jour le message de progression
          if (loadingProgress) {
            loadingProgress.textContent = 'Analyse de Gmail en cours...';
          }
          
          // Demander l'analyse complète avec timeout de 50 secondes
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout après 50 secondes')), 50000)
          );
          
          const analysisPromise = chrome.tabs.sendMessage(tabs[0].id, { action: 'analyzePage' });
          
          let response;
          try {
            response = await Promise.race([analysisPromise, timeoutPromise]);
          } catch (raceError) {
            // Si c'est le timeout ou une autre erreur
            console.log('Erreur lors de l\'analyse (timeout ou erreur):', raceError.message);
            if (loadingProgress) {
              loadingProgress.textContent = raceError.message.includes('Timeout') ? 'Analyse interrompue (timeout)' : 'Erreur lors de l\'analyse';
            }
            return [];
          }
          
          if (response && response.success && response.subscriptions && Array.isArray(response.subscriptions) && response.subscriptions.length > 0) {
            console.log('Données récupérées depuis le content script:', response.subscriptions.length);
            if (loadingProgress) {
              loadingProgress.textContent = `${response.subscriptions.length} abonnements trouvés !`;
            }
            return response.subscriptions;
          } else if (response && response.success && response.subscriptions && response.subscriptions.length === 0) {
            // Analyse réussie mais aucun abonnement trouvé
            console.log('Analyse terminée, aucun abonnement trouvé');
            if (loadingProgress) {
              loadingProgress.textContent = 'Aucun abonnement trouvé';
            }
            return [];
          } else {
            // Réponse invalide
            console.log('Réponse invalide du content script:', response);
            return [];
          }
        } catch (error) {
          console.log('Erreur lors de l\'analyse:', error.message);
          if (loadingProgress) {
            loadingProgress.textContent = 'Erreur lors de l\'analyse';
          }
          // Retourner un tableau vide en cas d'erreur
          return [];
        }
      }
    }
  } catch (error) {
    console.log('Erreur lors de la récupération:', error.message);
  }
  
  // Si on n'est pas sur Gmail/Outlook ou si l'analyse échoue, retourner un tableau vide
  console.log('Aucune donnée disponible');
  return [];
}

// Afficher la carte actuelle
async function displayCurrentCard() {
  // Cacher le loading et l'erreur
  loading.style.display = 'none';
  
  if (currentIndex >= subscriptions.length) {
    showEmptyState();
    return;
  }
  
  const subscription = subscriptions[currentIndex];
  
  // Réinitialiser la carte
  emailCard.classList.remove('swiping-left', 'swiping-right');
  emailCard.style.transform = '';
  emailCard.style.opacity = '1';
  
  // Remplir les données
  senderName.textContent = subscription.senderName || subscription.sender;
  senderEmail.textContent = subscription.sender;
  emailCount.textContent = subscription.emailCount || 0;
  lastEmail.textContent = formatDate(subscription.lastEmailDate);
  
  // Générer avatar
  senderAvatar.textContent = getAvatarEmoji(subscription.senderName || subscription.sender);
  
  // Afficher les sujets
  emailSubjects.innerHTML = '';
  if (subscription.subjects && subscription.subjects.length > 0) {
    subscription.subjects.slice(0, 5).forEach(subject => {
      const li = document.createElement('li');
      li.textContent = subject;
      emailSubjects.appendChild(li);
    });
  }
  
  // Charger les informations de l'entreprise
  await loadCompanyInfo(subscription);
  
  // Afficher la carte
  loading.style.display = 'none';
  emailCard.style.display = 'block';
  emptyState.style.display = 'none';
  
  // Mettre à jour le compteur (seulement si il y a des abonnements)
  if (subscriptions.length > 0) {
    statsContainer.style.display = 'block';
    totalCount.textContent = currentIndex + 1;
    totalSubscriptions.textContent = subscriptions.length;
  } else {
    statsContainer.style.display = 'none';
  }
}

// Charger les informations sur l'entreprise depuis Internet
async function loadCompanyInfo(subscription) {
  companyInfo.innerHTML = '<p>Recherche d\'informations en cours...</p>';
  
  try {
    const domain = subscription.domain || extractDomain(subscription.sender);
    const info = await searchCompanyInfo(domain);
    
    companyInfo.innerHTML = '';
    
    if (info.name && info.name !== domain) {
      const h4 = document.createElement('h4');
      h4.textContent = info.name;
      h4.style.marginBottom = '10px';
      h4.style.fontSize = '16px';
      companyInfo.appendChild(h4);
    }
    
    if (info.description) {
      const p = document.createElement('p');
      p.textContent = info.description;
      p.style.marginBottom = '10px';
      companyInfo.appendChild(p);
    }
    
    if (info.website) {
      const a = document.createElement('a');
      a.href = info.website;
      a.target = '_blank';
      a.textContent = 'Visiter le site web →';
      a.style.display = 'block';
      a.style.marginTop = '10px';
      a.style.color = '#667eea';
      companyInfo.appendChild(a);
    }
    
    if (info.category && info.category !== 'Unknown') {
      const p = document.createElement('p');
      p.innerHTML = `<strong>Catégorie:</strong> ${info.category}`;
      p.style.marginTop = '10px';
      companyInfo.appendChild(p);
    }
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    companyInfo.innerHTML = '<p>Impossible de charger les informations</p>';
  }
}

// Rechercher des informations sur l'entreprise
async function searchCompanyInfo(domain) {
  try {
    // Essayer DuckDuckGo Instant Answer API (gratuit, sans clé)
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(domain)}&format=json&no_html=1&skip_disambig=1`);
    const data = await response.json();
    
    if (data.AbstractText) {
      return {
        name: data.Heading || domain,
        description: data.AbstractText,
        website: `https://${domain}`,
        category: data.Type || 'Unknown'
      };
    }
    
    // Fallback: informations basiques
    return {
      name: domain,
      description: `Site web: ${domain}. Analysez vos emails pour plus d'informations.`,
      website: `https://${domain}`,
      category: 'Unknown'
    };
  } catch (error) {
    console.error('Erreur recherche web:', error);
    return {
      name: domain,
      description: `Site web: ${domain}`,
      website: `https://${domain}`,
      category: 'Unknown'
    };
  }
}

// Extraire le domaine d'un email
function extractDomain(email) {
  return email.split('@')[1] || '';
}

// Obtenir un emoji pour l'avatar
function getAvatarEmoji(name) {
  const emojis = ['📧', '📮', '✉️', '📬', '📭', '💌', '📨', '📩'];
  const index = name.charCodeAt(0) % emojis.length;
  return emojis[index];
}

// Formater une date
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now - date);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
  return date.toLocaleDateString('fr-FR');
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
  // Boutons d'action
  btnKeep.addEventListener('click', () => handleKeep());
  btnUnsubscribe.addEventListener('click', () => handleUnsubscribe());
  
  // Swipe avec la souris
  emailCard.addEventListener('mousedown', startDrag);
  document.addEventListener('mousemove', drag);
  document.addEventListener('mouseup', endDrag);
  
  // Swipe tactile
  emailCard.addEventListener('touchstart', startDragTouch);
  emailCard.addEventListener('touchmove', dragTouch);
  emailCard.addEventListener('touchend', endDragTouch);
  
  // Raccourcis clavier
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') handleUnsubscribe();
    if (e.key === 'ArrowRight') handleKeep();
  });
}

// Gestion du drag (souris)
function startDrag(e) {
  isDragging = true;
  startX = e.clientX;
  emailCard.style.transition = 'none';
}

function drag(e) {
  if (!isDragging) return;
  e.preventDefault();
  currentX = e.clientX - startX;
  updateCardPosition();
}

function endDrag() {
  if (!isDragging) return;
  isDragging = false;
  emailCard.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
  
  const threshold = 100;
  if (Math.abs(currentX) > threshold) {
    if (currentX > 0) {
      handleKeep();
    } else {
      handleUnsubscribe();
    }
  } else {
    resetCardPosition();
  }
}

// Gestion du drag (tactile)
function startDragTouch(e) {
  isDragging = true;
  startX = e.touches[0].clientX;
  emailCard.style.transition = 'none';
}

function dragTouch(e) {
  if (!isDragging) return;
  e.preventDefault();
  currentX = e.touches[0].clientX - startX;
  updateCardPosition();
}

function endDragTouch() {
  endDrag();
}

// Mettre à jour la position de la carte
function updateCardPosition() {
  const rotation = currentX * 0.1;
  emailCard.style.transform = `translateX(${currentX}px) rotate(${rotation}deg)`;
  
  if (currentX > 50) {
    emailCard.classList.add('swiping-right');
    emailCard.classList.remove('swiping-left');
  } else if (currentX < -50) {
    emailCard.classList.add('swiping-left');
    emailCard.classList.remove('swiping-right');
  } else {
    emailCard.classList.remove('swiping-left', 'swiping-right');
  }
}

// Réinitialiser la position de la carte
function resetCardPosition() {
  currentX = 0;
  emailCard.style.transform = '';
  emailCard.style.opacity = '1';
  emailCard.classList.remove('swiping-left', 'swiping-right');
}

// Garder l'abonnement
function handleKeep() {
  const subscription = subscriptions[currentIndex];
  subscription.action = 'keep';
  subscription.processed = true;
  
  saveSubscription(subscription);
  nextCard();
}

// Se désabonner
async function handleUnsubscribe() {
  const subscription = subscriptions[currentIndex];
  subscription.action = 'unsubscribe';
  subscription.processed = true;
  
  // Ouvrir le lien de désabonnement ou marquer pour traitement
  await processUnsubscribe(subscription);
  saveSubscription(subscription);
  nextCard();
}

// Traiter le désabonnement
async function processUnsubscribe(subscription) {
  try {
    // Chercher un lien de désabonnement
    if (subscription.unsubscribeLinks && subscription.unsubscribeLinks.length > 0) {
      const unsubscribeLink = subscription.unsubscribeLinks[0];
      
      if (unsubscribeLink.method === 'link') {
        // Ouvrir le lien de désabonnement dans un nouvel onglet
        await chrome.tabs.create({ url: unsubscribeLink.url });
      } else if (unsubscribeLink.method === 'email') {
        // Ouvrir le client email avec le sujet de désabonnement
        const email = unsubscribeLink.url.replace('mailto:', '');
        await chrome.tabs.create({ url: `mailto:${email}?subject=Unsubscribe` });
      }
    } else {
      // Essayer de trouver le lien depuis le content script
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        try {
          const response = await chrome.tabs.sendMessage(tabs[0].id, { 
            action: 'findUnsubscribeLink' 
          });
          if (response && response.link) {
            await chrome.tabs.create({ url: response.link.url });
          } else {
            // Ouvrir une recherche pour trouver comment se désabonner
            await chrome.tabs.create({ 
              url: `https://www.google.com/search?q=${encodeURIComponent('how to unsubscribe from ' + subscription.sender)}` 
            });
          }
        } catch (error) {
          // Fallback: recherche Google
          await chrome.tabs.create({ 
            url: `https://www.google.com/search?q=${encodeURIComponent('how to unsubscribe from ' + subscription.sender)}` 
          });
        }
      }
    }
    
    console.log('Désabonnement traité pour:', subscription.sender);
  } catch (error) {
    console.error('Erreur lors du désabonnement:', error);
    showError('Erreur lors de l\'ouverture du lien de désabonnement');
  }
}

// Sauvegarder l'abonnement
async function saveSubscription(subscription) {
  subscriptions[currentIndex] = subscription;
  await chrome.storage.local.set({ subscriptions });
}

// Carte suivante
function nextCard() {
  currentIndex++;
  if (currentIndex < subscriptions.length) {
    displayCurrentCard();
  } else {
    showEmptyState();
  }
}

// Afficher l'état vide
function showEmptyState() {
  loading.style.display = 'none';
  emailCard.style.display = 'none';
  emptyState.style.display = 'block';
  statsContainer.style.display = 'none';
  if (loadingProgress) {
    loadingProgress.textContent = '';
  }
}

// Afficher une erreur
function showError(message) {
  loading.innerHTML = `<p style="color: #f44336;">${message}</p>`;
  loading.style.display = 'block';
  emailCard.style.display = 'none';
  emptyState.style.display = 'none';
  statsContainer.style.display = 'none';
}


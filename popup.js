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
const emptyState = document.getElementById('emptyState');
const totalCount = document.getElementById('totalCount');
const senderName = document.getElementById('senderName');
const senderEmail = document.getElementById('senderEmail');
const senderAvatar = document.getElementById('senderAvatar');
const emailCount = document.getElementById('emailCount');
const lastEmail = document.getElementById('lastEmail');
const companyInfo = document.getElementById('companyInfo');
const emailSubjects = document.getElementById('emailSubjects');
const btnKeep = document.getElementById('btnKeep');
const btnUnsubscribe = document.getElementById('btnUnsubscribe');
const btnSwipeLeft = document.getElementById('btnSwipeLeft');
const btnSwipeRight = document.getElementById('btnSwipeRight');

// Initialisation
document.addEventListener('DOMContentLoaded', async () => {
  await loadSubscriptions();
  setupEventListeners();
});

// Charger les abonnements depuis le stockage
async function loadSubscriptions() {
  try {
    const result = await chrome.storage.local.get(['subscriptions']);
    subscriptions = result.subscriptions || [];
    
    if (subscriptions.length === 0) {
      // Si aucun abonnement, analyser les emails
      await analyzeEmails();
    } else {
      displayCurrentCard();
    }
  } catch (error) {
    console.error('Erreur lors du chargement:', error);
    showError('Erreur lors du chargement des données');
  }
}

// Analyser les emails (simulation - à adapter selon l'API email utilisée)
async function analyzeEmails() {
  loading.style.display = 'block';
  emailCard.style.display = 'none';
  
  try {
    // Ici, vous devrez adapter selon l'API email (Gmail, Outlook, etc.)
    // Pour l'instant, on simule avec des données d'exemple
    subscriptions = await fetchEmailSubscriptions();
    
    if (subscriptions.length > 0) {
      await chrome.storage.local.set({ subscriptions });
      totalCount.textContent = subscriptions.length;
      displayCurrentCard();
    } else {
      showEmptyState();
    }
  } catch (error) {
    console.error('Erreur lors de l\'analyse:', error);
    showError('Impossible d\'analyser les emails');
  } finally {
    loading.style.display = 'none';
  }
}

// Récupérer les abonnements email (à adapter selon votre source)
async function fetchEmailSubscriptions() {
  try {
    // Essayer de récupérer depuis le content script si on est sur une page email
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      try {
        const response = await chrome.tabs.sendMessage(tabs[0].id, { action: 'analyzePage' });
        if (response && response.success && response.subscriptions) {
          return response.subscriptions;
        }
      } catch (error) {
        // Pas de content script disponible ou erreur
        console.log('Content script non disponible, utilisation des données stockées');
      }
    }
    
    // Essayer de récupérer depuis le background
    const bgResponse = await chrome.runtime.sendMessage({ action: 'analyzeEmails' });
    if (bgResponse && bgResponse.success) {
      const result = await chrome.storage.local.get(['subscriptions']);
      return result.subscriptions || [];
    }
    
    // Fallback: données d'exemple pour la démo
    return getMockSubscriptions();
  } catch (error) {
    console.error('Erreur lors de la récupération:', error);
    return getMockSubscriptions();
  }
}

// Données d'exemple pour la démonstration
function getMockSubscriptions() {
  return [
    {
      sender: 'newsletter@example.com',
      senderName: 'Example Newsletter',
      emailCount: 15,
      lastEmailDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      subjects: ['Promotion spéciale', 'Nouveautés', 'Offre exclusive', 'Black Friday', 'Soldes d\'été'],
      domain: 'example.com'
    },
    {
      sender: 'info@technews.com',
      senderName: 'Tech News',
      emailCount: 42,
      lastEmailDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      subjects: ['Nouvelles technologies', 'IA et Machine Learning', 'Tendances 2024'],
      domain: 'technews.com'
    }
  ];
}

// Afficher la carte actuelle
async function displayCurrentCard() {
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
  
  totalCount.textContent = `${currentIndex + 1} / ${subscriptions.length}`;
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
  btnSwipeLeft.addEventListener('click', () => handleUnsubscribe());
  btnSwipeRight.addEventListener('click', () => handleKeep());
  
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
}

// Afficher une erreur
function showError(message) {
  loading.innerHTML = `<p style="color: #f44336;">${message}</p>`;
  loading.style.display = 'block';
}


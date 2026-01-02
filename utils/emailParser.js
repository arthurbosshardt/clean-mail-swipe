// Utilitaires pour parser et analyser les emails

/**
 * Parse un email et extrait les métadonnées
 */
export function parseEmail(emailData) {
  return {
    sender: extractSender(emailData),
    subject: extractSubject(emailData),
    date: extractDate(emailData),
    body: extractBody(emailData),
    unsubscribeLink: extractUnsubscribeLink(emailData)
  };
}

/**
 * Extrait l'expéditeur d'un email
 */
function extractSender(emailData) {
  if (emailData.from) {
    // Format: "Name <email@domain.com>" ou "email@domain.com"
    const match = emailData.from.match(/<(.+)>/) || emailData.from.match(/([\w\.-]+@[\w\.-]+\.\w+)/);
    return match ? match[1] || match[0] : emailData.from;
  }
  return null;
}

/**
 * Extrait le nom de l'expéditeur
 */
export function extractSenderName(emailData) {
  if (emailData.from) {
    const match = emailData.from.match(/^(.+?)\s*</);
    return match ? match[1].trim() : null;
  }
  return null;
}

/**
 * Extrait le sujet de l'email
 */
function extractSubject(emailData) {
  return emailData.subject || emailData.headers?.subject || '';
}

/**
 * Extrait la date de l'email
 */
function extractDate(emailData) {
  if (emailData.date) {
    return new Date(emailData.date).toISOString();
  }
  if (emailData.headers?.date) {
    return new Date(emailData.headers.date).toISOString();
  }
  return new Date().toISOString();
}

/**
 * Extrait le corps de l'email
 */
function extractBody(emailData) {
  return emailData.body || emailData.textBody || emailData.htmlBody || '';
}

/**
 * Extrait le lien de désabonnement depuis le corps de l'email
 */
export function extractUnsubscribeLink(emailData) {
  const body = extractBody(emailData);
  const htmlBody = emailData.htmlBody || emailData.body || '';
  
  // Mots-clés pour trouver les liens de désabonnement
  const keywords = [
    'unsubscribe',
    'désabonner',
    'opt-out',
    'se désabonner',
    'remove',
    'supprimer',
    'optout',
    'mailto:unsubscribe'
  ];
  
  // Chercher dans le HTML
  if (htmlBody) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlBody, 'text/html');
    const links = doc.querySelectorAll('a');
    
    for (const link of links) {
      const href = link.href.toLowerCase();
      const text = link.textContent.toLowerCase();
      
      for (const keyword of keywords) {
        if (href.includes(keyword) || text.includes(keyword)) {
          return {
            url: link.href,
            text: link.textContent.trim(),
            method: detectUnsubscribeMethod(link.href)
          };
        }
      }
    }
  }
  
  // Chercher dans le texte brut
  if (body) {
    const regex = /(?:https?:\/\/[^\s]+(?:unsubscribe|désabonner|opt-out)[^\s]*)/gi;
    const matches = body.match(regex);
    if (matches && matches.length > 0) {
      return {
        url: matches[0],
        text: 'Lien de désabonnement',
        method: 'link'
      };
    }
    
    // Chercher les emails de désabonnement
    const emailRegex = /mailto:([^\s]+(?:unsubscribe|optout)[^\s@]*@[^\s]+)/gi;
    const emailMatches = body.match(emailRegex);
    if (emailMatches && emailMatches.length > 0) {
      return {
        url: emailMatches[0],
        text: 'Email de désabonnement',
        method: 'email'
      };
    }
  }
  
  return null;
}

/**
 * Détecte la méthode de désabonnement
 */
function detectUnsubscribeMethod(url) {
  if (url.startsWith('mailto:')) {
    return 'email';
  }
  if (url.includes('list-unsubscribe')) {
    return 'list-unsubscribe';
  }
  return 'link';
}

/**
 * Groupe les emails par expéditeur
 */
export function groupEmailsBySender(emails) {
  const senderMap = new Map();
  
  emails.forEach(email => {
    const parsed = parseEmail(email);
    const sender = parsed.sender;
    
    if (!sender) return;
    
    if (!senderMap.has(sender)) {
      senderMap.set(sender, {
        sender: sender,
        senderName: extractSenderName(email),
        emails: [],
        emailCount: 0,
        subjects: [],
        lastEmailDate: null,
        firstEmailDate: null,
        domain: extractDomain(sender),
        unsubscribeLinks: []
      });
    }
    
    const subscription = senderMap.get(sender);
    subscription.emails.push(email);
    subscription.emailCount++;
    
    if (parsed.subject) {
      subscription.subjects.push(parsed.subject);
    }
    
    const emailDate = new Date(parsed.date);
    if (!subscription.lastEmailDate || emailDate > new Date(subscription.lastEmailDate)) {
      subscription.lastEmailDate = parsed.date;
    }
    if (!subscription.firstEmailDate || emailDate < new Date(subscription.firstEmailDate)) {
      subscription.firstEmailDate = parsed.date;
    }
    
    const unsubscribeLink = parsed.unsubscribeLink;
    if (unsubscribeLink && !subscription.unsubscribeLinks.find(link => link.url === unsubscribeLink.url)) {
      subscription.unsubscribeLinks.push(unsubscribeLink);
    }
  });
  
  // Convertir en tableau et nettoyer
  return Array.from(senderMap.values()).map(sub => {
    // Garder seulement les 10 derniers sujets uniques
    sub.subjects = [...new Set(sub.subjects)].slice(0, 10);
    return sub;
  });
}

/**
 * Extrait le domaine d'un email
 */
function extractDomain(email) {
  const match = email.match(/@(.+)/);
  return match ? match[1].toLowerCase() : '';
}

/**
 * Calcule des statistiques sur les abonnements
 */
export function calculateStats(subscriptions) {
  const total = subscriptions.length;
  const withUnsubscribeLink = subscriptions.filter(s => s.unsubscribeLinks.length > 0).length;
  const avgEmailsPerSender = subscriptions.reduce((sum, s) => sum + s.emailCount, 0) / total || 0;
  
  return {
    total,
    withUnsubscribeLink,
    withoutUnsubscribeLink: total - withUnsubscribeLink,
    avgEmailsPerSender: Math.round(avgEmailsPerSender * 10) / 10
  };
}


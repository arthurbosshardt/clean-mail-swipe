// Utilitaires pour les appels API et la recherche d'informations

/**
 * Recherche des informations sur une entreprise via son domaine
 * @param {string} domain - Le domaine de l'entreprise
 * @returns {Promise<Object>} Informations sur l'entreprise
 */
export async function searchCompanyInfo(domain) {
  try {
    // Option 1: Utiliser l'API Clearbit (nécessite une clé API)
    // const info = await searchWithClearbit(domain);
    
    // Option 2: Utiliser l'API FullContact (nécessite une clé API)
    // const info = await searchWithFullContact(domain);
    
    // Option 3: Recherche web via DuckDuckGo ou autre
    const info = await searchWithWebSearch(domain);
    
    return info;
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    return getDefaultInfo(domain);
  }
}

/**
 * Recherche avec Clearbit API
 * Nécessite une clé API gratuite depuis https://clearbit.com/
 */
async function searchWithClearbit(domain) {
  const apiKey = await getApiKey('clearbit');
  if (!apiKey) {
    throw new Error('Clearbit API key not configured');
  }
  
  const response = await fetch(`https://company.clearbit.com/v1/companies/domain/${domain}`, {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  });
  
  if (!response.ok) {
    throw new Error('Clearbit API error');
  }
  
  const data = await response.json();
  
  return {
    name: data.name,
    description: data.description,
    website: data.domain,
    category: data.category?.industry,
    logo: data.logo,
    location: data.geo?.city
  };
}

/**
 * Recherche avec FullContact API
 * Nécessite une clé API depuis https://www.fullcontact.com/
 */
async function searchWithFullContact(domain) {
  const apiKey = await getApiKey('fullcontact');
  if (!apiKey) {
    throw new Error('FullContact API key not configured');
  }
  
  const response = await fetch(`https://api.fullcontact.com/v3/company.enrich`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ domain })
  });
  
  if (!response.ok) {
    throw new Error('FullContact API error');
  }
  
  const data = await response.json();
  
  return {
    name: data.name,
    description: data.description,
    website: data.website,
    category: data.category,
    logo: data.logo
  };
}

/**
 * Recherche web simple (sans API)
 * Utilise DuckDuckGo Instant Answer API (gratuit, sans clé)
 */
async function searchWithWebSearch(domain) {
  try {
    // Essayer DuckDuckGo Instant Answer
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
    return getDefaultInfo(domain);
  } catch (error) {
    console.error('Erreur recherche web:', error);
    return getDefaultInfo(domain);
  }
}

/**
 * Informations par défaut si la recherche échoue
 */
function getDefaultInfo(domain) {
  return {
    name: domain,
    description: `Site web: ${domain}`,
    website: `https://${domain}`,
    category: 'Unknown'
  };
}

/**
 * Récupère une clé API depuis le stockage
 */
async function getApiKey(service) {
  const result = await chrome.storage.local.get(['apiKeys']);
  return result.apiKeys?.[service];
}

/**
 * Sauvegarde une clé API
 */
export async function saveApiKey(service, apiKey) {
  const result = await chrome.storage.local.get(['apiKeys']);
  const apiKeys = result.apiKeys || {};
  apiKeys[service] = apiKey;
  await chrome.storage.local.set({ apiKeys });
}

/**
 * Recherche d'informations sur un email/domaine avec plusieurs sources
 */
export async function enrichSubscriptionData(subscription) {
  const domain = subscription.domain || extractDomain(subscription.sender);
  
  try {
    const companyInfo = await searchCompanyInfo(domain);
    
    return {
      ...subscription,
      companyInfo: {
        name: companyInfo.name,
        description: companyInfo.description,
        website: companyInfo.website,
        category: companyInfo.category,
        logo: companyInfo.logo
      }
    };
  } catch (error) {
    console.error('Erreur enrichissement:', error);
    return subscription;
  }
}

/**
 * Extrait le domaine d'un email
 */
function extractDomain(email) {
  const match = email.match(/@(.+)/);
  return match ? match[1].toLowerCase() : '';
}


import * as recommendationService from './recommendation.service.js';
import * as eventService from './event.service.js';

/**
 * Known locations in Kerala / South India for fast deterministic matching
 */
const KNOWN_LOCATIONS = [
  'palakkad',
  'kochi',
  'cochin',
  'ernakulam',
  'thrissur',
  'calicut',
  'kozhikode',
  'trivandrum',
  'thiruvananthapuram',
  'alathur',
  'kannur',
  'kollam',
  'kottayam',
  'malappuram',
  'wayanad',
  'coimbatore',
  'bangalore',
  'bengaluru',
  'chennai',
];

/**
 * Category detection patterns
 */
export const CATEGORY_PATTERNS = [
  { category: 'Photography', canonical: 'Photography', regex: /\b(photo(?:graphy|grapher|graphers|s)?|cinematograph(?:y|er|ers)|candid|videograph(?:y|er|ers)|camera)\b/i },
  { category: 'Venue', canonical: 'Venue / Auditorium', regex: /\b(venue(?:s)?|auditorium(?:s)?|hall(?:s)?|palace(?:s)?|resort(?:s)?|ballroom(?:s)?|convention\s+center(?:s)?)\b/i },
  { category: 'Catering', canonical: 'Catering', regex: /\b(cater(?:ing|er|ers)?|food|sadya|buffet|banquet(?:s)?|feast(?:s)?|meals?)\b/i },
  { category: 'Decoration', canonical: 'Decoration', regex: /\b(decor(?:ation|ations|ator|ators)?|floral|flowers|stage\s+decor|mandap)\b/i },
  { category: 'Makeup Artist', canonical: 'Makeup Artist', regex: /\b(makeup|make-up|make\s+up|bridal\s+makeover|beautician(?:s)?|grooming)\b/i },
  { category: 'DJ & Entertainment', canonical: 'DJ & Entertainment', regex: /\b(dj(?:s)?|entertainment|sound\s+system|music\s+band|live\s+band|orchestra)\b/i },
  { category: 'Event Management', canonical: 'Event Management', regex: /\b(event\s+manage(?:ment|r|rs)?|wedding\s+planner(?:s)?|planner(?:s)?|coordinat(?:or|ors|ion))\b/i },
];

/**
 * Normalizes category label for customer-facing chat messages
 */
export const getCategoryMessageLabel = (cat) => {
  if (!cat) return 'Service';
  const lower = String(cat).toLowerCase();
  if (lower.includes('photo')) return 'Photography';
  if (lower.includes('venue') || lower.includes('auditorium') || lower.includes('hall')) return 'Venue';
  if (lower.includes('cater')) return 'Catering';
  if (lower.includes('decor')) return 'Decoration';
  if (lower.includes('makeup')) return 'Makeup Artist';
  if (lower.includes('dj') || lower.includes('entertain')) return 'DJ & Entertainment';
  if (lower.includes('event') || lower.includes('plan')) return 'Event Management';
  return cat;
};

/**
 * Formats an array of category names into natural English
 */
export const formatCategoryList = (categories) => {
  if (!categories || categories.length === 0) return '';
  const labels = categories.map(getCategoryMessageLabel);
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`;
};

/**
 * Resolves required/suggested categories from the customer's event blueprint
 */
export const resolveCategoriesFromEvent = (aiContext) => {
  if (!aiContext) return ['Venue', 'Photography', 'Catering'];

  const resolved = [];

  // A. Check requiredServices
  if (Array.isArray(aiContext.requiredServices) && aiContext.requiredServices.length > 0) {
    for (const reqSvc of aiContext.requiredServices) {
      const term = String(reqSvc || '').toLowerCase();
      for (const { category: catName, regex } of CATEGORY_PATTERNS) {
        if (regex.test(term) || term.includes(catName.toLowerCase())) {
          if (!resolved.includes(catName)) {
            resolved.push(catName);
          }
        }
      }
    }
  }

  // B. Check preferences and additional notes
  if (resolved.length === 0) {
    const textToCheck = [
      Array.isArray(aiContext.preferences)
        ? aiContext.preferences.join(' ')
        : (typeof aiContext.preferences === 'object' ? JSON.stringify(aiContext.preferences) : String(aiContext.preferences || '')),
      String(aiContext.additionalNotes || ''),
    ].join(' ').toLowerCase();

    for (const { category: catName, regex } of CATEGORY_PATTERNS) {
      if (regex.test(textToCheck)) {
        if (!resolved.includes(catName)) {
          resolved.push(catName);
        }
      }
    }
  }

  // C. Fallback to sensible core categories based on eventType
  if (resolved.length === 0) {
    const eventType = (aiContext.eventType || '').toLowerCase();
    if (eventType.includes('birthday') || eventType.includes('party')) {
      resolved.push('Venue', 'Catering', 'DJ & Entertainment');
    } else {
      // Default for wedding / general celebration
      resolved.push('Photography', 'Venue', 'Catering');
    }
  }

  return resolved;
};

/**
 * Builds deterministic grounded message reflecting found and missing categories
 */
export const buildRecommendationMessage = ({
  foundCategories = [],
  missingCategories = [],
  totalFound = 0,
  location = null,
  singleCategoryLabel = null,
  selectedPlan = [],
  totalPlanCost = null,
  remainingBudget = null,
  totalBudget = null,
  isWithinBudget = true,
  budgetDeficit = 0,
  costliestServices = [],
}) => {
  if (totalFound === 0) {
    if (missingCategories.length > 0) {
      const missingStr = formatCategoryList(missingCategories);
      const locStr = location ? ` in ${location}` : '';
      return `I couldn't find a provider matching all of those requirements for ${missingStr}${locStr}. Would you like me to broaden the location or budget?`;
    }
    return "I couldn't find a provider matching all of those requirements. Would you like me to broaden the location or budget?";
  }

  const locStr = location ? ` in ${location}` : '';

  // Single category query: preserve exact phrasing for existing test compatibility
  if (foundCategories.length <= 1 && missingCategories.length === 0 && singleCategoryLabel) {
    const count = totalFound;
    return `I found ${count} ${singleCategoryLabel.toLowerCase()} provider${count > 1 ? 's' : ''}${locStr} that match your requirements.`;
  }

  // Budget exceeded case: when no complete combination fits inside total budget
  if (!isWithinBudget && budgetDeficit > 0) {
    const foundStr = formatCategoryList(foundCategories);
    const deficitStr = `₹${budgetDeficit.toLocaleString('en-IN')}`;
    const minBudgetStr = `₹${(totalPlanCost || 0).toLocaleString('en-IN')}`;
    const budgetStr = totalBudget ? `₹${totalBudget.toLocaleString('en-IN')}` : 'your budget';

    let overBudgetMsg = `A complete event plan for ${foundStr}${locStr} requires a minimum budget of ${minBudgetStr}, which exceeds ${budgetStr} by ${deficitStr}.`;
    if (costliestServices && costliestServices.length > 0) {
      const topCost = costliestServices[0];
      overBudgetMsg += ` ${topCost.category} (${topCost.providerName} at ₹${topCost.startingPrice.toLocaleString('en-IN')}) is the largest cost driver.`;
    }
    overBudgetMsg += ` Consider increasing your total budget or adjusting required services.`;

    if (missingCategories.length > 0) {
      const missingStr = formatCategoryList(missingCategories);
      overBudgetMsg += ` Additionally, I couldn't find a matching ${missingStr.toLowerCase()} provider${missingCategories.length > 1 ? 's' : ''}${locStr}.`;
    }
    return overBudgetMsg;
  }

  // Multi-category complete plan within budget
  const foundStr = formatCategoryList(foundCategories);
  let msg = `I found providers for ${foundStr}${locStr} that fit your event requirements.`;

  // Include plan summary details with Total Plan Cost and Remaining Budget
  if (selectedPlan && selectedPlan.length > 0 && totalPlanCost !== null && totalPlanCost > 0) {
    msg += `\n\nEvent Plan Summary:\n`;
    for (const item of selectedPlan) {
      msg += `• ${item.category}: ${item.providerName} — ${item.serviceName} (₹${item.startingPrice.toLocaleString('en-IN')})\n`;
    }
    msg += `\nTotal Plan Cost: ₹${totalPlanCost.toLocaleString('en-IN')}\n`;
    if (totalBudget !== null && totalBudget > 0) {
      msg += `Remaining Budget: ₹${(remainingBudget || 0).toLocaleString('en-IN')}\n`;
      msg += `Status: Within budget (Total: ₹${totalPlanCost.toLocaleString('en-IN')} / ₹${totalBudget.toLocaleString('en-IN')})`;
    }
  }

  if (missingCategories.length > 0) {
    const missingStr = formatCategoryList(missingCategories);
    msg += `\n\nHowever, I couldn't find a matching ${missingStr.toLowerCase()} provider${missingCategories.length > 1 ? 's' : ''}${locStr}.`;
  }

  return msg;
};

/**
 * Normalizes all 8 customer event blueprint fields into a clean, uniform AI event context object:
 * 1. eventType
 * 2. eventDate
 * 3. location
 * 4. guestCount
 * 5. budget
 * 6. requiredServices
 * 7. preferences
 * 8. additionalNotes
 */
export const buildAiEventContext = (event) => {
  if (!event) return null;

  // 1. requiredServices extraction
  let requiredServices = [];
  if (Array.isArray(event.requiredServices) && event.requiredServices.length > 0) {
    requiredServices = event.requiredServices;
  } else if (Array.isArray(event.preferences?.requiredServices) && event.preferences.requiredServices.length > 0) {
    requiredServices = event.preferences.requiredServices;
  } else if (Array.isArray(event.preferences?.services) && event.preferences.services.length > 0) {
    requiredServices = event.preferences.services;
  } else if (Array.isArray(event.services) && typeof event.services[0] === 'string') {
    requiredServices = event.services;
  }

  // 2. preferences extraction
  let preferences = [];
  if (Array.isArray(event.preferences)) {
    preferences = event.preferences;
  } else if (Array.isArray(event.preferences?.preferences)) {
    preferences = event.preferences.preferences;
  } else if (Array.isArray(event.preferences?.stylePreferences)) {
    preferences = event.preferences.stylePreferences;
  } else if (typeof event.preferences === 'object' && event.preferences !== null) {
    // If it's an object with other keys, format or preserve
    const styleList = event.preferences.style || event.preferences.theme || event.preferences.vibe;
    if (Array.isArray(styleList)) {
      preferences = styleList;
    } else if (typeof styleList === 'string') {
      preferences = [styleList];
    } else {
      preferences = event.preferences;
    }
  }

  return {
    eventType: event.eventType || event.event_type || 'Wedding',
    eventDate: event.eventDate || event.event_date || null,
    location: event.location || event.city || null,
    guestCount: event.guestCount !== undefined ? event.guestCount : (event.estimated_guests || null),
    budget: event.budget !== undefined ? parseFloat(event.budget) : (parseFloat(event.total_budget) || null),
    requiredServices,
    preferences,
    additionalNotes: event.additionalNotes || event.additional_notes || '',
    services: event.services || [],
  };
};

/**
 * Builds the comprehensive AI context and system prompt incorporating ALL 8 event fields
 */
export const buildAiPromptContext = (aiEventContext, realRecommendations = []) => {
  let prompt = `You are Eva-Ai, an intelligent, personal event-planning assistant for luxury weddings and celebrations.
Your goal is to assist the customer with their specific event plan, grounded strictly in their actual event details and real database providers.

CRITICAL INSTRUCTIONS:
1. Never hallucinate or invent provider names, ratings, starting prices, packages, or services.
2. Ground all recommendations strictly in the verified database providers listed below.
3. Tailor your response directly to the customer's actual event blueprint details.
4. If no matching provider is found, politely state so and suggest broadening criteria.\n`;

  if (aiEventContext) {
    prompt += `\n--- CUSTOMER EVENT BLUEPRINT (ACTUAL EVENT CONTEXT) ---
- Event Type: ${aiEventContext.eventType}
- Event Date: ${aiEventContext.eventDate || 'Not set'}
- Location: ${aiEventContext.location || 'Not set'}
- Guest Count: ${aiEventContext.guestCount ? aiEventContext.guestCount + ' guests' : 'Not set'}
- Budget: ₹${(Number(aiEventContext.budget) || 0).toLocaleString('en-IN')}
- Required Services: ${Array.isArray(aiEventContext.requiredServices) && aiEventContext.requiredServices.length > 0 ? aiEventContext.requiredServices.join(', ') : 'None specified'}
- Preferences: ${Array.isArray(aiEventContext.preferences) ? aiEventContext.preferences.join(', ') : (typeof aiEventContext.preferences === 'object' ? JSON.stringify(aiEventContext.preferences) : aiEventContext.preferences || 'None')}
- Additional Notes: ${aiEventContext.additionalNotes || 'None'}
--- END CUSTOMER EVENT BLUEPRINT ---\n`;
  }

  if (realRecommendations && realRecommendations.length > 0) {
    prompt += `\n--- VERIFIED DATABASE PROVIDERS MATCHING QUERY ---
${JSON.stringify(realRecommendations, null, 2)}
--- END VERIFIED DATABASE PROVIDERS ---\n`;
  }

  return prompt;
};

/**
 * Extracts entities and user intent from natural language query
 */
export const extractEntitiesAndIntent = (message, eventContext = null) => {
  const text = (message || '').trim().toLowerCase();

  // 1. Detect Categories (supports multiple categories)
  const categories = [];
  for (const { category: catName, regex } of CATEGORY_PATTERNS) {
    if (regex.test(text)) {
      if (!categories.includes(catName)) {
        categories.push(catName);
      }
    }
  }

  // 2. Detect Location
  let location = null;
  for (const loc of KNOWN_LOCATIONS) {
    if (new RegExp(`\\b${loc}\\b`, 'i').test(text)) {
      location = loc.charAt(0).toUpperCase() + loc.slice(1);
      break;
    }
  }

  // If not found in known list, try preposition match: "in <City>" or "near <City>"
  if (!location) {
    const prepMatch = text.match(/\b(?:in|near|around|at)\s+([a-zA-Z\s]+?)(?=\s+(?:under|below|for|with|within|\d|$|\.|\,))/i);
    if (prepMatch && prepMatch[1]) {
      const candidate = prepMatch[1].trim();
      if (candidate.length > 2 && !['my', 'the', 'a', 'an', 'our'].includes(candidate.toLowerCase())) {
        location = candidate.charAt(0).toUpperCase() + candidate.slice(1);
      }
    }
  }

  // 3. Detect Budget / Price
  let maxPrice = null;
  const priceMatch = text.match(/(?:under|below|less\s+than|budget(?:\s*(?:of|is|=|\:))?|max(?:\s+price)?|within|upto)\s*(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|lakh|lakhs|lac|lacs)?/i);
  if (priceMatch) {
    let num = parseFloat(priceMatch[1].replace(/,/g, ''));
    const multiplier = (priceMatch[2] || '').toLowerCase();
    if (multiplier === 'k' || multiplier === 'thousand') {
      num *= 1000;
    } else if (multiplier.startsWith('lakh') || multiplier.startsWith('lac')) {
      num *= 100000;
    }
    if (!isNaN(num) && num > 0) {
      maxPrice = num;
    }
  }

  // 4. Detect Guest Count
  let guestCount = null;
  const guestMatch = text.match(/(\d+)\s*(?:guests?|people|pax|persons?)/i);
  if (guestMatch) {
    guestCount = parseInt(guestMatch[1], 10);
  }

  // 5. Detect Experience
  let minExperience = null;
  const expMatch = text.match(/(?:at\s+least|minimum)?\s*(\d+)\s*(?:\+|plus)?\s*years?(?:\s+of)?\s*(?:experience)?/i);
  if (expMatch && !text.includes('under') && !text.includes('below')) {
    minExperience = parseInt(expMatch[1], 10);
  }

  // 6. Detect Limit / Top N
  let limit = 10;
  const limitMatch = text.match(/\b(?:suggest|show|find|give\s+me|top|recommend)\s*(\d+)\b/i);
  if (limitMatch) {
    limit = Math.min(20, Math.max(1, parseInt(limitMatch[1], 10)));
  }

  // 7. Detect Intent
  let intent = 'provider_search';

  const hasSearchVerb = /\b(suggest|recommend|find|show|give|search|browse|need|match|build|plan|generate|create)\b/i.test(text);
  const isBudgetInquiry = (
    /\b(what(?:'s|\s+is)\s+my\s+budget|how\s+much\s+(?:budget|is\s+left)|budget\s+status|remaining\s+budget|how\s+much\s+have\s+i\s+spent)\b/i.test(text) ||
    (/\b(budget|cost|price|spend|money|expense|balance|afford)\b/i.test(text) &&
      categories.length === 0 &&
      !hasSearchVerb &&
      !location &&
      maxPrice === null &&
      !text.includes('under') && !text.includes('below') && !text.includes('within'))
  );

  const isServicesQuery = /\b(what\s+services|services\s+do\s+i\s+need|which\s+services|what\s+do\s+i\s+need)\b/i.test(text);
  const isDateQuery = /\b(when\s+is\s+my|date\s+of\s+my|what\s+date|timeline|schedule)\b/i.test(text) && categories.length === 0;
  const isPreferencesQuery = /\b(what\s+are\s+my\s+preferences|show\s+my\s+preferences|what\s+style|my\s+notes)\b/i.test(text) && categories.length === 0;
  const isGreeting = /^(hi|hello|hey|greetings|good\s+morning|good\s+evening|good\s+afternoon)\b/i.test(text) && text.split(' ').length <= 4;

  if (isGreeting) {
    intent = 'greeting';
  } else if (isBudgetInquiry) {
    intent = 'budget_inquiry';
  } else if (isServicesQuery) {
    intent = 'services_inquiry';
  } else if (isDateQuery) {
    intent = 'date_inquiry';
  } else if (isPreferencesQuery) {
    intent = 'preferences_inquiry';
  }

  // 8. Event Context Fallback
  if (eventContext) {
    if (!location && eventContext.location) {
      location = eventContext.location;
    }
    if (!guestCount && eventContext.guestCount) {
      guestCount = eventContext.guestCount;
    }
    if (maxPrice === null && eventContext.budget) {
      maxPrice = eventContext.budget;
    }
  }

  return {
    intent,
    category: categories.length === 1 ? categories[0] : (categories.length > 1 ? categories : null),
    categories,
    location,
    maxPrice,
    guestCount,
    minExperience,
    limit,
  };
};

/**
 * Optional External AI Provider Call (Google Gemini / OpenAI)
 * Backend-only; uses process.env.AI_API_KEY or GEMINI_API_KEY if configured.
 * Never throws fatal errors; gracefully falls back to deterministic grounding.
 */
export const queryOptionalLLM = async (systemPrompt, userPrompt) => {
  const apiKey = process.env.AI_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nUser Message: ${userPrompt}` }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 256,
        },
      }),
    });

    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const candidateText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      return candidateText ? candidateText.trim() : null;
    }
  } catch (llmErr) {
    // LLM call failed or timed out; silent fallback to grounded response generator
  }

  return null;
};

/**
 * Main chat handler function
 * 1. Enforces customer-only access (checked in controller/middleware)
 * 2. Enforces event ownership
 * 3. Builds unified event context across all 8 fields
 * 4. Extracts intent and entities
 * 5. Queries REAL DB providers via recommendationService
 * 6. Returns structured JSON response with zero hallucinated data
 */
export const processChat = async ({
  message,
  eventId,
  conversationId,
  user,
}) => {
  if (!message || typeof message !== 'string' || !message.trim()) {
    const error = new Error('Message is required and must be a non-empty string');
    error.statusCode = 400;
    throw error;
  }

  let rawEvent = null;

  // 1. If eventId is supplied:
  // - verify that the event exists
  // - verify that the event belongs to the authenticated customer
  // - never expose another customer's event information
  if (eventId) {
    rawEvent = await eventService.getEventById(eventId, user);
  }

  // Build unified AI event context with ALL 8 fields
  const aiContext = buildAiEventContext(rawEvent);

  // 2. Understand user intent and determine required filters
  const parsed = extractEntitiesAndIntent(message, aiContext);

  // 3. Handle non-provider queries using the complete event blueprint
  if (parsed.intent === 'greeting') {
    let greetingText = "Hi! I'm Eva 👋\n\nYour personal event planning assistant. I can help you discover verified service providers, manage your budget, and plan your celebration.";
    if (aiContext) {
      greetingText += ` I see you're planning a ${aiContext.eventType || 'celebration'} in ${aiContext.location || 'Kerala'}${aiContext.guestCount ? ` for ${aiContext.guestCount} guests` : ''}. How can I help you today?`;
    }
    return {
      success: true,
      message: greetingText,
      recommendations: [],
      actions: [],
      eventContext: aiContext || undefined,
    };
  }

  if (parsed.intent === 'date_inquiry' && aiContext) {
    let dateReply = '';
    if (aiContext.eventDate) {
      dateReply = `Your target celebration date for your ${aiContext.eventType} in ${aiContext.location || 'Kerala'} is set for ${aiContext.eventDate}. Verified providers often book out months in advance, so reserving your core services early is recommended.`;
    } else {
      dateReply = "You haven't set a specific date yet in your event blueprint. You can configure your target date anytime in your event plan.";
    }
    return {
      success: true,
      message: dateReply,
      recommendations: [],
      actions: [],
      eventContext: aiContext || undefined,
    };
  }

  if (parsed.intent === 'preferences_inquiry' && aiContext) {
    const prefList = Array.isArray(aiContext.preferences) && aiContext.preferences.length > 0
      ? aiContext.preferences.join(', ')
      : (typeof aiContext.preferences === 'object' && Object.keys(aiContext.preferences).length > 0
        ? JSON.stringify(aiContext.preferences)
        : 'none recorded yet');

    const notes = aiContext.additionalNotes || 'No additional notes provided.';
    return {
      success: true,
      message: `Your event preferences for your ${aiContext.eventType} are: ${prefList}. Additional notes: "${notes}". I will ensure recommended providers align with these preferences!`,
      recommendations: [],
      actions: [],
      eventContext: aiContext || undefined,
    };
  }

  if (parsed.intent === 'budget_inquiry' && aiContext) {
    const budgetNum = Number(aiContext.budget) || 0;
    const services = aiContext.services || [];
    const estimatedTotal = services.reduce((sum, s) => sum + (Number(s.price || s.startingPrice) || 0), 0);
    const remaining = budgetNum - estimatedTotal;

    const formattedBudget = `₹${budgetNum.toLocaleString('en-IN')}`;
    const formattedSpent = `₹${estimatedTotal.toLocaleString('en-IN')}`;
    const formattedRemaining = `₹${remaining.toLocaleString('en-IN')}`;

    let reply = `Your current event budget is ${formattedBudget}.`;
    if (services.length === 0) {
      reply += " You haven't added any services to your event plan yet. As you select photographers, venues, and caterers, I will track your budget dynamically!";
    } else {
      reply += ` You have selected ${services.length} service(s) totaling ${formattedSpent}, leaving approximately ${formattedRemaining} in your budget.`;
      if (remaining < 0) {
        reply += ' Note: Your estimated services currently exceed your initial budget target.';
      }
    }

    return {
      success: true,
      message: reply,
      recommendations: [],
      actions: [],
      eventContext: aiContext || undefined,
    };
  }

  if (parsed.intent === 'services_inquiry') {
    const eventType = aiContext?.eventType || 'event';
    const reqList = aiContext?.requiredServices?.length > 0
      ? aiContext.requiredServices.join(', ')
      : 'Venue, Photography, Catering, Decoration, Makeup, and Entertainment';

    return {
      success: true,
      message: `For your ${eventType}, your required services include ${reqList}. You can ask me to find verified professionals for any of these in ${aiContext?.location || 'your location'}!`,
      recommendations: [],
      actions: [],
      eventContext: aiContext || undefined,
    };
  }

  // 4. Determine target categories for provider recommendation search
  let targetCategories = [];
  if (parsed.categories && parsed.categories.length > 0) {
    targetCategories = parsed.categories;
  } else {
    // If user says "Suggest services within my budget" or provides location/budget without categories:
    // Determine categories using the saved event blueprint (or default core categories)
    targetCategories = resolveCategoriesFromEvent(aiContext);
  }

  // 5. Query real database providers via recommendation service
  // Each category is searched independently against real Supabase data.
  const recResult = await recommendationService.getMultiCategoryRecommendations({
    categories: targetCategories,
    location: parsed.location,
    maxPrice: parsed.maxPrice,
    minExperience: parsed.minExperience,
    guestCount: parsed.guestCount,
    limitPerCategory: parsed.limit && targetCategories.length === 1 ? parsed.limit : 3,
    user,
    eventId: eventId || undefined,
  });

  const realRecommendations = recResult.recommendations || [];
  const foundCategories = recResult.foundCategories || [];
  const missingCategories = recResult.missingCategories || [];

  // 6. Build AI Context / System Prompt with ALL 8 fields and real DB results
  const systemPrompt = buildAiPromptContext(aiContext, realRecommendations);

  // 7. Build Grounded Message and Action items
  let responseMessage = '';
  const actions = [];

  if (realRecommendations.length > 0) {
    responseMessage = buildRecommendationMessage({
      foundCategories,
      missingCategories,
      totalFound: realRecommendations.length,
      location: parsed.location,
      singleCategoryLabel: targetCategories.length === 1 ? targetCategories[0] : null,
      selectedPlan: recResult.selectedPlan || realRecommendations,
      totalPlanCost: recResult.totalPlanCost,
      remainingBudget: recResult.remainingBudget,
      totalBudget: recResult.totalBudget,
      isWithinBudget: recResult.isWithinBudget,
      budgetDeficit: recResult.budgetDeficit,
      costliestServices: recResult.costliestServices,
    });

    // Attempt optional conversational polish if LLM key configured
    const llmPolish = await queryOptionalLLM(systemPrompt, message);
    if (llmPolish && missingCategories.length === 0) {
      responseMessage = llmPolish;
    }

    // Build action items for each recommended provider
    for (const rec of realRecommendations) {
      actions.push({
        type: 'VIEW_PROVIDER',
        providerId: rec.providerId,
      });
    }
  } else {
    // STRICT ZERO-HALLUCINATION REQUIREMENT:
    // If no matching provider exists in DB, NEVER invent one.
    if (missingCategories.length > 0) {
      const missingStr = formatCategoryList(missingCategories);
      const locStr = parsed.location ? ` in ${parsed.location}` : '';
      responseMessage = `I couldn't find a provider matching all of those requirements for ${missingStr}${locStr}. Would you like me to broaden the location or budget?`;
    } else {
      responseMessage = "I couldn't find a provider matching all of those requirements. Would you like me to broaden the location or budget?";
    }
  }

  return {
    success: true,
    message: responseMessage,
    recommendations: realRecommendations,
    actions,
    eventContext: aiContext || undefined,
  };
};

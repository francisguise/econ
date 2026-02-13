import { MinisterDefinition } from '@/lib/types/cabinet'

export const ministerDefinitions: Record<string, MinisterDefinition> = {
  warrior: {
    emoji: '⚔️',
    defaultName: 'General',
    title: 'Trade & Competition Minister',
    description: 'Handles tariffs, trade wars, currency defense, and strategic reserves',
    color: '#FF0000',
    actionTypes: ['tariff_management', 'strategic_reserves', 'currency_defense', 'economic_warfare'],
    assignments: [
      { id: 'tariff_management', name: 'Tariff Management', description: 'Maintain and adjust trade tariffs' },
      { id: 'strategic_reserves', name: 'Strategic Reserves', description: 'Build commodity reserves for shock immunity' },
      { id: 'currency_defense', name: 'Currency Defense', description: 'Protect exchange rate from speculation' },
      { id: 'economic_warfare', name: 'Economic Warfare', description: 'Devastating tariffs or competitive devaluation', minFocus: 4 },
    ],
  },
  mage: {
    emoji: '🔮',
    defaultName: 'Archmage',
    title: 'Central Bank Governor',
    description: 'Manages interest rates, QE, inflation control, and financial stability',
    color: '#FF00FF',
    actionTypes: ['interest_rate_control', 'qe_management', 'inflation_targeting', 'financial_stability', 'forward_guidance'],
    assignments: [
      { id: 'interest_rate_control', name: 'Interest Rate Control', description: 'Set interest rates via CBRF or manually' },
      { id: 'qe_management', name: 'QE Management', description: 'Execute quantitative easing or tightening' },
      { id: 'inflation_targeting', name: 'Inflation Targeting', description: 'Focus purely on price stability' },
      { id: 'financial_stability', name: 'Financial Stability', description: 'Monitor and prevent financial crises' },
      { id: 'forward_guidance', name: 'Forward Guidance', description: 'Commit interest rate path for coming quarters', minFocus: 3 },
    ],
  },
  engineer: {
    emoji: '🔧',
    defaultName: 'Chief Engineer',
    title: 'Development Minister',
    description: 'Oversees infrastructure, education, healthcare, and innovation',
    color: '#FFFF00',
    actionTypes: ['infrastructure', 'education', 'healthcare', 'productivity_innovation', 'green_transition'],
    assignments: [
      { id: 'infrastructure', name: 'Infrastructure Investment', description: 'Build and maintain national infrastructure' },
      { id: 'education', name: 'Education System', description: 'Oversee education spending and outcomes' },
      { id: 'healthcare', name: 'Healthcare System', description: 'Manage healthcare and public health' },
      { id: 'productivity_innovation', name: 'Productivity & Innovation', description: 'Drive technological advancement' },
      { id: 'green_transition', name: 'Green Transition', description: 'Transition to sustainable economy', minFocus: 3 },
    ],
  },
  diplomat: {
    emoji: '🤝',
    defaultName: 'Ambassador',
    title: 'Foreign Minister',
    description: 'Conducts trade negotiations, immigration policy, and international cooperation',
    color: '#00FFFF',
    actionTypes: ['trade_negotiations', 'immigration_policy', 'international_aid', 'crisis_management', 'global_initiatives'],
    assignments: [
      { id: 'trade_negotiations', name: 'Trade Negotiations', description: 'Manage trade agreements and relations' },
      { id: 'immigration_policy', name: 'Immigration Policy', description: 'Manage immigration flows and integration' },
      { id: 'international_aid', name: 'International Aid', description: 'Offer aid to build alliances', minFocus: 3 },
      { id: 'crisis_management', name: 'Crisis Management', description: 'Handle trade disputes and conflicts' },
      { id: 'global_initiatives', name: 'Global Initiatives', description: 'Currency unions or coordinated stimulus', minFocus: 4 },
    ],
  },
}

import type { RiskLevel } from '@/types/risk';

export const RISK_CONFIG: Record<RiskLevel, {
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  icon: string;
  label: string;
}> = {
  low: {
    color: 'text-agri-leaf-600',
    bgColor: 'bg-agri-leaf-100',
    borderColor: 'border-agri-leaf-300',
    textColor: 'text-agri-leaf-700',
    icon: '🟢',
    label: 'Low',
  },
  medium: {
    color: 'text-agri-gold-600',
    bgColor: 'bg-agri-gold-100',
    borderColor: 'border-agri-gold-300',
    textColor: 'text-agri-gold-700',
    icon: '🟡',
    label: 'Medium',
  },
  high: {
    color: 'text-risk-amber-500',
    bgColor: 'bg-risk-amber-100',
    borderColor: 'border-risk-amber-500',
    textColor: 'text-risk-amber-600',
    icon: '🟠',
    label: 'High',
  },
  critical: {
    color: 'text-risk-red-500',
    bgColor: 'bg-risk-red-100',
    borderColor: 'border-risk-red-500',
    textColor: 'text-risk-red-600',
    icon: '🔴',
    label: 'Critical',
  },
};

export function getRiskConfig(level: RiskLevel) {
  return RISK_CONFIG[level];
}

import { CabinetAssignment, MinisterRole, TOTAL_FOCUS_POINTS, MAX_FOCUS_PER_MINISTER } from '@/lib/types/cabinet'
import { PolicyChoices } from '@/lib/types/game'
import { ministerDefinitions } from '@/lib/assets/minister-roles'

export interface ValidationError {
  field: string
  message: string
}

export function validateCabinetAssignment(assignment: CabinetAssignment): ValidationError[] {
  const errors: ValidationError[] = []
  const roles: MinisterRole[] = ['warrior', 'mage', 'engineer', 'diplomat']

  let totalFocus = 0
  for (const role of roles) {
    const { focus, assignment: assignmentId } = assignment[role]

    if (focus < 0 || focus > MAX_FOCUS_PER_MINISTER) {
      errors.push({ field: role, message: `Focus must be 0-${MAX_FOCUS_PER_MINISTER}` })
    }

    totalFocus += focus

    // Validate assignment exists
    const def = ministerDefinitions[role]
    const validAssignment = def.assignments.find(a => a.id === assignmentId)
    if (!validAssignment) {
      errors.push({ field: role, message: `Invalid assignment: ${assignmentId}` })
    } else if (validAssignment.minFocus && focus < validAssignment.minFocus) {
      errors.push({ field: role, message: `${validAssignment.name} requires focus ${validAssignment.minFocus}+` })
    }
  }

  if (totalFocus !== TOTAL_FOCUS_POINTS) {
    errors.push({ field: 'total', message: `Must use exactly ${TOTAL_FOCUS_POINTS} focus points (using ${totalFocus})` })
  }

  return errors
}

export function validatePolicies(policies: PolicyChoices): ValidationError[] {
  const errors: ValidationError[] = []

  if (policies.interestRate < -1 || policies.interestRate > 20) {
    errors.push({ field: 'interestRate', message: 'Interest rate must be -1% to 20%' })
  }

  if (policies.taxRate < 15 || policies.taxRate > 45) {
    errors.push({ field: 'taxRate', message: 'Tax rate must be 15% to 45%' })
  }

  const totalGovSpending = policies.govSpendingEducation + policies.govSpendingHealthcare + policies.govSpendingInfrastructure
  if (totalGovSpending > 30) {
    errors.push({ field: 'govSpending', message: 'Total government spending cannot exceed 30% of GDP' })
  }

  if (policies.govSpendingEducation < 0 || policies.govSpendingEducation > 10) {
    errors.push({ field: 'govSpendingEducation', message: 'Education spending must be 0-10% of GDP' })
  }

  if (policies.govSpendingHealthcare < 0 || policies.govSpendingHealthcare > 15) {
    errors.push({ field: 'govSpendingHealthcare', message: 'Healthcare spending must be 0-15% of GDP' })
  }

  if (policies.govSpendingInfrastructure < 0 || policies.govSpendingInfrastructure > 10) {
    errors.push({ field: 'govSpendingInfrastructure', message: 'Infrastructure spending must be 0-10% of GDP' })
  }

  if (policies.tariffRate < 0 || policies.tariffRate > 25) {
    errors.push({ field: 'tariffRate', message: 'Tariff rate must be 0% to 25%' })
  }

  // Validate cabinet assignment
  errors.push(...validateCabinetAssignment(policies.cabinetAssignment))

  return errors
}

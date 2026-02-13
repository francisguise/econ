'use client'

import { Panel } from '@/components/tui/Panel'
import { PolicyChoices } from '@/lib/types/game'

interface PolicyPanelProps {
  policies: PolicyChoices
  onChange: (policies: PolicyChoices) => void
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  unit: string
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-terminal-cyan w-32 text-xs">{label}:</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="flex-1 accent-terminal-green h-1"
      />
      <span className="text-terminal-yellow w-16 text-right text-xs">{value}{unit}</span>
    </div>
  )
}

export function PolicyPanel({ policies, onChange }: PolicyPanelProps) {
  function update(partial: Partial<PolicyChoices>) {
    onChange({ ...policies, ...partial })
  }

  return (
    <Panel title="POLICY CONTROLS">
      <div className="font-mono text-xs space-y-3">
        {/* Interest Rate */}
        <div>
          <Slider
            label="Interest Rate"
            value={policies.interestRate}
            min={-1}
            max={20}
            step={0.5}
            unit="%"
            onChange={v => update({ interestRate: v })}
          />
          <div className="flex items-center gap-2 mt-1 ml-32">
            <label className="flex items-center gap-1 text-terminal-bright-black">
              <input
                type="checkbox"
                checked={policies.cbrfAutopilot}
                onChange={e => update({ cbrfAutopilot: e.target.checked })}
                className="accent-terminal-green"
              />
              CBRF Autopilot
            </label>
          </div>
        </div>

        {/* Government Spending */}
        <div className="border-t border-terminal-border pt-2">
          <div className="text-terminal-cyan mb-1">Government Spending:</div>
          <Slider
            label="Education"
            value={policies.govSpendingEducation}
            min={0}
            max={10}
            step={0.5}
            unit="% GDP"
            onChange={v => update({ govSpendingEducation: v })}
          />
          <Slider
            label="Healthcare"
            value={policies.govSpendingHealthcare}
            min={0}
            max={15}
            step={0.5}
            unit="% GDP"
            onChange={v => update({ govSpendingHealthcare: v })}
          />
          <Slider
            label="Infrastructure"
            value={policies.govSpendingInfrastructure}
            min={0}
            max={10}
            step={0.5}
            unit="% GDP"
            onChange={v => update({ govSpendingInfrastructure: v })}
          />
        </div>

        {/* Tax Rate */}
        <Slider
          label="Tax Rate"
          value={policies.taxRate}
          min={15}
          max={45}
          step={1}
          unit="%"
          onChange={v => update({ taxRate: v })}
        />

        {/* Immigration */}
        <div className="flex items-center gap-2">
          <span className="text-terminal-cyan w-32 text-xs">Immigration:</span>
          <select
            value={policies.immigrationPolicy}
            onChange={e => update({ immigrationPolicy: e.target.value as PolicyChoices['immigrationPolicy'] })}
            className="bg-terminal-background border border-terminal-border text-terminal-foreground px-2 py-1 text-xs"
          >
            <option value="restrictive">Restrictive</option>
            <option value="moderate">Moderate</option>
            <option value="open">Open</option>
          </select>
        </div>

        {/* QE Stance */}
        <div className="flex items-center gap-2">
          <span className="text-terminal-cyan w-32 text-xs">QE Stance:</span>
          <div className="flex gap-1">
            {(['tightening', 'neutral', 'easing'] as const).map(stance => (
              <button
                key={stance}
                onClick={() => update({ qeStance: stance })}
                className={`px-2 py-1 text-xs border ${
                  policies.qeStance === stance
                    ? 'border-terminal-green text-terminal-green'
                    : 'border-terminal-border text-terminal-bright-black'
                }`}
              >
                {stance}
              </button>
            ))}
          </div>
        </div>

        {/* Capital Controls */}
        <div className="flex items-center gap-2">
          <span className="text-terminal-cyan w-32 text-xs">Capital Controls:</span>
          <select
            value={policies.capitalControls}
            onChange={e => update({ capitalControls: e.target.value as PolicyChoices['capitalControls'] })}
            className="bg-terminal-background border border-terminal-border text-terminal-foreground px-2 py-1 text-xs"
          >
            <option value="open">Open</option>
            <option value="moderate">Moderate</option>
            <option value="strict">Strict</option>
          </select>
        </div>
      </div>
    </Panel>
  )
}

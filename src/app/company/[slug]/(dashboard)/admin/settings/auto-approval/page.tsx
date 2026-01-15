"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import {
    type AutoApprovalPolicy,
    type AutoApprovalRule,
} from "@/lib/types/auto-approval-policy";
import { getAutoApprovalPolicy, updateAutoApprovalPolicy } from "./actions";

export default function AutoApprovalSettings() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [policy, setPolicy] = useState<AutoApprovalPolicy | null>(null);
    const [companyCurrency, setCompanyCurrency] = useState("USD");
    const [companyCountry, setCompanyCountry] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    async function loadPolicy() {
        setLoading(true);
        const result = await getAutoApprovalPolicy();

        if ("error" in result) {
            setError(result.error);
        } else {
            setPolicy(result.policy);
            setCompanyCurrency(result.companyCurrency);
            setCompanyCountry(result.companyCountry ?? null);
        }

        setLoading(false);
    }

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        loadPolicy();
    }, []);

    async function handleSave() {
        if (!policy) return;

        setSaving(true);
        setError(null);
        setSuccess(null);

        const result = await updateAutoApprovalPolicy(policy);

        if ("error" in result) {
            setError(result.error);
        } else {
            setSuccess("Auto-approval policy updated successfully!");
            setTimeout(() => setSuccess(null), 3000);
        }

        setSaving(false);
    }

    function togglePolicy() {
        if (!policy) return;
        setPolicy({ ...policy, enabled: !policy.enabled });
    }

    function addRule(type: "BUDGET_THRESHOLD" | "DOMESTIC_TRIP" | "COMBINED") {
        if (!policy) return;

        const newRule: AutoApprovalRule = {
            id: `rule-${Date.now()}`,
            name: type === "BUDGET_THRESHOLD"
                ? "Budget Threshold Rule"
                : type === "DOMESTIC_TRIP"
                    ? "Domestic Trip Rule"
                    : "Combined Rule",
            enabled: true,
            type,
            config: type === "BUDGET_THRESHOLD"
                ? { maxAmount: 50000, currencyCode: companyCurrency }
                : type === "DOMESTIC_TRIP"
                    ? { enabled: true }
                    : {
                        budget: { maxAmount: 50000, currencyCode: companyCurrency },
                        requireDomestic: true,
                    },
        };

        setPolicy({
            ...policy,
            rules: [...policy.rules, newRule],
        });
    }

    function updateRule(ruleId: string, updates: Partial<AutoApprovalRule>) {
        if (!policy) return;

        setPolicy({
            ...policy,
            rules: policy.rules.map((rule) =>
                rule.id === ruleId ? { ...rule, ...updates } : rule
            ),
        });
    }

    function deleteRule(ruleId: string) {
        if (!policy) return;

        setPolicy({
            ...policy,
            rules: policy.rules.filter((rule) => rule.id !== ruleId),
        });
    }

    if (loading) {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <div className="text-center py-12 text-gray-500">Loading policy settings...</div>
            </div>
        );
    }

    if (!policy) {
        return (
            <div className="max-w-4xl mx-auto p-8">
                <div className="text-center py-12 text-red-500">Failed to load policy settings</div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-8">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Auto-Approval Policies</h1>
                    <p className="text-gray-600">
                        Configure rules to automatically approve trip requests that meet specific criteria
                    </p>
                </div>
                <button
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl text-gray-700 font-medium transition-all"
                >
                    ← Back
                </button>
            </div>

            {/* Alerts */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700">
                    {error}
                </div>
            )}
            {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700">
                    {success}
                </div>
            )}

            {/* Enable Toggle */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 mb-1">Enable Auto-Approval</h2>
                        <p className="text-sm text-gray-600">
                            When enabled, requests matching the configured rules will be automatically approved
                        </p>
                    </div>
                    <label className="relative inline-block w-14 h-8 flex-shrink-0">
                        <input
                            type="checkbox"
                            checked={policy.enabled}
                            onChange={togglePolicy}
                            className="sr-only peer"
                        />
                        <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-6 peer-checked:after:border-white after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                </div>
            </div>

            {/* Rules Section */}
            {policy.enabled && (
                <>
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-1">Approval Rules</h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Add rules to define which requests should be auto-approved
                        </p>

                        {policy.rules.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-xl text-gray-500">
                                No rules configured. Add a rule to get started.
                            </div>
                        )}

                        {policy.rules.map((rule) => (
                            <RuleCard
                                key={rule.id}
                                rule={rule}
                                companyCurrency={companyCurrency}
                                companyCountry={companyCountry}
                                onUpdate={(updates) => updateRule(rule.id, updates)}
                                onDelete={() => deleteRule(rule.id)}
                            />
                        ))}

                        <div className="flex gap-3 mt-6 flex-wrap">
                            <button
                                onClick={() => addRule("BUDGET_THRESHOLD")}
                                className="px-4 py-2 bg-white border-2 border-dashed border-gray-300 hover:border-indigo-500 hover:text-indigo-600 rounded-xl text-gray-700 font-medium transition-all"
                            >
                                + Budget Threshold
                            </button>
                            <button
                                onClick={() => addRule("DOMESTIC_TRIP")}
                                disabled={!companyCountry}
                                className="px-4 py-2 bg-white border-2 border-dashed border-gray-300 hover:border-indigo-500 hover:text-indigo-600 rounded-xl text-gray-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title={!companyCountry ? "Set company country in settings first" : ""}
                            >
                                + Domestic Trip
                            </button>
                            <button
                                onClick={() => addRule("COMBINED")}
                                disabled={!companyCountry}
                                className="px-4 py-2 bg-white border-2 border-dashed border-gray-300 hover:border-indigo-500 hover:text-indigo-600 rounded-xl text-gray-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                title={!companyCountry ? "Set company country in settings first" : ""}
                            >
                                + Combined Rule
                            </button>
                        </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                        >
                            {saving ? "Saving..." : "Save Policy"}
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

interface RuleCardProps {
    rule: AutoApprovalRule;
    companyCurrency: string;
    companyCountry: string | null;
    onUpdate: (updates: Partial<AutoApprovalRule>) => void;
    onDelete: () => void;
}

function RuleCard({ rule, companyCurrency, companyCountry, onUpdate, onDelete }: RuleCardProps) {
    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 mb-4 hover:shadow-md transition-all">
            {/* Header */}
            <div className="flex justify-between items-center mb-3">
                <input
                    type="text"
                    value={rule.name}
                    onChange={(e) => onUpdate({ name: e.target.value })}
                    className="flex-1 text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:border-b-2 focus:border-indigo-600 pb-1"
                    placeholder="Rule name"
                />
                <div className="flex items-center gap-3">
                    <label className="relative inline-block w-10 h-6">
                        <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={(e) => onUpdate({ enabled: e.target.checked })}
                            className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-4 peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                    <button
                        onClick={onDelete}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete rule"
                    >
                        <Trash2 size={18} />
                    </button>
                </div>
            </div>

            {/* Type Badge */}
            <div className="text-xs font-bold text-indigo-600 uppercase tracking-wide mb-4">
                {rule.type === "BUDGET_THRESHOLD" && "💰 Budget Threshold"}
                {rule.type === "DOMESTIC_TRIP" && "🏠 Domestic Trip"}
                {rule.type === "COMBINED" && "🔗 Combined Rule"}
            </div>

            {/* Configuration */}
            {rule.type === "BUDGET_THRESHOLD" && (
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Budget
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={(rule.config as { maxAmount: number }).maxAmount}
                            onChange={(e) =>
                                onUpdate({
                                    config: {
                                        maxAmount: parseFloat(e.target.value) || 0,
                                        currencyCode: companyCurrency,
                                    },
                                })
                            }
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            min="0"
                            step="1000"
                        />
                        <span className="px-3 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg min-w-[60px] text-center">
                            {companyCurrency}
                        </span>
                    </div>
                </div>
            )}

            {rule.type === "DOMESTIC_TRIP" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-gray-700">
                    Auto-approves trips within {companyCountry || "your country"}
                </div>
            )}

            {rule.type === "COMBINED" && (
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Maximum Budget
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                value={
                                    (rule.config as { budget: { maxAmount: number } }).budget
                                        .maxAmount
                                }
                                onChange={(e) =>
                                    onUpdate({
                                        config: {
                                            budget: {
                                                maxAmount: parseFloat(e.target.value) || 0,
                                                currencyCode: companyCurrency,
                                            },
                                            requireDomestic: (
                                                rule.config as { requireDomestic: boolean }
                                            ).requireDomestic,
                                        },
                                    })
                                }
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                min="0"
                                step="1000"
                            />
                            <span className="px-3 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg min-w-[60px] text-center">
                                {companyCurrency}
                            </span>
                        </div>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={
                                (rule.config as { requireDomestic: boolean }).requireDomestic
                            }
                            onChange={(e) =>
                                onUpdate({
                                    config: {
                                        budget: (rule.config as { budget: { maxAmount: number; currencyCode: string } }).budget,
                                        requireDomestic: e.target.checked,
                                    },
                                })
                            }
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        Must be a domestic trip
                    </label>
                </div>
            )}
        </div>
    );
}

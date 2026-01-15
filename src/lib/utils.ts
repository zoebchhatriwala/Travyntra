
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines multiple class values into a single class string, merging Tailwind classes effectively.
 * 
 * @param {ClassValue[]} inputs - An array of class names, objects, or arrays to be merged.
 * @returns {string} A merged string of CSS classes.
 */
export function cn(...inputs: ClassValue[]): string {
  // Generate the class string using clsx with the provided inputs
  const classList = clsx(inputs);

  // Merge the generated class string using twMerge to resolve Tailwind conflicts
  const mergedClasses = twMerge(classList);

  // Return the final merged class string
  return mergedClasses;
}

/**
 * Formats a status string into a human-readable label.
 * Example: "PENDING_AGENT_ACTION" -> "Pending Agent Action"
 */
export function formatStatus(status: string): string {
  if (!status) return "";
  return status
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Returns the Tailwind CSS classes for a given status.
 * Ensures consistent coloring across the application.
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'COMPLETED':
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 ring-1 ring-rose-100';
    case 'CANCELLED':
      return 'bg-slate-50 text-slate-700 ring-1 ring-slate-100';
    case 'BOOKED':
      return 'bg-violet-50 text-violet-700 ring-1 ring-violet-100';
    case 'PENDING_COMPANY_APPROVAL':
    case 'PENDING_AGENT_ACTION':
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100';
    case 'DRAFT':
      return 'bg-gray-50 text-gray-700 ring-1 ring-gray-100';
    default:
      return 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100';
  }
}

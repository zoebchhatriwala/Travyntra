
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

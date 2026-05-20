/**
 * Lotto Prophet Database Models
 *
 * This module provides TypeScript interfaces and utility functions for working with
 * the normalized lotto database schema. The schema is designed for efficient storage
 * and querying of lotto draw data.
 *
 * Database Structure:
 * - days: Date information with weekday data
 * - draws: Draw events linked to specific days
 * - number_sets: Groups numbers by type (N=main, M=mega)
 * - numbers: Individual numbers with position and value
 * - v_draws_flat: View providing easy access to complete draw data
 *
 * API Usage:
 * - GET /api/draws: Returns array of DrawFlat objects
 * - POST /api/draws: Accepts CreateDrawRequest objects
 */

// Re-export all database schema types
export * from '../db/db-schema.js';

// Utility functions for working with lotto data

export const validateNumbers = (numbers: number[], min: number = 1, max: number = 90): boolean => {
  if (!Array.isArray(numbers) || numbers.length !== 5) return false;

  return numbers.every(num =>
    typeof num === 'number' &&
    Number.isInteger(num) &&
    num >= min &&
    num <= max
  );
};

export const sortNumbers = (numbers: number[]): number[] => {
  return [...numbers].sort((a, b) => a - b);
};

export const formatDrawDate = (date: Date): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const parseDrawDate = (dateString: string): Date => {
  return new Date(dateString + 'T00:00:00.000Z');
};

export const getWeekdayInfo = (date: Date) => {
  const weekday = date.getDay();
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return {
    weekday,
    weekday_name: weekdayNames[weekday]
  };
};

// Type guards
export const isDrawFlat = (obj: any): obj is import('../db/db-schema.js').DrawFlat => {
  return obj &&
    typeof obj.event_number === 'number' &&
    typeof obj.date === 'string' &&
    typeof obj.N1 === 'number' &&
    typeof obj.N2 === 'number' &&
    typeof obj.N3 === 'number' &&
    typeof obj.N4 === 'number' &&
    typeof obj.N5 === 'number';
};

export const isCreateDrawRequest = (obj: any): obj is import('../db/db-schema.js').CreateDrawRequest => {
  return obj &&
    typeof obj.event_number === 'number' &&
    typeof obj.date === 'string' &&
    Array.isArray(obj.n_numbers) &&
    obj.n_numbers.length === 5 &&
    (!obj.m_numbers || (Array.isArray(obj.m_numbers) && obj.m_numbers.length === 5));
};
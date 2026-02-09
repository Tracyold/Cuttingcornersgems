"""
Cache Revalidation Utility
Provides post-mutation revalidation helpers for React contexts
No UI changes - just ensures fresh data after mutations
"""

export const createRevalidator = (fetchFunction) => {
  return async (...args) => {
    try {
      return await fetchFunction(...args);
    } catch (error) {
      console.error('Revalidation error:', error);
      throw error;
    }
  };
};

/**
 * Post-mutation revalidation wrapper
 * Usage: await withRevalidation(mutationFn, revalidateFn)
 */
export const withRevalidation = async (mutationFn, revalidateFn) => {
  const result = await mutationFn();
  if (revalidateFn) {
    await revalidateFn();
  }
  return result;
};

/**
 * Debounced revalidation (prevents multiple rapid refetches)
 */
const revalidationTimers = new Map();

export const debouncedRevalidation = (key, revalidateFn, delay = 100) => {
  if (revalidationTimers.has(key)) {
    clearTimeout(revalidationTimers.get(key));
  }
  
  const timer = setTimeout(async () => {
    await revalidateFn();
    revalidationTimers.delete(key);
  }, delay);
  
  revalidationTimers.set(key, timer);
};

/**
 * Admin mutation hooks with automatic revalidation
 */
export const useAdminMutation = (mutationFn, revalidationFns = []) => {
  return async (...args) => {
    const result = await mutationFn(...args);
    
    // Revalidate all dependent queries
    for (const revalidateFn of revalidationFns) {
      await revalidateFn();
    }
    
    return result;
  };
};

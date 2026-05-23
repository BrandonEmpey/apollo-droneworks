/**
 * Time-based color shift utility for Apollo DroneWorks
 * Adjusts color palette based on time of day for a more personalized experience
 */

/**
 * Determines the appropriate color mode based on current time
 * @returns {string} 'day-mode', 'night-mode', or 'transition-mode'
 */
export const getTimeBasedColorMode = (): string => {
  const now = new Date();
  const hours = now.getHours();
  
  // Early morning (5am-8am): transition mode
  if (hours >= 5 && hours < 8) {
    return 'transition-mode';
  }
  
  // Day mode (8am-6pm)
  if (hours >= 8 && hours < 18) {
    return 'day-mode';
  }
  
  // Evening transition (6pm-8pm)
  if (hours >= 18 && hours < 20) {
    return 'transition-mode';
  }
  
  // Night mode (8pm-5am)
  return 'night-mode';
};

/**
 * Applies the current time-based color mode to the document
 */
export const applyTimeBasedColorShift = (): void => {
  const mode = getTimeBasedColorMode();
  
  // Remove existing modes
  document.body.classList.remove('day-mode', 'night-mode', 'transition-mode');
  
  // Add current mode
  document.body.classList.add(mode);
  document.body.classList.add('daytime-color-shift');
};

/**
 * Initializes the color shift system
 * - Applies initial color mode
 * - Sets up an interval to check and update every 15 minutes
 */
export const initializeColorShift = (): void => {
  // Apply initial color shift
  applyTimeBasedColorShift();
  
  // Update color shift every 15 minutes
  setInterval(() => {
    applyTimeBasedColorShift();
  }, 15 * 60 * 1000);
};

/**
 * Gets appropriate color values based on an action's context
 * For use with dynamic UI elements that change color based on state
 * @param {string} context - The context of the action ('success', 'warning', 'error', etc)
 * @returns {object} Color values for the given context
 */
export const getContextSensitiveColors = (
  context: 'default' | 'success' | 'warning' | 'error' | 'info'
): { main: string, light: string, dark: string } => {
  switch(context) {
    case 'success':
      return {
        main: '#4CAF50',
        light: '#81C784',
        dark: '#388E3C'
      };
    case 'warning':
      return {
        main: '#FF9800',
        light: '#FFB74D',
        dark: '#F57C00'
      };
    case 'error':
      return {
        main: '#F44336',
        light: '#E57373',
        dark: '#D32F2F'
      };
    case 'info':
      return {
        main: '#2196F3',
        light: '#64B5F6',
        dark: '#1976D2'
      };
    default:
      // Gold for default
      return {
        main: '#B5893D',
        light: '#E2D68B',
        dark: '#8A6A2F'
      };
  }
};
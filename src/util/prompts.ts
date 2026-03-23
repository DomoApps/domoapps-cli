import enquirer from 'enquirer';
import {Login} from './login.js';

const {prompt, AutoComplete} = enquirer as any;

/**
 * Modern CLI prompts using Enquirer
 */

// Helper to ensure clean terminal state
const restoreTerminal = () => {
  // Reset formatting and clear any stale output
  process.stdout.write('\x1b[0m');
};

/**
 * Creates a real-time autocomplete prompt for instance selection using Enquirer.
 */
export const createInstanceAutocomplete = async (
  message: string = 'Select a Domo instance:',
  allowNew: boolean = true,
): Promise<string> => {
  const previousLogins = Login.getPreviousLogins();
  const currentLogin = Login.getCurrentLogin()?.instance;

  // Create the list of instances with current login at the top
  const instances = [
    ...(currentLogin ? [currentLogin] : []),
    ...previousLogins
      .map(login => login.instance)
      .filter(instance => instance !== currentLogin),
  ];

  if (allowNew) {
    instances.push('+ Add new instance');
  }

  // Use AutoComplete class directly for better control over rendering
  const autocomplete = new AutoComplete({
    name: 'instance',
    message,
    choices: instances,
    initial: 0,
    limit: 10, // Limit visible choices to prevent rendering issues
  });

  const result = await autocomplete.run();
  restoreTerminal();
  return result;
};

/**
 * Creates an autocomplete prompt for instance selection with validation for new instances.
 * Note: Validation is lenient - allows any input and validation happens in the calling command.
 */
export const createInstanceAutocompleteWithValidation = async (
  message: string = 'Select a Domo instance:',
  allowNew: boolean = true,
): Promise<string> => {
  const selectedInstance = await createInstanceAutocomplete(message, allowNew);

  if (selectedInstance === '+ Add new instance') {
    const result = await prompt({
      type: 'input',
      name: 'newInstance',
      message: 'Enter new Domo instance (e.g., company.domo.com):',
      // No validation here - let the calling command handle validation and confirmation
      // This allows users to enter any instance and then confirm if it's invalid
    });
    return (result as any).newInstance;
  }
  return selectedInstance;
};

/**
 * Creates a single-key confirm prompt (y/n without Enter) using Enquirer.
 */
export const createConfirm = async (
  message: string,
  defaultValue: boolean = true,
): Promise<boolean> => {
  const result = await prompt({
    type: 'confirm',
    name: 'confirm',
    message,
    initial: defaultValue,
  });

  return (result as any).confirm;
};

/**
 * Creates a select prompt (multiple choice) using Enquirer.
 */
export const createSelect = async (
  message: string,
  choices: string[],
  initial?: number,
): Promise<string> => {
  const result = await prompt({
    type: 'select',
    name: 'choice',
    message,
    choices,
    initial,
  });

  return (result as any).choice;
};

/**
 * Creates an input prompt using Enquirer.
 */
export const createInput = async (
  message: string,
  initial?: string,
  validate?: (value: string) => boolean | string | Promise<boolean | string>,
): Promise<string> => {
  const result = await prompt({
    type: 'input',
    name: 'input',
    message,
    initial,
    validate,
  });

  return (result as any).input;
};

/**
 * Template definitions for Domo Custom Apps
 */

export enum TemplateName {
  HELLO_WORLD = 'hello world',
  BASIC_CHART = 'basic chart',
  MAP_CHART = 'map chart',
  SUGARFORCE = 'sugarforce',
  MANIFEST_ONLY = 'manifest only',
}

export interface TemplateInfo {
  name: string;
  description: string;
  files: string[];
}

export const TEMPLATES: Record<TemplateName, TemplateInfo> = {
  [TemplateName.HELLO_WORLD]: {
    name: 'hello world',
    description: 'A simple greeting app with basic interactivity',
    files: [
      'manifest.json',
      'index.html',
      'app.css',
      'app.js',
      'thumbnail.png',
    ],
  },
  [TemplateName.BASIC_CHART]: {
    name: 'basic chart',
    description: 'Interactive bar chart visualization',
    files: [
      'manifest.json',
      'index.html',
      'app.css',
      'app.js',
      'thumbnail.png',
    ],
  },
  [TemplateName.MAP_CHART]: {
    name: 'map chart',
    description: 'Interactive world map visualization',
    files: [
      'manifest.json',
      'index.html',
      'app.css',
      'app.js',
      'thumbnail.png',
    ],
  },
  [TemplateName.SUGARFORCE]: {
    name: 'sugarforce',
    description: 'Complex CRM-style application with multiple views',
    files: [
      'manifest.json',
      'index.html',
      'styles/app.css',
      'js/app.js',
      'js/helpers.js',
      'js/home.js',
      'js/leads.js',
      'js/opportunities.js',
      'js/reports.js',
      'components/router.js',
      'components/autocomplete.js',
      'components/modal.js',
      'components/table.js',
      'components/floatingactionbutton.js',
      'views/home.html',
      'views/leads.html',
      'views/opportunities.html',
      'views/reports.html',
      'thumbnail.png',
    ],
  },
  [TemplateName.MANIFEST_ONLY]: {
    name: 'manifest only',
    description: 'Creates only a manifest.json file without any starter code',
    files: ['manifest.json'],
  },
};

// Helper functions
export const getTemplateInfo = (templateName: TemplateName): TemplateInfo => {
  return TEMPLATES[templateName];
};

export const getAllTemplateNames = (): TemplateName[] => {
  return Object.values(TemplateName);
};

export const getTemplateDescription = (templateName: TemplateName): string => {
  return TEMPLATES[templateName].description;
};

export const getTemplateFiles = (templateName: TemplateName): string[] => {
  return TEMPLATES[templateName].files;
};

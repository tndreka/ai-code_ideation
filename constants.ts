
import type { LanguageOption, AnalysisScopeOption, FrameworkOption } from '../types';

// SUPPORTED_LANGUAGES is used for the optional language override dropdown.
export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { value: 'auto', label: 'Auto-detect (Default)' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'rust', label: 'Rust' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'shell', label: 'Shell Script' },
  { value: 'markdown', label: 'Markdown'},
  { value: 'json', label: 'JSON'},
  { value: 'yaml', label: 'YAML'},
];

export const SUPPORTED_ANALYSIS_SCOPES: AnalysisScopeOption[] = [
  { value: 'general_ideation', label: 'General Ideation (Default)' },
  { value: 'performance', label: 'Performance Review' },
  { value: 'security', label: 'Security Audit' },
  { value: 'design_patterns', label: 'Design Pattern Analysis' },
  { value: 'feature_brainstorming', label: 'Feature Brainstorming' },
];

export const SUPPORTED_FRAMEWORKS: FrameworkOption[] = [
    { value: 'none', label: 'None / Other / Not Specified' },
    { value: 'react', label: 'React (JavaScript/TypeScript)' },
    { value: 'angular', label: 'Angular (TypeScript)' },
    { value: 'vue', label: 'Vue.js (JavaScript/TypeScript)' },
    { value: 'nextjs', label: 'Next.js (React)' },
    { value: 'nodejs_express', label: 'Node.js (Express)' },
    { value: 'nodejs_nestjs', label: 'Node.js (NestJS)' },
    { value: 'python_django', label: 'Python (Django)' },
    { value: 'python_flask', label: 'Python (Flask)' },
    { value: 'java_spring', label: 'Java (Spring Boot)' },
    { value: 'csharp_dotnet_core', label: 'C# (.NET Core/ASP.NET Core)' },
    { value: 'ruby_on_rails', label: 'Ruby (Ruby on Rails)' },
    { value: 'php_laravel', label: 'PHP (Laravel)' },
    { value: 'go_gin', label: 'Go (Gin)' },
    { value: 'swift_ios', label: 'Swift (iOS/macOS)' },
    { value: 'kotlin_android', label: 'Kotlin (Android)' },
    { value: 'svelte', label: 'Svelte' },
];

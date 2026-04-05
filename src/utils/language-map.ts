const LANGUAGE_MAP: Record<string, string> = {
  python: '.py',
  python3: '.py',
  c: '.c',
  cpp: '.cpp',
  java: '.java',
  csharp: '.cs',
  javascript: '.js',
  typescript: '.ts',
  php: '.php',
  swift: '.swift',
  kotlin: '.kt',
  dart: '.dart',
  golang: '.go',
  ruby: '.rb',
  scala: '.scala',
  rust: '.rs',
  racket: '.rkt',
  erlang: '.erl',
  elixir: '.ex',
  mysql: '.sql',
  mssql: '.sql',
  oraclesql: '.sql',
  bash: '.sh',
  r: '.r',
}

export function getFileExtension(lang: string): string {
  return LANGUAGE_MAP[lang.toLowerCase()] ?? `.${lang.toLowerCase()}`
}

export function getLanguageDisplayName(lang: string): string {
  const names: Record<string, string> = {
    python3: 'Python3',
    python: 'Python',
    cpp: 'C++',
    csharp: 'C#',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    golang: 'Go',
    ruby: 'Ruby',
    scala: 'Scala',
    kotlin: 'Kotlin',
    swift: 'Swift',
    rust: 'Rust',
    java: 'Java',
    c: 'C',
    dart: 'Dart',
    racket: 'Racket',
    erlang: 'Erlang',
    elixir: 'Elixir',
    mysql: 'MySQL',
    bash: 'Bash',
  }
  return names[lang.toLowerCase()] ?? lang
}

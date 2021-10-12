import { cosmiconfig } from 'cosmiconfig';
const resolveConfig = (configPath: string) => {
  try {
    return require.resolve(configPath);
  } catch {
    return configPath;
  }
};

export function loadConfig(configPath: string) {
  const explorer = cosmiconfig('lint-recently', {
    searchPlaces: ['.lintrecentlyrc.json', '.lintrecentlyrc.js', 'package.json'],
  });

  return configPath ? explorer.load(resolveConfig(configPath)) : explorer.search();
}

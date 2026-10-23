// ESLint : règles recommandées Vue + TypeScript. La mise en forme est confiée à Prettier.
import pluginVue from 'eslint-plugin-vue'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  { name: 'fichiers', files: ['**/*.{ts,mts,tsx,vue}'] },
  { name: 'ignorés', ignores: ['dist/**', 'node_modules/**', 'public/sw.js'] },
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    name: 'règles du projet',
    rules: {
      // Variables volontairement ignorées : préfixe _
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Composants d'une seule page (App, DpeDetail…) : noms en un mot acceptés
      'vue/multi-word-component-names': 'off',
    },
  },
  skipFormatting,
)

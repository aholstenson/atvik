import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import tsdoc from 'eslint-plugin-tsdoc';

export default tseslint.config(
	{
		ignores: [ 'dist', 'coverage', 'apidocs' ]
	},

	js.configs.recommended,
	tseslint.configs.recommended,

	{
		plugins: {
			tsdoc
		},

		rules: {
			// Listeners and event arguments are intentionally loose about their types.
			'@typescript-eslint/no-explicit-any': 'off',

			'@typescript-eslint/consistent-type-definitions': 'error',
			'@typescript-eslint/explicit-member-accessibility': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',

			'tsdoc/syntax': 'warn',

			'prefer-const': 'warn',
			'no-console': 'error',
			'no-var': 'error',
			'no-throw-literal': 'error',
			eqeqeq: 'error',
			quotes: [ 'error', 'single', { avoidEscape: true } ],
			semi: [ 'error', 'always' ],
			'no-shadow': 'error'
		}
	}
);

/**
 * Commitlint — enforces Conventional Commits on every commit.
 * Allowed types map to the changelog generator conventions:
 *   feat / fix / docs / style / refactor / perf / test / build / ci / chore / revert.
 */
export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'subject-case': [2, 'never', ['start-case', 'pascal-case', 'upper-case']],
        'header-max-length': [2, 'always', 100],
        'body-max-line-length': [1, 'always', 120],
    },
};

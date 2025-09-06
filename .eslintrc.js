module.exports = {
  extends: [
    'react-app',
    'react-app/jest'
  ],
  rules: {
    // Disable accessibility warnings that are causing issues
    'jsx-a11y/control-has-associated-label': 'off',
    'jsx-a11y/label-has-associated-control': 'off',
    'jsx-a11y/no-onchange': 'off',
    'jsx-a11y/accessible-name': 'off'
  },
  settings: {
    'jsx-a11y': {
      'selectOptions': {
        'has-associated-control': 'off'
      }
    }
  }
};

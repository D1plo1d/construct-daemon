module.exports = {
    "env": {
        "browser": false,
        "es6": true,
        "jest/globals": true
    },
    "plugins": [
      "babel",
      "jest",
    ],
    "extends": [
      "airbnb-base",
      "plugin:flowtype/recommended",
      "plugin:jest/recommended"
    ],
    "parser": "babel-eslint",
    "rules": {
      "semi": [2, "never"],
      "func-names": ["error", "never"]
    }
};

module.exports = {
  preset: "jest-expo",

  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  testMatch: [
    "**/tests/**/*.test.js",
    "**/tests/**/*.test.jsx",
    "**/tests/**/*.test.ts",
    "**/tests/**/*.test.tsx"
  ],

  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|expo|@expo|expo-router|expo-modules-core)/)"
  ]
};
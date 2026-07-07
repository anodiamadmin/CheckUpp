module.exports = {
  preset: "jest-expo",

  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  testMatch: [
    "**/Test_cases/**/*.test.js",
    "**/Test_cases/**/*.test.jsx",
    "**/Test_cases/**/*.test.ts",
    "**/Test_cases/**/*.test.tsx"
  ],

  transformIgnorePatterns: [
    "node_modules/(?!(react-native|@react-native|expo|@expo|expo-router|expo-modules-core)/)"
  ]
};
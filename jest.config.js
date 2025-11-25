/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
    preset: "ts-jest",
    projects: [
        {
            displayName: "unit",
            preset: "ts-jest",
            testEnvironment: "node",
            testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
            testPathIgnorePatterns: [".stryker-temp/"],
            setupFilesAfterEnv: ["<rootDir>/setup-jest.js"],
            coverageDirectory: "testing-reports/unit-and-integration/unit",
            transform: {
                "^.+.tsx?$": ["ts-jest", {}],
            },
        },
        {
            displayName: "integration",
            preset: "ts-jest",
            testEnvironment: "node",
            testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
            testPathIgnorePatterns: [".stryker-temp/"],
            setupFilesAfterEnv: ["<rootDir>/setup-jest.js"],
            coverageDirectory:
                "testing-reports/unit-and-integration/integration",
            transform: {
                "^.+.tsx?$": ["ts-jest", {}],
            },
        },
        {
            displayName: "system",
            preset: "ts-jest",
            testEnvironment: "node",
            testMatch: ["<rootDir>/tests/system/**/*.test.ts"],
            testPathIgnorePatterns: [".stryker-temp/"],
            setupFilesAfterEnv: ["<rootDir>/setup-jest.js"],
            transform: {
                "^.+.tsx?$": ["ts-jest", {}],
            },
        },
    ],
};

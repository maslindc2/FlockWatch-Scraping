/** @type {import('ts-jest').JestConfigWithTsJest} **/

// ts-jest needs to compile to CommonJS regardless of what tsconfig.json says,
// because Jest runs in Node and does not support ESM by default.
// "module": "nodenext" in tsconfig would break all imports, so we override it here.
const tsJestTransform = {
    "^.+\\.tsx?$": [
        "ts-jest",
        {
            tsconfig: {
                module: "commonjs",
                moduleResolution: "node",
            },
        },
    ],
};

module.exports = {
    preset: "ts-jest",

    // ---------------------------------------------------------------------------
    // Coverage - must live at the ROOT level, not inside individual projects.
    // Jest ignores coverageDirectory and related options when they are nested
    // inside a projects[] entry.
    // ---------------------------------------------------------------------------
    collectCoverage: false, // Keep false here - use --coverage flag or npm scripts to control this
    coverageDirectory: "coverage",
    coverageReporters: ["text", "lcov", "html"],

    // Instrument every source file under src/ so that files not yet imported
    // by any test still appear in the report (as 0% covered).
    collectCoverageFrom: [
        "src/**/*.ts",
        "!src/server.ts", // Entry point, not unit-testable
        "!src/**/*.interface.ts", // Interfaces are type-only, no runtime code
        "!src/utils/winston-logger.ts", // Logger config, no logic to test
    ],

    projects: [
        {
            displayName: "unit",
            preset: "ts-jest",
            testEnvironment: "node",
            testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
            testPathIgnorePatterns: [".stryker-temp/"],
            setupFilesAfterEnv: [
                "<rootDir>/setup-jest.js",
                "<rootDir>/jest.setup.ts",
            ],
            transform: tsJestTransform,
        },
        {
            displayName: "integration",
            preset: "ts-jest",
            testEnvironment: "node",
            testMatch: ["<rootDir>/tests/integration/**/*.test.ts"],
            testPathIgnorePatterns: [".stryker-temp/"],
            setupFilesAfterEnv: [
                "<rootDir>/setup-jest.js",
                "<rootDir>/jest.setup.ts",
            ],
            transform: tsJestTransform,
        },
        {
            displayName: "system",
            preset: "ts-jest",
            testEnvironment: "node",
            testMatch: ["<rootDir>/tests/system/**/*.test.ts"],
            testPathIgnorePatterns: [".stryker-temp/"],
            setupFilesAfterEnv: [
                "<rootDir>/setup-jest.js",
                "<rootDir>/jest.setup.ts",
            ],
            transform: tsJestTransform,
        },
    ],
};

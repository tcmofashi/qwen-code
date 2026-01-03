#!/usr/bin/env node
/**
 * @license
 * Copyright 2025 OneAgent Team
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * OneAgent Bridge for Qwen Code CLI
 *
 * This script provides a simplified entry point for the Qwen Code CLI,
 * designed to integrate with the OneAgent framework.
 *
 * Usage: node oneagent-bridge.js <prompt> [--model <model_name>] [--auth-type openai] [--openai-base-url <url>]
 *
 * The script outputs a special marker at the end:
 * __ONEAGENT_RESULT__:{"status":"success|failure","summary":"..."}
 */

import { v4 as uuidv4 } from 'uuid';
import { loadSettings, createMinimalSettings } from './config/settings.js';
import { loadCliConfig } from './config/config.js';
import { ExtensionEnablementManager } from './config/extensions/extensionEnablement.js';
import { ExtensionStorage } from './config/extension.js';
import { runNonInteractive } from './nonInteractiveCli.js';
import { ReportStatusTool, AuthType } from '@qwen-code/qwen-code-core';

async function main() {
    // Disable telemetry immediately to prevent RUM flush errors
    process.env['QWEN_DISABLE_TELEMETRY'] = 'true';
    process.env['QWEN_CODE_TELEMETRY_DISABLED'] = '1';

    const prompt = process.argv[2];
    if (!prompt) {
        console.error('Usage: node oneagent-bridge.js <prompt>');
        process.exit(1);
    }

    const settings = loadSettings(process.cwd());
    const extensionEnablementManager = new ExtensionEnablementManager(
        ExtensionStorage.getUserExtensionsDir(),
    );

    // Parse command line arguments
    const getArgValue = (argName: string): string | undefined => {
        const index = process.argv.indexOf(argName);
        return index !== -1 && process.argv[index + 1]
            ? process.argv[index + 1]
            : undefined;
    };

    // Get OpenAI configuration from command line args (priority) or environment variables
    const openaiApiKey = getArgValue('--openai-api-key') || process.env['OPENAI_API_KEY'];
    const openaiBaseUrl = getArgValue('--openai-base-url') || process.env['OPENAI_BASE_URL'];
    const modelName = getArgValue('--model');

    console.log(`[bridge] Config: model=${modelName}, base_url=${openaiBaseUrl?.substring(0, 30)}...`);

    const mockArgs = {
        query: undefined,
        model: modelName,
        sandbox: undefined,
        sandboxImage: undefined,
        debug: true,
        prompt,
        promptInteractive: undefined,
        allFiles: false,
        showMemoryUsage: false,
        yolo: true,
        approvalMode: 'yolo' as const,
        telemetry: false,
        checkpointing: false,
        telemetryTarget: undefined,
        telemetryOtlpEndpoint: undefined,
        telemetryOtlpProtocol: undefined,
        telemetryLogPrompts: false,
        telemetryOutfile: undefined,
        allowedMcpServerNames: undefined,
        allowedTools: undefined,
        experimentalAcp: false,
        experimentalSkills: false,
        extensions: undefined,
        listExtensions: false,
        openaiLogging: true, // Enable model input/output logging
        openaiApiKey,
        openaiBaseUrl,
        openaiLoggingDir: '/tmp/qwen-logs', // Log to /tmp for debugging
        proxy: undefined,
        includeDirectories: undefined,
        tavilyApiKey: undefined,
        googleApiKey: undefined,
        googleSearchEngineId: undefined,
        webSearchDefault: undefined,
        screenReader: undefined,
        vlmSwitchMode: undefined,
        useSmartEdit: undefined,
        inputFormat: undefined,
        outputFormat: 'stream-json' as const, // Use stream-json for real-time streaming output
        includePartialMessages: false,
        chatRecording: false,
        continue: false,
        authType: 'openai' as const, // Trigger OpenAI ContentGenerator
        resume: undefined,
        maxSessionTurns: undefined,
        coreTools: undefined,
        excludeTools: undefined,
        channel: undefined,
    };

    const config = await loadCliConfig(
        settings.merged, // settings
        [], // extensions (empty array)
        extensionEnablementManager, // manager
        mockArgs, // argv
        process.cwd(), // cwd
    );

    await config.initialize();

    // Refresh auth for OpenAI mode
    await config.refreshAuth(AuthType.USE_OPENAI, true);

    // Register the report_status tool for OneAgent integration
    config.getToolRegistry().registerTool(new ReportStatusTool());

    console.log(`[bridge] Starting native CLI loop...`);
    const promptId = uuidv4();

    try {
        process.env['QWEN_DISABLE_TELEMETRY'] = 'true';
        await runNonInteractive(config, createMinimalSettings(), prompt, promptId, {});
        console.log(
            `__ONEAGENT_RESULT__:{"status":"success","result":"Task completed successfully via native CLI."}`,
        );
        process.exit(0);
    } catch (e) {
        console.error('Bridge Error:', e);
        console.log(
            `__ONEAGENT_RESULT__:{"status":"failure","result":"Bridge Exception: ${String(e)}"}`,
        );
        process.exit(1);
    }
}

main();

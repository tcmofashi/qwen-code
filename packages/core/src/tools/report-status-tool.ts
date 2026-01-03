/**
 * @license
 * Copyright 2025 OneAgent Team
 * SPDX-License-Identifier: Apache-2.0
 */

import {
    BaseToolInvocation,
    BaseDeclarativeTool,
    Kind,
    type ToolResult,
    type ToolInvocation,
} from './tools.js';

// Valid status values (lowercase)
const VALID_STATUSES = ['success', 'failure', 'rejected', 'interrupted'] as const;
type StatusType = typeof VALID_STATUSES[number];

interface ReportStatusParams {
    status: string; // Accept any string, will be normalized
    result: string;
    reason?: string;
    mismatch_detail?: string;
}

interface NormalizedReportStatusParams {
    status: StatusType;
    result: string;
    reason?: string;
    mismatch_detail?: string;
}

export class ReportStatusToolInvocation extends BaseToolInvocation<
    NormalizedReportStatusParams,
    ToolResult
> {
    getDescription(): string {
        let desc = `Reporting status: ${this.params.status} - ${this.params.result}`;
        if (this.params.reason) desc += ` (Reason: ${this.params.reason})`;
        return desc;
    }

    async execute(_signal: AbortSignal): Promise<ToolResult> {
        const resultText = JSON.stringify(this.params);
        let display = `Status: ${this.params.status}\nResult: ${this.params.result}`;
        if (this.params.reason) display += `\nReason: ${this.params.reason}`;
        if (this.params.mismatch_detail) display += `\nMismatch Detail: ${this.params.mismatch_detail}`;

        return {
            llmContent: [{ text: resultText }],
            returnDisplay: display,
        };
    }
}

export class ReportStatusTool extends BaseDeclarativeTool<
    ReportStatusParams,
    ToolResult
> {
    static Name = 'report_status';

    constructor() {
        super(
            ReportStatusTool.Name,
            'Report Status',
            `Report your final task completion status. This tool is REQUIRED when finishing a task.

PARAMETERS:
- status (REQUIRED): One of: "success", "failure", "rejected", "interrupted" (case-insensitive)
  * "success" - Task completed successfully
  * "failure" - Task failed due to an error  
  * "rejected" - Task is outside your capabilities
  * "interrupted" - Need help from upstream agent (will pause execution and request upstream assistance)
- result (REQUIRED): The result of the execution (if SUCCESS) or error message (if FAILURE).
- reason (OPTIONAL): Detailed reason for FAILURE or REJECTED.
- mismatch_detail (OPTIONAL): If status is REJECTED, explain WHY this task is out of your scope.

EXAMPLE CALLS:
  report_status(status="success", result="Created file hello.txt with content 'Hello World'")
  report_status(status="failure", result="Could not write file: permission denied", reason="FileSystemError")
  report_status(status="rejected", result="Task requires network access", mismatch_detail="I do not have internet access capabilities")
  report_status(status="interrupted", result="Need upstream tool 'execute_http_request'", reason="Missing capability")`,
            Kind.Other,
            {
                properties: {
                    status: {
                        description:
                            'The completion status. One of: "success", "failure", "rejected", "interrupted" (case-insensitive)',
                        type: 'string',
                    },
                    result: {
                        description:
                            'REQUIRED. The result of the execution (if SUCCESS) or error message (if FAILURE).',
                        type: 'string',
                    },
                    reason: {
                        description:
                            'OPTIONAL. Detailed reason for FAILURE or REJECTED.',
                        type: 'string',
                    },
                    mismatch_detail: {
                        description:
                            'OPTIONAL. If status is REJECTED, explain WHY this task is out of your scope.',
                        type: 'string',
                    }
                },
                required: ['status', 'result'],
                type: 'object',
            },
        );
    }

    /**
     * Normalize status to lowercase and validate
     */
    protected override validateToolParamValues(params: ReportStatusParams): string | null {
        if (!params.status) {
            return 'status is required';
        }
        if (!params.result) {
            return 'result is required';
        }

        const normalizedStatus = params.status.toLowerCase();
        if (!VALID_STATUSES.includes(normalizedStatus as StatusType)) {
            return `Invalid status "${params.status}". Must be one of: ${VALID_STATUSES.join(', ')} (case-insensitive)`;
        }

        return null;
    }

    protected createInvocation(
        params: ReportStatusParams,
    ): ToolInvocation<NormalizedReportStatusParams, ToolResult> {
        // Normalize status to lowercase
        const normalizedParams: NormalizedReportStatusParams = {
            status: params.status.toLowerCase() as StatusType,
            result: params.result,
            reason: params.reason,
            mismatch_detail: params.mismatch_detail,
        };
        return new ReportStatusToolInvocation(normalizedParams);
    }
}

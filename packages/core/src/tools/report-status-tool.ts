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
const VALID_STATUSES = [
  'success',
  'failure',
  'rejected',
  'interrupted',
] as const;
type StatusType = (typeof VALID_STATUSES)[number];

interface ReportStatusParams {
  status: string; // Accept any string, will be normalized
  message: string;
}

interface NormalizedReportStatusParams {
  status: StatusType;
  message: string;
}

export class ReportStatusToolInvocation extends BaseToolInvocation<
  NormalizedReportStatusParams,
  ToolResult
> {
  getDescription(): string {
    return `Reporting status: ${this.params.status} - ${this.params.message}`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const resultText = JSON.stringify(this.params);
    const display = `Status: ${this.params.status}\nResult: ${this.params.message}`;

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
- message (REQUIRED): The detailed content of the report. This includes the task result, error details, refusal reasons, or request for help.

EXAMPLE CALLS:
  report_status(status="success", message="Created file hello.txt with content 'Hello World'")
  report_status(status="failure", message="Could not write file: permission denied (FileSystemError)")
  report_status(status="rejected", message="Task requires network access, but I do not have internet access capabilities")
  report_status(status="interrupted", message="Need upstream tool 'execute_http_request' (Missing capability)")`,
      Kind.Other,
      {
        properties: {
          status: {
            description:
              'The completion status. One of: "success", "failure", "rejected", "interrupted" (case-insensitive)',
            type: 'string',
          },
          message: {
            description:
              'REQUIRED. The detailed content of the report. This includes the task result, error details, refusal reasons, or request for help.',
            type: 'string',
          },
        },
        required: ['status', 'message'],
        type: 'object',
      },
    );
  }

  /**
   * Normalize status to lowercase and validate
   */
  protected override validateToolParamValues(
    params: ReportStatusParams,
  ): string | null {
    if (!params.status) {
      return 'status is required';
    }
    if (!params.message) {
      return 'message is required';
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
      message: params.message,
    };
    return new ReportStatusToolInvocation(normalizedParams);
  }
}

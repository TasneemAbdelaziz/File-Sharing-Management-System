# n8n Workflow Documentation

## File Upload to Download Plan Workflow

**Path:** `/n8n/workflows/file-upload-workflow.json`

### Flow
1. Webhook receives file upload request
2. Calls File Sharing service to upload file
3. Generates download plan using Download Orchestrator
4. Sends notification email to user

### Integrations
- File Sharing Service (port 3002)
- Download Orchestrator Service (port 3001)
- Email provider

### Trigger
HTTP POST to webhook endpoint with payload:
```json
{
  "filename": "document.pdf",
  "userId": "user-123",
  "size": 5242880,
  "notifyEmail": "user@example.com"
}
```

### Output
- File uploaded successfully
- Download plan generated
- Email notification sent

---

## Chunk Replication Monitoring Workflow

**Path:** `/n8n/workflows/replication-monitoring.json`

### Flow
1. Triggers every 5 minutes
2. Checks replication status
3. If failures detected, sends Slack alert
4. Logs monitoring result

### Integrations
- Download Orchestrator Service (port 3001)
- Slack webhook

### Metrics Monitored
- Failed chunk count
- Replication status
- Failure timestamps

### Alert Conditions
- Triggers when `failedChunks.length > 0`
- Sends Slack message with failure count

---

## Installation

1. Copy workflow JSON files to n8n workflows directory
2. Import workflows in n8n UI
3. Configure service URLs and credentials
4. Activate workflows

## Environment Variables

```
DOWNLOAD_ORCHESTRATOR_URL=http://download-orchestrator:3001
FILE_SHARING_URL=http://file-sharing:3002
SLACK_WEBHOOK_URL=your-slack-webhook
EMAIL_PROVIDER_API_KEY=your-api-key
```

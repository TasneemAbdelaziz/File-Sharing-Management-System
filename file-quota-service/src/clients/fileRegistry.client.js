// Placeholder mock for calling File Registry Service
// if we need to sync file state or re-calculate usage

class FileRegistryClient {
  static async getFilesForUser(userId) {
    console.log(`[Mock] Fetching files for user ${userId} from File Registry Service...`);
    // Example: GET http://file-registry-service:3000/files?user_id=${userId}
    return [
      { file_id: 'abc-123', size: 1024 },
      { file_id: 'xyz-987', size: 2048 }
    ];
  }
}

module.exports = FileRegistryClient;

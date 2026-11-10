// Throwaway script: token -> create -> publish -> read.
// Done when the exact property JSON format for the Article document type is known.
// Verify request formats in Swagger: {UMBRACO_URL}/umbraco/swagger

const { UMBRACO_URL, UMBRACO_CLIENT_ID, UMBRACO_CLIENT_SECRET } = process.env;
const API = `${UMBRACO_URL}/umbraco/management/api/v1`;

// TODO 1: POST /security/back-office/token (form-encoded, grant_type=client_credentials)
// TODO 2: POST /document (Article)
// TODO 3: PUT /document/{id}/publish
// TODO 4: GET /document/{id} and log the result

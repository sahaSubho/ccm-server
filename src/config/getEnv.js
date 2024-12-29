// Use this code snippet in your app.
// If you need more information about configurations or implementing the sample code, visit the AWS docs:
// https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/getting-started.html

const {
    SecretsManagerClient,
    GetSecretValueCommand,
  } =  require("@aws-sdk/client-secrets-manager");


  module.exports = (async function() {

    let prefix = "prod"
    if (process.env.ENV === 'preprod') {
        prefix = "preprod"
    }
    const secret_name = prefix+"/event";

    const client = new SecretsManagerClient({
    region: "ap-south-1",
    });

    let response;

    try {
    response = await client.send(
        new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
        })
    );
    } catch (error) {
    // For a list of exceptions thrown, see
    // https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
    throw error;
    }

    const secret = response.SecretString;


    // Create .env file in root directory
    require('fs').writeFileSync(`${__dirname}/../../.env`, secret);
   })();


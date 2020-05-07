require("dotenv").config();

const readEnvironmentVariable = (
  key: string,
  optional: boolean = false
): string => {
  if (!process.env[key]) {
    if (!optional) {
      throw new Error(`${key} environment variable is not set.`);
    }
    console.warn(
      `${key} environment variable is not set. Defaulting to an empty string.`
    );
    return "";
  }
  return process.env[key] as string;
};

const readEnvironmentVariables = (arr: Array<string>): Array<string> => {
  return arr.map(key => readEnvironmentVariable(key));
};

export let awsId: string,
  awsSmtpHost: string,
  awsSmtpPort: string,
  awsSmtpUser: string,
  awsSmtpPass: string,
  baseDomain: string,
  devSubdomain: string | undefined,
  email: string;

[
  awsId,
  awsSmtpHost,
  awsSmtpPort,
  awsSmtpUser,
  awsSmtpPass,
  baseDomain,
  email
] = readEnvironmentVariables([
  "AWS_ID",
  "AWS_SMTP_HOST",
  "AWS_SMTP_PORT",
  "AWS_SMTP_USER",
  "AWS_SMTP_PASS",
  "BASE_DOMAIN",
  "EMAIL"
]);

devSubdomain = readEnvironmentVariable("DEV_SUBDOMAIN", true);

export const generateOperationalDomain = (
  stage: string,
  devSubdomain: string,
  baseDomain: string
): string => {
  if (stage === "dev") {
    if (devSubdomain === "") {
      throw new Error(
        "DEV_SUBDOMAIN environment variable must be set when deploying to dev stage"
      );
    }
    return `${devSubdomain}.${baseDomain}`;
  }
  return baseDomain;
};

export const stage = process.env["STAGE"] || "dev";
export const operationalDomain = generateOperationalDomain(
  stage,
  devSubdomain,
  baseDomain
);

const exportData = {
  awsId,
  awsSmtpHost,
  awsSmtpPort,
  awsSmtpUser,
  awsSmtpPass,
  baseDomain,
  devSubdomain,
  email,
  operationalDomain,
  stage
};

export default exportData;

// Play nice with serverless.
module.exports.serverless = () => exportData;

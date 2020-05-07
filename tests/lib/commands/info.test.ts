import info from "../../../lib/commands/info";
import sendEmail from "../../../lib/sendEmail";
import { email, operationalDomain } from "../../../lib/env";
import { Commands } from "../../../lib/commandSet";
// @ts-ignore: We're using Jest's ES6 class mocks (https://jestjs.io/docs/en/es6-class-mocks)
import Alias, { now } from "../../../lib/models/Alias";
import generateTestEmail from "../../utils/generateTestEmail";

jest.mock("../../../lib/models/Alias");
jest.mock("../../../lib/sendEmail");
const _sendEmail = sendEmail as jest.Mock;

it("should send a response email with the usage stats of a valid alias", async () => {
  const testEmail = await generateTestEmail(
    {
      to: [{ email: "test@domain.com" }],
      subject: "validexistingalias"
    },
    "messageId"
  );

  await info(testEmail);

  expect(Alias.getAlias).toHaveBeenCalledTimes(1);

  expect(sendEmail).toHaveBeenCalledTimes(1);
  expect(_sendEmail.mock.calls[0][0].from).toStrictEqual({
    name: "Info",
    address: `${Commands.Info}@${operationalDomain}`
  });
  expect(_sendEmail.mock.calls[0][0].to).toStrictEqual(email);
  expect(_sendEmail.mock.calls[0][0].inReplyTo).toBe("messageId");
  expect(_sendEmail.mock.calls[0][0].references).toStrictEqual(["messageId"]);
  expect(_sendEmail.mock.calls[0][0].subject).toBe("validexistingalias");
  expect(_sendEmail.mock.calls[0][0].text).toContain(
    `Alias: validexistingalias@${operationalDomain}\nDescription: test description\nCreated: ${now}\nEmails received: 0\nEmails sent: 0\nEmail last received on: -\nEmail last sent on: -\n`
  );
});

it("should throw if no alias has been provided", async () => {
  const testEmail = await generateTestEmail({
    to: { email: "test@domain.com" }
  });

  const res = info(testEmail);

  await expect(res).rejects.toEqual(
    new Error("Alias value (email subject) is undefined")
  );
});

it("should indicate if an alias does not exist", async () => {
  jest.spyOn(Alias, "getAlias").mockImplementation(async () => {
    return undefined;
  });

  const testEmail = await generateTestEmail({
    to: { email: "test@domain.com" },
    subject: "validexistingalias"
  });

  await info(testEmail);

  expect(_sendEmail.mock.calls[0][0].subject).toBe(
    `Info: validexistingalias@${operationalDomain} does not exist`
  );
});

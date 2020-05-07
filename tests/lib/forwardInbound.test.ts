import { email as myEmail, operationalDomain } from "../../lib/env";
import forwardInbound, {
  generateFromHeader,
  representNameAndEmailAddress
} from "../../lib/forwardInbound";
// @ts-ignore: We're using Jest's ES6 class mocks (https://jestjs.io/docs/en/es6-class-mocks)
import { didReceiveEmailSpy } from "../../lib/models/Alias";
import { INVALID_ALIAS } from "../../lib/models/__mocks__/Alias";
import sendEmail from "../../lib/sendEmail";
import senderAddressEncodeDecode from "../../lib/senderAddressEncodeDecode";
import assertEquivalentAttachments from "../utils/assertEquivalentAttachments";
import generateTestEmail, { EMLFormatData } from "../utils/generateTestEmail";

jest.mock("../../lib/models/Alias");
jest.mock("../../lib/sendEmail");

const _sendEmail = sendEmail as jest.Mock<any, any>;

const testAlias = "testAlias";
const aliasEmail = `${testAlias}@${operationalDomain}`;

const testAttachment = {
  data: "attachment_data_as_string"
};

const testEmailData1: EMLFormatData = {
  from: {
    name: "Sender Name",
    email: "sender@domain.com"
  },
  to: aliasEmail,
  cc: [
    {
      name: "Person 2",
      email: "person2@domain.com"
    }
  ],
  subject: "Test subject",
  html: "Test body text"
};

const testEmailData2: EMLFormatData = {
  from: {
    name: "Sender Name",
    email: "sender@domain.com"
  },
  to: {
    name: "Recipient Name",
    email: "notme@domain.com"
  },
  cc: aliasEmail,
  subject: "Test subject",
  html: "Test body text"
};

const testEmailData3: EMLFormatData = {
  from: {
    name: "Sender Name",
    email: "sender@domain.com"
  },
  to: aliasEmail,
  subject: "Test subject with attachment",
  html: "Test body text",
  attachments: [testAttachment]
};

const testEmailData4: EMLFormatData = {
  from: {
    name: "Sender Name",
    email: "sender@domain.com"
  },
  to: aliasEmail,
  html: "Test body text"
};

it("should forward received email to personal email address", async () => {
  const testEmail1 = await generateTestEmail(testEmailData1);
  const testEmail2 = await generateTestEmail(testEmailData2);
  const testEmail3 = await generateTestEmail({
    from: testEmailData1.from,
    to: "notouremail@someotherdomain.com",
    cc: "notouremail2@someotherdomain.com",
    subject: testEmailData1.subject,
    text: testEmailData1.text
  });

  const expectedEnvelope = {
    from: aliasEmail,
    to: myEmail
  };

  await forwardInbound(testAlias, testEmail1);
  expect(sendEmail).toHaveBeenCalledTimes(1);
  expect(_sendEmail.mock.calls[0][0].envelope).toStrictEqual(expectedEnvelope);
  expect(_sendEmail.mock.calls[0][0].subject).toBe("Test subject");
  expect(didReceiveEmailSpy).toHaveBeenCalledTimes(1);

  await forwardInbound(testAlias, testEmail2);
  expect(sendEmail).toHaveBeenCalledTimes(2);
  expect(_sendEmail.mock.calls[1][0].envelope).toStrictEqual(expectedEnvelope);
  expect(didReceiveEmailSpy).toHaveBeenCalledTimes(2);

  await forwardInbound(testAlias, testEmail3);
  expect(sendEmail).toHaveBeenCalledTimes(3);
  expect(_sendEmail.mock.calls[2][0].envelope).toStrictEqual(expectedEnvelope);
  expect(didReceiveEmailSpy).toHaveBeenCalledTimes(3);
});

it(`should encode the original sender's email address in the "from" header of the forwarded email`, async () => {
  const testEmail = await generateTestEmail(testEmailData1);

  await forwardInbound(testAlias, testEmail);
  expect(_sendEmail.mock.calls[0][0].from.address).toBe(
    senderAddressEncodeDecode.encodeEmailAddress(testAlias, "sender@domain.com")
  );
});

it(`should prioritize the "reply-to" header over the "from" header in the original received email`, async () => {
  const testEmail = await generateTestEmail(testEmailData1);
  // Hackish way to insert "reply-to" header information
  testEmail.replyTo = {
    text: "",
    html: "",
    value: [
      {
        address: "someoneelse@domain.com",
        name: "Someone Else"
      }
    ]
  };
  const res = generateFromHeader(testAlias, testEmail);
  expect(res).toStrictEqual({
    name: "Someone Else [someoneelse@domain.com]",
    address: senderAddressEncodeDecode.encodeEmailAddress(
      testAlias,
      "someoneelse@domain.com"
    )
  });
});

it("should forward attachments to personal email address", async () => {
  const testEmail = await generateTestEmail(testEmailData3);

  await forwardInbound(testAlias, testEmail);
  expect(sendEmail).toHaveBeenCalledTimes(1);
  expect(_sendEmail.mock.calls[0][0].attachments.length).toBe(1);
  expect(
    assertEquivalentAttachments(
      testEmail.attachments![0],
      _sendEmail.mock.calls[0][0].attachments[0]
    )
  ).toBe(true);
});

it("should default to an empty string if there is no email subject", async () => {
  const testEmail = await generateTestEmail(testEmailData4);

  await forwardInbound(testAlias, testEmail);
  expect(_sendEmail.mock.calls[0][0].subject).toBe("");
});

it("should not throw if the alias does not exist", async () => {
  const testEmail = await generateTestEmail(testEmailData1);
  const res = forwardInbound(INVALID_ALIAS, testEmail);

  await expect(res).resolves.toBeUndefined();
});

it("should not bracket the email address if there is no name", () => {
  expect(representNameAndEmailAddress("", "user@domain.com")).toBe(
    "user@domain.com"
  );
});

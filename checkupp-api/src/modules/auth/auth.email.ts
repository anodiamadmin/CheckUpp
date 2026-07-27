import dns from "dns";
import net from "net";
import crypto from "crypto";
import tls from "tls";
import { env } from "../../config/env";

interface AuthEmailParams {
  to: string;
  name?: string | null;
  subject: string;
  title: string;
  intro: string;
  code?: string;
  actionUrl?: string;
  actionLabel?: string;
  outro: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const buildHtml = (params: AuthEmailParams) => {
  const name = params.name?.trim() || params.to.split("@")[0];
  const primary = "#00CED1";
  const secondary = "#FF9C01";
  const text = "#2C2C2C";
  const muted = "#6B7280";
  const bg = "#F9FAFB";

  return `<!doctype html>
<html>
  <body style="margin:0;background:${bg};font-family:Arial,Helvetica,sans-serif;color:${text};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${bg};padding:32px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#FFFFFF;border:1px solid #EFEFEF;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="height:6px;background:${primary};"></td>
            </tr>
            <tr>
              <td style="padding:28px 28px 8px;">
                <div style="font-size:14px;font-weight:700;letter-spacing:0;color:${secondary};">Checkupp</div>
                <h1 style="font-size:24px;line-height:32px;margin:18px 0 8px;color:${text};">${escapeHtml(params.title)}</h1>
                <p style="font-size:16px;line-height:24px;margin:0;color:${text};">Hi ${escapeHtml(name)},</p>
                <p style="font-size:16px;line-height:24px;margin:16px 0 0;color:${text};">${escapeHtml(params.intro)}</p>
              </td>
            </tr>
            ${
              params.code
                ? `<tr><td align="center" style="padding:18px 28px 6px;"><div style="display:inline-block;font-size:30px;letter-spacing:6px;font-weight:700;color:${text};background:#F5F5F5;border:1px solid #CDCDE0;border-radius:8px;padding:16px 22px;">${escapeHtml(params.code)}</div></td></tr>`
                : ""
            }
            ${
              params.actionUrl
                ? `<tr><td align="center" style="padding:18px 28px 6px;"><a href="${escapeHtml(params.actionUrl)}" style="display:inline-block;background:${primary};color:#0F0F0F;text-decoration:none;font-weight:700;border-radius:6px;padding:13px 20px;">${escapeHtml(params.actionLabel ?? "Open Checkupp")}</a></td></tr>`
                : ""
            }
            <tr>
              <td style="padding:16px 28px 28px;">
                <p style="font-size:14px;line-height:22px;margin:0;color:${muted};">${escapeHtml(params.outro)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

const encodeHeader = (value: string) => value.replace(/\r|\n/g, " ");

const redactCommand = (line: string) =>
  line.startsWith("AUTH ") ? "AUTH <redacted>" : line;

const resolveSmtpHost = (host: string) =>
  new Promise<{ address: string; family: number }>((resolve, reject) => {
    dns.lookup(
      host,
      {
        ...(env.smtpFamily === 0 ? {} : { family: env.smtpFamily }),
        all: false,
      },
      (error, address, family) => {
        if (error) {
          reject(error);
          return;
        }

        if (!address) {
          reject(new Error(`SMTP DNS lookup returned no address for ${host}`));
          return;
        }

        resolve({ address, family });
      },
    );
  });

const waitForSocketEvent = (
  socket: net.Socket | tls.TLSSocket,
  eventName: "connect" | "secureConnect",
  timeoutMs: number,
  label: string,
) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      socket.destroy();
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timer);
      socket.off(eventName, onReady);
      socket.off("error", onError);
    };

    const onReady = () => {
      cleanup();
      resolve();
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    socket.once(eventName, onReady);
    socket.once("error", onError);
  });

class SmtpConnection {
  private socket: net.Socket | tls.TLSSocket;
  private buffer = "";
  private readTimeoutMs: number;

  constructor(socket: net.Socket | tls.TLSSocket, readTimeoutMs: number) {
    this.socket = socket;
    this.readTimeoutMs = readTimeoutMs;
    this.socket.setEncoding("utf8");
  }

  private readResponse = (context: string) =>
    new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`SMTP timed out waiting for ${context} after ${this.readTimeoutMs}ms`));
      }, this.readTimeoutMs);

      const cleanup = () => {
        clearTimeout(timer);
        this.socket.off("data", onData);
        this.socket.off("error", onError);
      };

      const onData = (chunk: string) => {
        this.buffer += chunk;
        const lines = this.buffer.split(/\r?\n/).filter(Boolean);
        const last = lines[lines.length - 1];
        if (last && /^\d{3} /.test(last)) {
          cleanup();
          const response = this.buffer;
          this.buffer = "";
          resolve(response);
        }
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      this.socket.on("data", onData);
      this.socket.once("error", onError);
    });

  command = async (
    line: string,
    expected: number | number[],
    context = redactCommand(line),
  ) => {
    this.socket.write(`${line}\r\n`);
    const response = await this.readResponse(context);
    const code = Number(response.slice(0, 3));
    const expectedCodes = Array.isArray(expected) ? expected : [expected];
    if (!expectedCodes.includes(code)) {
      throw new Error(`SMTP command failed (${context}): ${response.trim()}`);
    }
    return response;
  };

  waitForGreeting = async () => {
    const response = await this.readResponse("SMTP greeting");
    if (!response.startsWith("220")) {
      throw new Error(`SMTP greeting failed: ${response.trim()}`);
    }
  };

  startTls = async (host: string) => {
    await this.command("STARTTLS", 220);
    const upgradedSocket = tls.connect({ socket: this.socket, servername: host });
    await waitForSocketEvent(
      upgradedSocket,
      "secureConnect",
      env.smtpConnectionTimeoutMs,
      `SMTP STARTTLS handshake to ${host}`,
    );
    this.socket = upgradedSocket;
    this.socket.setEncoding("utf8");
  };

  close = () => {
    this.socket.end();
    this.socket.destroy();
  };
}

const dotStuff = (value: string) => value.replace(/^\./gm, "..");

const sendResendEmail = async (params: AuthEmailParams, html: string) => {
  if (!env.resendApiKey) {
    throw new Error("Resend delivery requires RESEND_API_KEY.");
  }

  console.log(
    JSON.stringify({
      type: "resend_email_send_start",
      to: params.to,
      subject: params.subject,
    }),
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.resendTimeoutMs);

  try {
    const response = await fetch(env.resendApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [params.to],
        subject: params.subject,
        html,
        text: stripHtml(html),
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let responseBody: unknown = responseText;
    try {
      responseBody = responseText ? JSON.parse(responseText) : null;
    } catch {
      // Keep the raw body for diagnostics when Resend returns non-JSON text.
    }

    if (!response.ok) {
      throw new Error(
        `Resend email failed (${response.status}): ${JSON.stringify(responseBody).slice(0, 500)}`,
      );
    }

    const id =
      typeof responseBody === "object" &&
      responseBody !== null &&
      "id" in responseBody
        ? String(responseBody.id)
        : undefined;

    console.log(
      JSON.stringify({
        type: "resend_email_accepted",
        to: params.to,
        subject: params.subject,
        id,
      }),
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Resend email timed out after ${env.resendTimeoutMs}ms`, {
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
};

const sendSmtpEmail = async (params: AuthEmailParams, html: string) => {
  if (!env.smtpHost || !env.smtpUser || !env.smtpPass) {
    throw new Error("SMTP delivery requires SMTP_HOST, SMTP_USER, and SMTP_PASS.");
  }

  console.log(
    JSON.stringify({
      type: "smtp_email_send_start",
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      family: env.smtpFamily,
      to: params.to,
      subject: params.subject,
    }),
  );

  const resolvedHost = await resolveSmtpHost(env.smtpHost);
  console.log(
    JSON.stringify({
      type: "smtp_host_resolved",
      host: env.smtpHost,
      address: resolvedHost.address,
      family: resolvedHost.family,
    }),
  );

  const socket = env.smtpSecure
    ? tls.connect({
        host: resolvedHost.address,
        port: env.smtpPort,
        servername: env.smtpHost,
      })
    : net.connect({
        host: resolvedHost.address,
        port: env.smtpPort,
      });

  await waitForSocketEvent(
    socket,
    env.smtpSecure ? "secureConnect" : "connect",
    env.smtpConnectionTimeoutMs,
    `SMTP connection to ${env.smtpHost}:${env.smtpPort}`,
  );

  const smtp = new SmtpConnection(socket, env.smtpReadTimeoutMs);

  await smtp.waitForGreeting();
  await smtp.command(`EHLO ${env.smtpHost}`, 250);
  if (!env.smtpSecure) {
    await smtp.startTls(env.smtpHost);
    await smtp.command(`EHLO ${env.smtpHost}`, 250);
  }
  await smtp.command(`AUTH PLAIN ${Buffer.from(`\0${env.smtpUser}\0${env.smtpPass}`).toString("base64")}`, 235);

  const fromMatch = env.emailFrom.match(/<([^>]+)>/);
  const fromEmail = fromMatch?.[1] ?? env.emailFrom;
  await smtp.command(`MAIL FROM:<${fromEmail}>`, 250);
  await smtp.command(`RCPT TO:<${params.to}>`, [250, 251]);
  await smtp.command("DATA", 354);

  const text = stripHtml(html);
  const boundary = `checkupp-${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
  const message = [
    `From: ${encodeHeader(env.emailFrom)}`,
    `To: ${encodeHeader(params.to)}`,
    `Subject: ${encodeHeader(params.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${Date.now()}.${crypto.randomBytes(8).toString("hex")}@checkupp.local>`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "Content-Transfer-Encoding: 7bit",
    "",
    html,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  const acceptedResponse = await smtp.command(`${dotStuff(message)}\r\n.`, 250, "DATA body");
  console.log(
    JSON.stringify({
      type: "smtp_email_accepted",
      to: params.to,
      subject: params.subject,
      response: acceptedResponse.trim().split(/\r?\n/).at(-1),
    })
  );
  await smtp.command("QUIT", 221);
  smtp.close();
};

export const sendAuthEmail = async (params: AuthEmailParams) => {
  const html = buildHtml(params);

  if (env.emailDelivery === "log") {
    console.log(
      JSON.stringify(
        {
          type: "auth_email",
          to: params.to,
          subject: params.subject,
          code: params.code,
          actionUrl: params.actionUrl,
          text: stripHtml(html),
        },
        null,
        2
      )
    );
    return;
  }

  if (env.emailDelivery === "resend") {
    await sendResendEmail(params, html);
    return;
  }

  await sendSmtpEmail(params, html);
};
